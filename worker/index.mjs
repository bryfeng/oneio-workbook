import { DurableObject } from 'cloudflare:workers';
import { createRequestLab } from '../server/request-lab.mjs';
import { handleRequest } from './http.mjs';

export class FlowLabSession extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env);
    this.busy=false;
    ctx.blockConcurrencyWhile(async () => {
      this.contexts=await ctx.storage.get('contexts') || [];
      this.lastRequest=await ctx.storage.get('lastRequest');
    });
  }
  lab() {
    return createRequestLab({ environment:this.env.DYNAMIC_ENVIRONMENT_ID, token:this.env.DYNAMIC_API_TOKEN, initialContexts:this.contexts, persist:async contexts => {
      await this.ctx.storage.put('contexts',contexts);
      this.contexts=contexts;
    } });
  }
  async run(input) {
    if (this.busy) return { status:409,body:{error:'A request is still running in this session.'} };
    // A repeated request ID cannot repeat creation after a lost response or cold restart.
    if (typeof input.requestId!=='string' || !/^[a-f0-9-]{36}$/i.test(input.requestId)) return {status:400,body:{error:'A unique request ID is required.'}};
    if (input.requestId===this.lastRequest) return {status:409,body:{error:'This request was already received. It was not sent again.'}};
    this.busy=true;
    try {
      await this.ctx.storage.put('lastRequest',input.requestId);
      this.lastRequest=input.requestId;
      // Persist a cleanup alarm before any external request starts.
      await this.ctx.storage.setAlarm(Date.now()+5*60*1000);
      const body=await this.lab().execute(input);
      return {status:200,body};
    } catch(error) { return {status:400,body:{error:error.message}}; }
    finally { this.busy=false; }
  }
  async alarm() {
    if (this.busy) { await this.ctx.storage.setAlarm(Date.now()+60000); return; }
    this.busy=true;
    try {
      const lab=this.lab();
      for(const c of this.contexts) if(c.flowId && c.state!=='cancelled' && (!c.expiresAt || Date.parse(c.expiresAt)>Date.now())) await lab.execute({contextId:c.id,close:true});
      const pending=this.contexts.filter(c=>c.flowId && c.state!=='cancelled' && c.expiresAt && Date.parse(c.expiresAt)>Date.now());
      if(pending.length) await this.ctx.storage.setAlarm(Math.min(Date.now()+60000,...pending.map(c=>Date.parse(c.expiresAt)+1000)));
      else { await this.ctx.storage.deleteAll(); this.contexts=[]; this.lastRequest=undefined; }
    } finally { this.busy=false; }
  }
}
export default { fetch:handleRequest };

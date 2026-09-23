# ONE Gateway V3 workbook

[Open the Flow-first product story](https://bryfeng.github.io/oneio-workbook/flow.html)

The product path starts with a white-label Fireblocks Flow checkout inside ONE, using an eligible existing custody account or verified self-custody destination. Shared business wallets and broader Treasury Management Service capabilities follow as separate work.

- [Gateway V3 story](https://bryfeng.github.io/oneio-workbook/flow.html): V2 context, SPARK demo, default destination resolution, API handoff and later platform scope.
- [Collection product specification](https://bryfeng.github.io/oneio-workbook/flow-experience.html): user journey, API examples, states, evidence and acceptance criteria.
- [Current API inventory](https://bryfeng.github.io/oneio-workbook/): documented ONE operations, provider capabilities and proposed extensions.
- [Visual map](https://bryfeng.github.io/oneio-workbook/visuals.html) and [ONE service map](https://bryfeng.github.io/oneio-workbook/system.html): current references and Flow-first service path.
- [Later wallet and payout example](https://bryfeng.github.io/oneio-workbook/walkthrough.html): a separate follow-on scenario; it does not make business wallets a prerequisite for Flow.

The workbook distinguishes published provider methods, tested sandbox evidence, proposed ONE contracts and future platform opportunities. The current test confirmed that an address returned by ONE can be stored as Flow’s destination; payer approval, settlement and ONE credit remain untested. Flow requires Dynamic’s platform environment, while Dynamic embedded business wallets are optional for the first checkout. Auto-conversion remains on hold.

## Edit and build

Requires Node.js 22 or later, with no package dependencies. Edit canonical sources under src/ and run node build.mjs to create public and standalone pages under dist/. The flow-delivery, flow-api and flow-experience Markdown files define the product story, provider calls and collection contract.

GitHub Actions builds and deploys dist/ to the public Pages site after a push to main.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { pages } from '../workbook-shell.mjs';
const dist = new URL('../dist/', import.meta.url);
test('all seven pages and standalone copies expose the same seven routes and the correct active page', async () => {
  for (const [canonical, , alias] of pages) for (const file of new Set([canonical, alias])) {
    const html = await readFile(new URL(file, dist), 'utf8');
    const nav = html.match(/<nav class="workbook-nav"[^>]*>(.*?)<\/nav>/s)?.[1];
    assert.ok(nav, file); assert.equal((html.match(/class="workbook-header"/g) || []).length, 1);
    assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
    for (const [href, label, download] of pages) {
      const target = file !== canonical ? download : href;
      assert.ok(nav.includes(`href="${target}"`), `${file} is missing ${label}`);
      await access(new URL(target, dist));
      if (href === canonical) assert.ok(nav.includes(`href="${target}" aria-current="page"`));
    }
    assert.ok(!/<header class="masthead">/.test(html));
    assert.ok(html.includes('.workbook-header{position:sticky;top:0;'));
  }
});
test('Flow Lab build does not ship backend secrets or server source', async () => {
  const html = await readFile(new URL('flow-lab.html', dist), 'utf8');
  assert.match(html, /Request content/); assert.match(html, /Run quote sequence/);
  await assert.rejects(access(new URL('server.mjs', dist)));
});

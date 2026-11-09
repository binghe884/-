/* 交互自检：通过 CDP 打开页面并断言关键行为
   用法：node scripts/check.mjs（需 Edge 已在 9222 端口） */

import fs from 'node:fs';

const BASE = 'file:///D:/网页设计/index.html';

const target = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE });
await new Promise((r) => setTimeout(r, 900));

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text + ' ' + (res.exceptionDetails.exception?.description || ''));
  return res.result.value;
}

async function go(hash) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`);
  await new Promise((r) => setTimeout(r, 260));
}

let failures = 0;
function assert(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`}`);
}

await go('#/all');
assert('全部赛事 69 行', await evaluate("document.querySelectorAll('#list-results .row').length"), 69);
assert('计数文案', await evaluate("document.querySelector('#result-count').textContent"), '69 项 · 按截止时间排序');

await go('#/all?q=红点');
assert('搜索“红点”命中 3 条', await evaluate("document.querySelectorAll('#list-results .row').length"), 3);

await go('#/all?dir=交互数字');
assert('方向=交互数字 16 条', await evaluate("document.querySelectorAll('#list-results .row').length"), 16);

await go('#/all?fee=免费');
const freeCount = await evaluate("document.querySelectorAll('#list-results .row').length");
assert('费用=免费 有结果', freeCount > 0, true);

await go('#/c/ux-design-awards');
assert('详情标题', await evaluate("document.querySelector('.detail-head h1')?.textContent"), 'UX 设计奖（柏林）');
assert('详情官网链接', await evaluate("!!document.querySelector('.detail-head a[href*=\"ux-design-awards\"]')"), true);

await go('#/calendar');
assert('日历月份标题', await evaluate("document.querySelector('.cal-head h1')?.textContent"), '2026 年 11 月');

await go('#/saved');
assert('收藏空态', await evaluate("document.querySelector('#list-results .empty p')?.textContent"), '还没有收藏任何赛事。');

await go('#/all');
await evaluate("document.querySelector('.row .save').click()");
await new Promise((r) => setTimeout(r, 120));
assert('收藏后 localStorage', await evaluate("JSON.parse(localStorage.getItem('saidian:saved')||'[]').length"), 1);
assert('收藏计数显示', await evaluate("document.querySelector('#saved-count')?.textContent"), '1');

await go('#/saved');
assert('收藏页 1 条', await evaluate("document.querySelectorAll('#list-results .row').length"), 1);

await go('#/all');
await evaluate("var i=document.querySelector('#list-search'); i.focus(); i.value='红点'; i.dispatchEvent(new Event('input',{bubbles:true}))");
await new Promise((r) => setTimeout(r, 120));
assert('即时搜索 3 条', await evaluate("document.querySelectorAll('#list-results .row').length"), 3);
assert('搜索后保留焦点', await evaluate("document.activeElement?.id"), 'list-search');

await evaluate("localStorage.removeItem('saidian:saved')");

await go('#/');
await evaluate("var i=document.querySelector('#hero-search'); i.focus(); i.value='红点'; i.dispatchEvent(new Event('input',{bubbles:true}))");
await new Promise((r) => setTimeout(r, 220));
assert('首页搜索建议 3 条', await evaluate("document.querySelectorAll('#hero-results .sr-item').length"), 3);
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('.shots/hero-search.png', Buffer.from(shot.data, 'base64'));

await send('Target.closeTarget', { targetId: target.id }).catch(() => {});
ws.close();
console.log(failures ? `\n${failures} 项失败` : '\n全部通过');
process.exitCode = failures ? 1 : 0;

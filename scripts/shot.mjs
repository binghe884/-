/* 通过 CDP 精确设置视口并截图
   用法：node scripts/shot.mjs <url> <width> <height> <out.png> [full]
   需要先用 --remote-debugging-port=9222 启动 Edge。 */

import fs from 'node:fs';

const [, , url, widthArg, heightArg, out, full] = process.argv;
const width = Number(widthArg);
const height = Number(heightArg);

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
    if (msg.error) p.reject(new Error(msg.error.message));
    else p.resolve(msg.result);
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 700,
});
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 1400));

const metrics = await send('Page.getLayoutMetrics');
const pageHeight = full === '1' ? Math.ceil(metrics.cssContentSize.height) : height;
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: full === '1',
  clip: { x: 0, y: 0, width, height: pageHeight, scale: 1 },
});

fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
await send('Target.closeTarget', { targetId: target.id }).catch(() => {});
ws.close();
console.log(`${out} ${width}x${pageHeight}`);

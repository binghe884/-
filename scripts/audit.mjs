/* 数据体检：重复、缺来源、日期异常、地区/级别分布
   用法：node scripts/audit.mjs
   读取 data/competitions.js（先跑 build-data.mjs）。零依赖。 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'data', 'competitions.js'), 'utf8');
const data = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));

const problems = [];
const today = new Date().toISOString().slice(0, 10);

const byName = new Map();
for (const c of data) {
  const key = c.name.replace(/\s+/g, '').toLowerCase();
  if (byName.has(key)) problems.push(`重名：${c.name}（${byName.get(key)} / ${c.slug}）`);
  else byName.set(key, c.slug);
}

for (const c of data) {
  if (!c.site) problems.push(`缺官网：${c.slug}`);
  if (!c.source) problems.push(`缺来源：${c.slug}`);
  if (!c.evidence) problems.push(`缺依据：${c.slug}`);
  if (c.sourceVerified === false) problems.push(`来源未核实：${c.slug}`);
  if (c.deadline && c.deadline < today) console.log(`提示：已过截止，保留作往届参考：${c.slug} ${c.deadline}`);
  if (c.deadline && c.openDate && c.deadline < c.openDate) problems.push(`日期倒置：${c.slug}`);
}

const count = (fn) => {
  const m = new Map();
  for (const c of data) {
    const k = fn(c);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`总数 ${data.length}`);
console.log('地区：', count((c) => c.region).map(([k, v]) => `${k} ${v}`).join(' / '));
console.log('级别：', count((c) => c.level).map(([k, v]) => `${k} ${v}`).join(' / '));
console.log('有明确截止：', data.filter((c) => c.deadline).length);
console.log('待公布：', data.filter((c) => !c.deadline).length);
console.log('');

if (problems.length) {
  console.log(`发现 ${problems.length} 条待处理：`);
  for (const p of problems) console.log(' - ' + p);
  process.exitCode = 1;
} else {
  console.log('未发现重复、缺来源或日期倒置。');
}

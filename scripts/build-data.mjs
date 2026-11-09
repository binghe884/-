/* 把 data/research-*.json 合并为浏览器可直接加载的 data/competitions.js
   用法：node scripts/build-data.mjs
   零依赖。 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILES = fs
  .readdirSync(path.join(ROOT, 'data'))
  .filter((f) => /^research-.+\.json$/.test(f))
  .sort();
const OUT = path.join(ROOT, 'data', 'competitions.js');
const TODAY = new Date().toISOString().slice(0, 10);

const DIRS = ['视觉传达', '产品工业', '交互数字', '建筑空间', '服装时尚', '动画游戏', '插画出版', '服务社会'];

const clean = (v) => (typeof v === 'string' ? v.trim() : v);

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalize(raw) {
  const name = clean(raw.name) || clean(raw.nameEn);
  if (!name) return null;
  const slug = clean(raw.slug) || slugify(raw.nameEn || name);
  const directions = Array.isArray(raw.directions)
    ? raw.directions.map(clean).filter((d) => DIRS.includes(d))
    : [];
  return {
    slug,
    name,
    nameEn: clean(raw.nameEn) || '',
    aliases: Array.isArray(raw.aliases) ? raw.aliases.map(clean).filter(Boolean) : [],
    organizer: clean(raw.organizer) || '',
    region: clean(raw.region) === '中国' ? '中国' : '国际',
    country: clean(raw.country) || '',
    level: clean(raw.level) || '行业权威',
    directions,
    audience: Array.isArray(raw.audience) ? raw.audience.map(clean).filter(Boolean) : [],
    team: clean(raw.team) || '',
    fee: clean(raw.fee) || '',
    feeType: ['免费', '收费', '学生免费'].includes(raw.feeType) ? raw.feeType : '',
    openDate: /^\d{4}-\d{2}-\d{2}$/.test(raw.openDate || '') ? raw.openDate : null,
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline || '') ? raw.deadline : null,
    resultsDate: clean(raw.resultsDate) || '',
    expectedWindow: clean(raw.expectedWindow) || '',
    cycle: clean(raw.cycle) || '2027',
    awards: clean(raw.awards) || '',
    format: clean(raw.format) || '',
    requirements: clean(raw.requirements) || '',
    site: clean(raw.site) || '',
    source: clean(raw.source) || clean(raw.site) || '',
    sourceVerified: raw.sourceVerified !== false,
    evidence: clean(raw.evidence) || '',
    editorNote: clean(raw.editorNote) || '',
    verifiedAt: /^\d{4}-\d{2}-\d{2}$/.test(raw.verifiedAt || '') ? raw.verifiedAt : TODAY,
  };
}

const seen = new Map();
let loaded = 0;

for (const file of FILES) {
  const p = path.join(ROOT, 'data', file);
  if (!fs.existsSync(p)) {
    console.warn('skip missing', file);
    continue;
  }
  let rows;
  try {
    rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error('JSON parse failed:', file, err.message);
    process.exitCode = 1;
    continue;
  }
  if (!Array.isArray(rows)) {
    console.error('not an array:', file);
    continue;
  }
  for (const raw of rows) {
    const c = normalize(raw);
    if (!c) continue;
    loaded += 1;
    const key = c.slug;
    if (!seen.has(key)) {
      seen.set(key, c);
    } else {
      const prev = seen.get(key);
      for (const [k, v] of Object.entries(c)) {
        const empty = v === '' || v === null || (Array.isArray(v) && v.length === 0);
        if (!empty) prev[k] = v;
      }
    }
  }
}

const all = Array.from(seen.values()).sort((a, b) => {
  if (a.region !== b.region) return a.region === '中国' ? -1 : 1;
  return a.name.localeCompare(b.name, 'zh-Hans-CN');
});

const body =
  '/* 自动生成，请勿手改；源数据见 data/research-*.json，运行 node scripts/build-data.mjs 重新生成。 */\n' +
  'window.COMPETITIONS = ' +
  JSON.stringify(all, null, 2) +
  ';\n';

fs.writeFileSync(OUT, body, 'utf8');

const withDeadline = all.filter((c) => c.deadline).length;
console.log(`read ${loaded} rows -> ${all.length} unique competitions (${withDeadline} with deadline) -> data/competitions.js`);

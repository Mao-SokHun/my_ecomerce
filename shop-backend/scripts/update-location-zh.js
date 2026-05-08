const { PrismaClient } = require('@prisma/client');
const https = require('https');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'cambodia_location_zh_cache.json');

function loadCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {}
  return {};
}

function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf8');
  } catch {}
}

function gtxTranslate(sl, tl, text) {
  const t = String(text || '').trim();
  if (!t) return Promise.resolve('');
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(t)}`;
  return new Promise((resolve) => {
    https.get(url, { timeout: 20000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
            const out = parsed[0].map((p) => p[0]).join('').trim();
            resolve(out || t);
          } else {
            resolve(t);
          }
        } catch {
          resolve(t);
        }
      });
    }).on('error', () => resolve(t));
  });
}

function isChineseOnly(s) {
  return /[\u4e00-\u9fff]/.test(s || '') && !/[A-Za-z]/.test(s || '');
}

async function toZh(en, km, cache) {
  const key = JSON.stringify([String(en || '').trim(), String(km || '').trim()]);
  if (cache[key]) return cache[key];

  let zh = '';
  if (en) zh = await gtxTranslate('en', 'zh-CN', en);
  if (!isChineseOnly(zh) && km) zh = await gtxTranslate('km', 'zh-CN', km);
  if (!isChineseOnly(zh) && en) zh = await gtxTranslate('en', 'zh-CN', en);

  cache[key] = zh || String(en || km || '').trim();
  return cache[key];
}

async function processTable(name, table, idCol) {
  const cache = loadCache();
  const rows = await prisma.$queryRawUnsafe(`SELECT ${idCol} AS id, nameEn, nameKm, nameZh FROM ${table}`);
  console.log(`[${name}] rows=${rows.length}`);

  let updated = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const zh = await toZh(r.nameEn, r.nameKm, cache);
    if (zh && zh !== r.nameZh) {
      await prisma.$executeRawUnsafe(`UPDATE ${table} SET nameZh = ? WHERE ${idCol} = ?`, zh, r.id);
      updated += 1;
    }

    if ((i + 1) % 300 === 0) {
      saveCache(cache);
      console.log(`[${name}] ${i + 1}/${rows.length} updated=${updated}`);
    }

    await new Promise((r) => setTimeout(r, 15));
  }

  saveCache(cache);
  console.log(`[${name}] done updated=${updated}`);
}

(async () => {
  await processTable('districts', 'kh_districts', 'id');
  await processTable('communes', 'kh_communes', 'id');
  await processTable('villages', 'kh_villages', 'id');

  const stats = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*) FROM kh_districts WHERE nameZh IS NOT NULL AND nameZh <> '') AS districtZh,
      (SELECT COUNT(*) FROM kh_communes WHERE nameZh IS NOT NULL AND nameZh <> '') AS communeZh,
      (SELECT COUNT(*) FROM kh_villages WHERE nameZh IS NOT NULL AND nameZh <> '') AS villageZh
  `);
  console.log(stats);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const prisma = new PrismaClient();

function gtx(sl, tl, text) {
  const t = String(text || '').trim();
  if (!t) return Promise.resolve('');
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(t)}`;
  return new Promise((resolve) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const out = Array.isArray(parsed?.[0]) ? parsed[0].map((p) => p[0]).join('').trim() : t;
          resolve(out || t);
        } catch {
          resolve(t);
        }
      });
    }).on('error', () => resolve(t));
  });
}

async function fix(table) {
  const rows = await prisma.$queryRawUnsafe(`SELECT id,nameKm,nameZh FROM ${table} WHERE nameZh REGEXP '[A-Za-z]'`);
  for (const r of rows) {
    const zh = await gtx('km', 'zh-CN', r.nameKm || '');
    await prisma.$executeRawUnsafe(`UPDATE ${table} SET nameZh=? WHERE id=?`, zh, r.id);
  }
  return rows.length;
}

(async()=>{
  const c1 = await fix('kh_communes');
  const c2 = await fix('kh_villages');
  const left = await prisma.$queryRawUnsafe(`SELECT (SELECT COUNT(*) FROM kh_communes WHERE nameZh REGEXP '[A-Za-z]') AS communeLatin,(SELECT COUNT(*) FROM kh_villages WHERE nameZh REGEXP '[A-Za-z]') AS villageLatin`);
  console.log({fixedCommunes:c1,fixedVillages:c2,left});
  await prisma.$disconnect();
})().catch(async(e)=>{console.error(e); await prisma.$disconnect(); process.exit(1);});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const map = {
  'Banteay Meanchey': '班迭棉吉省',
  Battambang: '马德望省',
  'Kampong Cham': '磅湛省',
  'Kampong Chhnang': '磅清扬省',
  'Kampong Speu': '磅士卑省',
  'Kampong Thom': '磅同省',
  Kampot: '贡布省',
  Kandal: '干丹省',
  'Koh Kong': '戈公省',
  Kratie: '桔井省',
  'Mondul Kiri': '蒙多基里省',
  'Phnom Penh': '金边市',
  'Preah Vihear': '柏威夏省',
  'Prey Veng': '波罗勉省',
  Pursat: '菩萨省',
  'Ratanak Kiri': '拉达那基里省',
  Siemreap: '暹粒省',
  'Preah Sihanouk': '西哈努克省',
  'Stung Treng': '上丁省',
  'Svay Rieng': '柴桢省',
  Takeo: '茶胶省',
  'Oddar Meanchey': '奥多棉吉省',
  Kep: '白马省',
  Pailin: '拜林省',
  'Tboung Khmum': '特本克蒙省',
  'Central Ministry': '中央部委',
};

(async () => {
  for (const [nameEn, nameZh] of Object.entries(map)) {
    await prisma.$executeRawUnsafe('UPDATE kh_provinces SET nameZh = ? WHERE nameEn = ?', nameZh, nameEn);
  }
  const rows = await prisma.$queryRawUnsafe('SELECT nameEn, nameZh FROM kh_provinces ORDER BY nameEn ASC');
  console.log(rows);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

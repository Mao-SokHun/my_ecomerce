const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const latin = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*) FROM kh_districts WHERE "nameZh" ~ '[A-Za-z]') AS "districtLatin",
      (SELECT COUNT(*) FROM kh_communes WHERE "nameZh" ~ '[A-Za-z]') AS "communeLatin",
      (SELECT COUNT(*) FROM kh_villages WHERE "nameZh" ~ '[A-Za-z]') AS "villageLatin"
  `);
  console.log(latin);

  const districts = await prisma.$queryRawUnsafe(`SELECT "nameKm", "nameEn", "nameZh" FROM kh_districts ORDER BY RANDOM() LIMIT 5`);
  const communes = await prisma.$queryRawUnsafe(`SELECT "nameKm", "nameEn", "nameZh" FROM kh_communes ORDER BY RANDOM() LIMIT 5`);
  const villages = await prisma.$queryRawUnsafe(`SELECT "nameKm", "nameEn", "nameZh" FROM kh_villages ORDER BY RANDOM() LIMIT 5`);

  console.log('district samples:', districts);
  console.log('commune samples:', communes);
  console.log('village samples:', villages);

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

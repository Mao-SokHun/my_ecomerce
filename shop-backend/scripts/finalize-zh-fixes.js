const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async()=>{
  await prisma.$executeRawUnsafe("UPDATE kh_communes SET nameZh='昂普农托奇' WHERE nameEn='Angk Phnum Touch'");
  await prisma.$executeRawUnsafe("UPDATE kh_communes SET nameZh='特玛敦波' WHERE nameEn='Thma Doun Pov'");
  await prisma.$executeRawUnsafe("UPDATE kh_communes SET nameZh='干丹第二市场' WHERE nameEn='Phsar Kandal Ti Pir'");

  await prisma.$executeRawUnsafe("UPDATE kh_villages SET nameZh='特拉庞石北' WHERE nameEn='Trapeang Thma Cheung'");
  await prisma.$executeRawUnsafe("UPDATE kh_villages SET nameZh='吴哥杰伊上' WHERE nameEn='Angkor Chey Leu'");
  await prisma.$executeRawUnsafe("UPDATE kh_villages SET nameZh='吴哥杰伊下' WHERE nameEn='Angkor Chey Kraom'");
  await prisma.$executeRawUnsafe("UPDATE kh_villages SET nameZh='戴埃德高波斯2' WHERE nameEn='Dei Edth Kaoh Phos 2'");
  await prisma.$executeRawUnsafe("UPDATE kh_villages SET nameZh='戴埃德高波斯3' WHERE nameEn='Dei Edth Kaoh Phos 3'");

  const left = await prisma.$queryRawUnsafe("SELECT (SELECT COUNT(*) FROM kh_districts WHERE nameZh REGEXP '[A-Za-z]') AS districtLatin,(SELECT COUNT(*) FROM kh_communes WHERE nameZh REGEXP '[A-Za-z]') AS communeLatin,(SELECT COUNT(*) FROM kh_villages WHERE nameZh REGEXP '[A-Za-z]') AS villageLatin");
  console.log(left);
  await prisma.$disconnect();
})().catch(async(e)=>{console.error(e); await prisma.$disconnect(); process.exit(1);});

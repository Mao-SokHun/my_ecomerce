const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async()=>{
  const c = await prisma.$queryRawUnsafe(`SELECT nameKm,nameEn,nameZh FROM kh_communes WHERE nameZh REGEXP '[A-Za-z]'`);
  const v = await prisma.$queryRawUnsafe(`SELECT nameKm,nameEn,nameZh FROM kh_villages WHERE nameZh REGEXP '[A-Za-z]' LIMIT 20`);
  console.log('communes', c);
  console.log('villages', v);
  await prisma.$disconnect();
})().catch(async(e)=>{console.error(e); await prisma.$disconnect(); process.exit(1);});

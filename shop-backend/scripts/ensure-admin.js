const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin@123456', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@shop.com' },
    update: { password: hash, role: 'ADMIN' },
    create: {
      email: 'admin@shop.com',
      password: hash,
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
    },
    select: { id: true, email: true, name: true, role: true },
  });
  console.log('✅ Admin user ready on Supabase:', user);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

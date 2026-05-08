const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const MIN_PRODUCTS_PER_SUBCATEGORY = 6;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function randomPrice() {
  return Number((Math.random() * 180 + 20).toFixed(2));
}

async function createSampleProduct(category, index) {
  const now = Date.now();
  const baseSlug = `${slugify(category.slug || category.name)}-sample-${index + 1}-${now}`;
  const price = randomPrice();
  const comparePrice = Number((price * 1.2).toFixed(2));

  return prisma.product.create({
    data: {
      name: `${category.name} Product ${index + 1}`,
      slug: baseSlug,
      description: `Auto-generated sample product for ${category.name}.`,
      shortDesc: `Sample ${category.name} item`,
      price,
      comparePrice,
      stock: 120,
      categoryId: category.id,
      brand: 'SH-Shop',
      tags: ['sample', 'auto', category.slug || category.name.toLowerCase()],
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      isFeatured: false,
      isActive: true,
      rating: 4.2,
      reviewCount: 0,
      soldCount: 0,
    },
  });
}

async function main() {
  const subcategories = await prisma.category.findMany({
    where: {
      parentId: { not: null },
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  let totalAdded = 0;

  for (const category of subcategories) {
    const currentCount = await prisma.product.count({
      where: {
        categoryId: category.id,
        isActive: true,
      },
    });

    const missing = Math.max(0, MIN_PRODUCTS_PER_SUBCATEGORY - currentCount);

    if (missing === 0) {
      console.log(`OK  ${category.slug}: ${currentCount}`);
      continue;
    }

    for (let i = 0; i < missing; i += 1) {
      await createSampleProduct(category, currentCount + i);
      totalAdded += 1;
    }

    console.log(`ADD ${category.slug}: ${currentCount} -> ${currentCount + missing}`);
  }

  console.log(`Done. Added ${totalAdded} products.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

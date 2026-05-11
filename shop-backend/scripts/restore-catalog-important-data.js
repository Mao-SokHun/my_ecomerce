require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const backupPath = path.resolve(
  process.argv[2] || path.join(__dirname, '..', 'prisma', 'catalog-important-data-backup.sql')
);

const parseInsertRows = (sql, table) => {
  const regex = new RegExp(
    `INSERT INTO\\s+"${table}"\\s*\\(([^)]*)\\)\\s*\\nVALUES\\s*\\(([\\s\\S]*?)\\)\\s*\\nON CONFLICT`,
    'g'
  );
  const rows = [];
  let match = regex.exec(sql);

  while (match) {
    const columns = match[1].split(',').map((column) => column.replace(/"/g, '').trim());
    const valuesText = match[2];
    const values = [];
    let token = '';
    let inQuote = false;

    for (let i = 0; i < valuesText.length; i += 1) {
      const ch = valuesText[i];
      if (inQuote) {
        if (ch === "'" && valuesText[i + 1] === "'") {
          token += "'";
          i += 1;
        } else if (ch === "'") {
          inQuote = false;
        } else {
          token += ch;
        }
      } else if (ch === "'") {
        inQuote = true;
      } else if (ch === ',') {
        values.push(token.trim());
        token = '';
      } else {
        token += ch;
      }
    }
    values.push(token.trim());

    rows.push(Object.fromEntries(columns.map((column, index) => [column, parseSqlValue(values[index] || '')])));
    match = regex.exec(sql);
  }

  return rows;
};

const parseSqlValue = (value) => {
  const trimmed = value.trim();
  if (trimmed === 'NULL') return null;
  if (trimmed === 'TRUE') return true;
  if (trimmed === 'FALSE') return false;
  if (trimmed.endsWith('::jsonb')) {
    return JSON.parse(parseSqlValue(trimmed.slice(0, -7)));
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
};

const dateOrNull = (value) => (value ? new Date(value) : null);

const main = async () => {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  const sql = fs.readFileSync(backupPath, 'utf8');
  const categories = parseInsertRows(sql, 'categories');
  const products = parseInsertRows(sql, 'products');
  const variants = parseInsertRows(sql, 'product_variants');

  console.log(`Restoring catalog from ${backupPath}`);
  console.log(`Rows: categories=${categories.length}, products=${products.length}, product_variants=${variants.length}`);

  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        parentId: category.parentId,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        deletedAt: dateOrNull(category.deletedAt),
        deletedBy: category.deletedBy,
        createdAt: new Date(category.createdAt),
        updatedAt: new Date(category.updatedAt),
      },
      create: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        parentId: category.parentId,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        deletedAt: dateOrNull(category.deletedAt),
        deletedBy: category.deletedBy,
        createdAt: new Date(category.createdAt),
        updatedAt: new Date(category.updatedAt),
      },
    });
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDesc: product.shortDesc,
        price: product.price,
        comparePrice: product.comparePrice,
        costPrice: product.costPrice,
        sku: product.sku,
        barcode: product.barcode,
        stock: product.stock,
        lowStockAlert: product.lowStockAlert,
        weight: product.weight,
        dimensions: product.dimensions,
        images: product.images || [],
        thumbnail: product.thumbnail,
        categoryId: product.categoryId,
        brand: product.brand,
        tags: product.tags || [],
        isFeatured: product.isFeatured,
        isActive: product.isActive,
        metaTitle: product.metaTitle,
        metaDesc: product.metaDesc,
        rating: product.rating,
        reviewCount: product.reviewCount,
        soldCount: product.soldCount,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
        sellerId: product.sellerId,
      },
      create: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDesc: product.shortDesc,
        price: product.price,
        comparePrice: product.comparePrice,
        costPrice: product.costPrice,
        sku: product.sku,
        barcode: product.barcode,
        stock: product.stock,
        lowStockAlert: product.lowStockAlert,
        weight: product.weight,
        dimensions: product.dimensions,
        images: product.images || [],
        thumbnail: product.thumbnail,
        categoryId: product.categoryId,
        brand: product.brand,
        tags: product.tags || [],
        isFeatured: product.isFeatured,
        isActive: product.isActive,
        metaTitle: product.metaTitle,
        metaDesc: product.metaDesc,
        rating: product.rating,
        reviewCount: product.reviewCount,
        soldCount: product.soldCount,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
        sellerId: product.sellerId,
      },
    });
  }

  for (const variant of variants) {
    await prisma.productVariant.upsert({
      where: { id: variant.id },
      update: {
        productId: variant.productId,
        name: variant.name,
        value: variant.value,
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku,
        image: variant.image,
        createdAt: new Date(variant.createdAt),
        updatedAt: new Date(variant.updatedAt),
      },
      create: {
        id: variant.id,
        productId: variant.productId,
        name: variant.name,
        value: variant.value,
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku,
        image: variant.image,
        createdAt: new Date(variant.createdAt),
        updatedAt: new Date(variant.updatedAt),
      },
    });
  }

  const [categoryCount, productCount, variantCount] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
  ]);
  console.log(`Done. Current DB counts: categories=${categoryCount}, products=${productCount}, product_variants=${variantCount}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const outputPath = path.resolve(
  process.argv[2] || path.join(__dirname, '..', 'prisma', 'catalog-important-data-backup.sql')
);

const quoteIdentifier = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`;

const sqlDate = (value) => (value ? sqlString(new Date(value).toISOString()) : 'NULL');

const sqlJson = (value) => {
  const normalized = value === null || value === undefined ? null : value;
  return `${sqlString(JSON.stringify(normalized))}::jsonb`;
};

const sqlValue = (value, type = 'string') => {
  if (value === null || value === undefined) return 'NULL';
  if (type === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (type === 'number') return Number.isFinite(Number(value)) ? String(value) : 'NULL';
  if (type === 'date') return sqlDate(value);
  if (type === 'json') return sqlJson(value);
  return sqlString(value);
};

const insertStatements = (table, columns, rows, typeByColumn = {}) => {
  if (rows.length === 0) {
    return [`-- No ${table} rows found.`];
  }

  const quotedColumns = columns.map(quoteIdentifier).join(', ');
  const updateColumns = columns.filter((column) => column !== 'id');
  const updateClause = updateColumns
    .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`)
    .join(', ');

  return rows.map((row) => {
    const values = columns
      .map((column) => sqlValue(row[column], typeByColumn[column]))
      .join(', ');
    return [
      `INSERT INTO ${quoteIdentifier(table)} (${quotedColumns})`,
      `VALUES (${values})`,
      `ON CONFLICT (${quoteIdentifier('id')}) DO UPDATE SET ${updateClause};`,
    ].join('\n');
  });
};

const main = async () => {
  const [categories, products, variants] = await Promise.all([
    prisma.category.findMany(),
    prisma.product.findMany(),
    prisma.productVariant.findMany(),
  ]);

  categories.sort((a, b) => {
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  });
  products.sort((a, b) => a.categoryId.localeCompare(b.categoryId) || a.name.localeCompare(b.name));
  variants.sort((a, b) => a.productId.localeCompare(b.productId) || a.name.localeCompare(b.name));

  const categoryColumns = [
    'id',
    'name',
    'slug',
    'description',
    'image',
    'parentId',
    'isActive',
    'sortOrder',
    'deletedAt',
    'deletedBy',
    'createdAt',
    'updatedAt',
  ];

  const productColumns = [
    'id',
    'name',
    'slug',
    'description',
    'shortDesc',
    'price',
    'comparePrice',
    'costPrice',
    'sku',
    'barcode',
    'stock',
    'lowStockAlert',
    'weight',
    'dimensions',
    'images',
    'thumbnail',
    'categoryId',
    'brand',
    'tags',
    'isFeatured',
    'isActive',
    'metaTitle',
    'metaDesc',
    'rating',
    'reviewCount',
    'soldCount',
    'createdAt',
    'updatedAt',
    'sellerId',
  ];

  const variantColumns = ['id', 'productId', 'name', 'value', 'price', 'stock', 'sku', 'image', 'createdAt', 'updatedAt'];

  const categoryTypes = {
    isActive: 'boolean',
    sortOrder: 'number',
    deletedAt: 'date',
    createdAt: 'date',
    updatedAt: 'date',
  };

  const productTypes = {
    price: 'number',
    comparePrice: 'number',
    costPrice: 'number',
    stock: 'number',
    lowStockAlert: 'number',
    weight: 'number',
    images: 'json',
    tags: 'json',
    isFeatured: 'boolean',
    isActive: 'boolean',
    rating: 'number',
    reviewCount: 'number',
    soldCount: 'number',
    createdAt: 'date',
    updatedAt: 'date',
  };

  const variantTypes = {
    price: 'number',
    stock: 'number',
    createdAt: 'date',
    updatedAt: 'date',
  };

  const lines = [
    '-- ShopHub important catalog data backup',
    `-- Generated at: ${new Date().toISOString()}`,
    `-- Rows: categories=${categories.length}, products=${products.length}, product_variants=${variants.length}`,
    '--',
    '-- Restore note:',
    '--   Best use: run after Prisma migrations on a clean database.',
    '--   If restoring into an existing database, remove dependent cart/order/wishlist/review data first.',
    '--',
    'BEGIN;',
    '',
    ...insertStatements('categories', categoryColumns, categories, categoryTypes),
    '',
    ...insertStatements('products', productColumns, products, productTypes),
    '',
    ...insertStatements('product_variants', variantColumns, variants, variantTypes),
    '',
    'COMMIT;',
    '',
  ];

  fs.writeFileSync(outputPath, `${lines.join('\n')}`, 'utf8');
  console.log(`Created ${outputPath}`);
  console.log(`Exported categories=${categories.length}, products=${products.length}, product_variants=${variants.length}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

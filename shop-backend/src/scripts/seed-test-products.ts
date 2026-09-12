import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Categories ---');
  let category = await prisma.category.findFirst({
    where: { isActive: true },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Electronics & Gadgets',
        slug: 'electronics-gadgets',
        description: 'Electronic devices and accessories',
        isActive: true,
      },
    });
    console.log('Created category:', category.name);
  } else {
    console.log('Using category:', category.name, category.id);
  }

  const sampleProducts = [
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      slug: 'sony-wh-1000xm5-wireless-headphones-test',
      description: 'Industry leading noise canceling headphones with crystal clear audio quality.',
      shortDesc: 'Premium noise canceling wireless headphones',
      costPrice: 240.0, // តម្លៃនាំចូល
      price: 349.0, // តម្លៃលក់ចេញ
      comparePrice: 399.0,
      stock: 25, // ចំនួនស្តុកនាំចូល
      sku: 'SONY-XM5-BLK',
      brand: 'Sony',
      isFeatured: true,
      isActive: true,
      thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'],
      categoryId: category.id,
    },
    {
      name: 'Apple Watch Series 9 GPS 45mm',
      slug: 'apple-watch-series-9-gps-45mm-test',
      description: 'Smartwatch with advanced health and fitness tracking, Always-On Retina display.',
      shortDesc: 'Apple Watch Series 9 Midnight Aluminum',
      costPrice: 290.0, // តម្លៃនាំចូល
      price: 429.0, // តម្លៃលក់ចេញ
      comparePrice: 479.0,
      stock: 40, // ចំនួនស្តុកនាំចូល
      sku: 'AW-S9-45MM-MID',
      brand: 'Apple',
      isFeatured: true,
      isActive: true,
      thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'],
      categoryId: category.id,
    },
    {
      name: 'Logitech MX Master 3S Wireless Mouse',
      slug: 'logitech-mx-master-3s-wireless-mouse-test',
      description: 'Ergonomic performance mouse with quiet clicks and 8K DPI any-surface tracking.',
      shortDesc: 'Advanced Wireless Mouse Graphite',
      costPrice: 65.0, // តម្លៃនាំចូល
      price: 99.0, // តម្លៃលក់ចេញ
      comparePrice: 119.0,
      stock: 50, // ចំនួនស្តុកនាំចូល
      sku: 'LOGI-MX3S-GR',
      brand: 'Logitech',
      isFeatured: false,
      isActive: true,
      thumbnail: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80'],
      categoryId: category.id,
    }
  ];

  console.log('--- Upserting Test Products ---');
  for (const p of sampleProducts) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: p,
      });
      console.log(`Updated product: ${p.name}`);
    } else {
      await prisma.product.create({
        data: p,
      });
      console.log(`Created product: ${p.name}`);
    }
  }

  console.log('\n=== FINANCIAL ACCOUNTING CALCULATION SUMMARY ===');
  const allProducts = await prisma.product.findMany({ where: { isActive: true } });
  let totalInventoryCost = 0;
  let totalRetailValue = 0;
  let totalStockCount = 0;

  for (const prod of allProducts) {
    const stock = prod.stock || 0;
    const cost = prod.costPrice || 0;
    const sell = prod.price || 0;
    const unitProfit = sell - cost;
    const margin = sell > 0 ? Math.round((unitProfit / sell) * 100) : 0;
    const totalCostForProd = stock * cost;
    const totalSalesForProd = stock * sell;
    const totalProfitForProd = stock * unitProfit;

    totalStockCount += stock;
    totalInventoryCost += totalCostForProd;
    totalRetailValue += totalSalesForProd;

    console.log(`\n📦 Product: ${prod.name}`);
    console.log(`   - ចំនួនស្តុក (Stock): ${stock} គ្រឿង`);
    console.log(`   - តម្លៃដើមនាំចូល (Cost Price): $${cost.toFixed(2)}`);
    console.log(`   - តម្លៃលក់ចេញ (Selling Price): $${sell.toFixed(2)}`);
    console.log(`   - ចំណេញក្នុង ១ គ្រឿង (Profit / Unit): +$${unitProfit.toFixed(2)} (Margin: ${margin}%)`);
    console.log(`   - ដើមទុនសរុបផលិតផលនេះ (Inventory Cost): $${totalCostForProd.toFixed(2)}`);
    console.log(`   - ចំណូលសរុបប៉ាន់ស្មាន (Retail Valuation): $${totalSalesForProd.toFixed(2)}`);
    console.log(`   - ប្រាក់ចំណេញប៉ាន់ស្មានសរុប (Est. Gross Profit): +$${totalProfitForProd.toFixed(2)}`);
  }

  const totalEstProfit = totalRetailValue - totalInventoryCost;
  console.log('\n=============================================');
  console.log(`📊 TOTAL CATALOG STOCK: ${totalStockCount} គ្រឿង`);
  console.log(`💵 TOTAL INVENTORY COST (ដើមទុនក្នុងស្តុកសរុប): $${totalInventoryCost.toFixed(2)}`);
  console.log(`📈 ESTIMATED RETAIL VALUE (ចំណូលលក់ប៉ាន់ស្មាន): $${totalRetailValue.toFixed(2)}`);
  console.log(`💰 ESTIMATED GROSS PROFIT (ប្រាក់ចំណេញប៉ាន់ស្មានសរុប): +$${totalEstProfit.toFixed(2)}`);
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

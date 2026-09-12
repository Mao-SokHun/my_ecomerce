import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

// Product presets with complete information, cost prices and stock (with comparePrice = null / no active discount)
const PRODUCT_CATALOG_DATA = [
  {
    name: 'Apple MacBook Pro 16"',
    slug: 'apple-macbook-pro-16',
    description: 'The most powerful MacBook Pro ever is here. With the blazing-fast M3 Pro or M3 Max chip, stunning Liquid Retina XDR display, and all-day battery life.',
    shortDesc: 'M3 Pro chip, 18GB RAM, 512GB SSD',
    costPrice: 1950.0, // តម្លៃដើមនាំចូល
    price: 2499.99, // តម្លៃលក់ចេញ
    comparePrice: null, // មិនទាន់ដាក់ Discount
    stock: 25,
    sku: 'MBP-16-M3-PRO',
    barcode: '194253718291',
    brand: 'Apple',
    tags: ['laptop', 'apple', 'macbook', 'pro'],
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
    isFeatured: true,
  },
  {
    name: 'Sony WH-1000XM5 Headphones',
    slug: 'sony-wh-1000xm5',
    description: 'Industry-leading noise canceling headphones with exceptional sound quality. 30-hour battery life with quick charging.',
    shortDesc: 'Industry-leading noise cancellation',
    costPrice: 240.0,
    price: 349.99,
    comparePrice: null,
    stock: 60,
    sku: 'SONY-WH1000XM5-BLK',
    barcode: '027242923058',
    brand: 'Sony',
    tags: ['headphones', 'sony', 'wireless', 'noise-canceling'],
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    isFeatured: true,
  },
  {
    name: 'Samsung 4K OLED Smart TV 65"',
    slug: 'samsung-4k-oled-65',
    description: "Experience cinematic quality at home with Samsung's S95C OLED TV. With Real Depth Enhancer and Neural Quantum Processor 4K.",
    shortDesc: 'S95C OLED, 120Hz, HDR+',
    costPrice: 1250.0,
    price: 1799.99,
    comparePrice: null,
    stock: 15,
    sku: 'SAM-OLED-65-S95C',
    barcode: '887276743912',
    brand: 'Samsung',
    tags: ['tv', 'samsung', 'oled', '4k', 'smart-tv'],
    images: ['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400',
    isFeatured: true,
  },
  {
    name: "Men's Classic Oxford Shirt",
    slug: 'mens-classic-oxford-shirt',
    description: 'Timeless style meets modern comfort in our classic oxford shirt. Made from 100% premium Egyptian cotton.',
    shortDesc: '100% Egyptian Cotton, Slim Fit',
    costPrice: 48.0,
    price: 89.99,
    comparePrice: null,
    stock: 150,
    sku: 'CK-OXFORD-SHIRT-M',
    barcode: '719284102938',
    brand: 'Calvin Klein',
    tags: ['shirt', 'mens', 'oxford', 'formal'],
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800',
      'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400',
    isFeatured: false,
  },
  {
    name: "Women's Running Shoes",
    slug: 'womens-running-shoes',
    description: "Engineered for performance, designed for comfort. Nike's latest running technology in a lightweight package.",
    shortDesc: 'ReactX Foam, Breathable Mesh',
    costPrice: 82.0,
    price: 139.99,
    comparePrice: null,
    stock: 80,
    sku: 'NIKE-REACTX-RUN-W',
    barcode: '196154829103',
    brand: 'Nike',
    tags: ['shoes', 'running', 'women', 'nike'],
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    isFeatured: true,
  },
  {
    name: 'Ergonomic Office Chair',
    slug: 'ergonomic-office-chair',
    description: 'Designed for all-day comfort, this ergonomic chair features lumbar support, adjustable armrests, and breathable mesh back.',
    shortDesc: 'Lumbar Support, Adjustable Height',
    costPrice: 280.0,
    price: 449.99,
    comparePrice: null,
    stock: 30,
    sku: 'HM-ERGO-CHAIR-BLK',
    barcode: '629104829104',
    brand: 'Herman Miller',
    tags: ['chair', 'office', 'ergonomic', 'furniture'],
    images: ['https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400',
    isFeatured: false,
  },
  {
    name: 'iPhone 16 Pro Max',
    slug: 'iphone-16-pro-max',
    description: 'The ultimate iPhone. A18 Pro chip, 48MP camera system, titanium design, and the longest battery life ever in an iPhone.',
    shortDesc: 'A18 Pro, 48MP Camera, Titanium',
    costPrice: 960.0,
    price: 1199.99,
    comparePrice: null,
    stock: 45,
    sku: 'APPL-IPH16PM-256-NAT',
    barcode: '195949102934',
    brand: 'Apple',
    tags: ['iphone', 'apple', 'smartphone', 'pro'],
    images: ['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400',
    isFeatured: true,
  },
  {
    name: 'Vitamin C Face Serum',
    slug: 'vitamin-c-face-serum',
    description: 'Brighten and even skin tone with our potent 20% Vitamin C serum. Reduces dark spots and boosts collagen production.',
    shortDesc: '20% Vitamin C, Anti-aging Formula',
    costPrice: 22.0,
    price: 49.99,
    comparePrice: null,
    stock: 200,
    sku: 'ORD-VITC-SERUM-30ML',
    barcode: '769915190234',
    brand: 'The Ordinary',
    tags: ['skincare', 'vitamin-c', 'serum', 'anti-aging'],
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
    isFeatured: false,
  },
  {
    name: 'Galaxy S25 Ultra',
    slug: 'galaxy-s25-ultra',
    description: 'Flagship Android phone with AI camera and long battery life.',
    shortDesc: '256GB, 12GB RAM Titanium Gray',
    costPrice: 840.0,
    price: 1099.99,
    comparePrice: null,
    stock: 62,
    sku: 'SAM-S25U-256-GRY',
    barcode: '887276891023',
    brand: 'Samsung',
    tags: ['samsung', 'phone', 'android'],
    images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400',
    isFeatured: true,
  },
  {
    name: 'Dell XPS 15',
    slug: 'dell-xps-15',
    description: 'High performance laptop for creators and professionals with OLED display.',
    shortDesc: 'Intel i7, 32GB RAM, 1TB SSD',
    costPrice: 1450.0,
    price: 1899.99,
    comparePrice: null,
    stock: 34,
    sku: 'DELL-XPS15-9530',
    barcode: '884116492019',
    brand: 'Dell',
    tags: ['dell', 'laptop', 'xps'],
    images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400',
    isFeatured: false,
  },
  {
    name: 'Kitchen Nonstick Pan Set',
    slug: 'kitchen-nonstick-pan-set',
    description: '3-piece nonstick cookware set for daily cooking with thermo-spot indicator.',
    shortDesc: 'Durable titanium non-stick coating',
    costPrice: 42.0,
    price: 79.99,
    comparePrice: null,
    stock: 120,
    sku: 'TEFAL-PAN-SET-3P',
    barcode: '316843029104',
    brand: 'Tefal',
    tags: ['kitchen', 'cookware'],
    images: ['https://images.unsplash.com/photo-1584990347449-ae1d184e2e0d?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1584990347449-ae1d184e2e0d?w=400',
    isFeatured: false,
  },
  {
    name: 'Road Bike Helmet',
    slug: 'road-bike-helmet',
    description: 'Lightweight and safe cycling helmet with airflow channels and MIPS protection.',
    shortDesc: 'Ultra-light cycling helmet MIPS',
    costPrice: 32.0,
    price: 59.99,
    comparePrice: null,
    stock: 200,
    sku: 'GIRO-HELMET-MIPS-M',
    barcode: '768686192034',
    brand: 'Giro',
    tags: ['cycling', 'helmet'],
    images: ['https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400',
    isFeatured: false,
  },
  {
    name: 'Resistance Bands Set',
    slug: 'resistance-bands-set',
    description: '5-level resistance bands for home and gym training with carry bag.',
    shortDesc: 'Portable 5-piece fitness bands',
    costPrice: 11.0,
    price: 24.99,
    comparePrice: null,
    stock: 300,
    sku: 'FITPRO-BANDS-5LVL',
    barcode: '619284019283',
    brand: 'FitPro',
    tags: ['fitness', 'gym', 'bands'],
    images: ['https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
    isFeatured: false,
  },
  {
    name: 'Organic Jasmine Rice 5kg',
    slug: 'organic-jasmine-rice-5kg',
    description: 'Premium quality organic Cambodian jasmine rice (Phka Rumduol). Fragrant and soft.',
    shortDesc: '5kg premium fragrant bag',
    costPrice: 7.5,
    price: 12.5,
    comparePrice: null,
    stock: 500,
    sku: 'RICELAND-JAS-5KG',
    barcode: '884910293841',
    brand: 'RiceLand',
    tags: ['rice', 'grocery'],
    images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
    isFeatured: false,
  },
  {
    name: 'Car Phone Mount',
    slug: 'car-phone-mount',
    description: '360-degree adjustable dashboard and air vent phone holder with fast magnetic lock.',
    shortDesc: 'Universal magnetic car mount',
    costPrice: 6.5,
    price: 14.99,
    comparePrice: null,
    stock: 430,
    sku: 'AUTOGRIP-MOUNT-360',
    barcode: '692841029384',
    brand: 'AutoGrip',
    tags: ['car', 'accessory'],
    images: ['https://images.unsplash.com/photo-1541348263662-e068662d82af?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1541348263662-e068662d82af?w=400',
    isFeatured: false,
  },
  {
    name: 'Daily Habits Self Help Book',
    slug: 'daily-habits-self-help-book',
    description: 'Build better habits and improve productivity with proven behavioral psychology framework.',
    shortDesc: 'Self development international best seller',
    costPrice: 9.0,
    price: 18.99,
    comparePrice: null,
    stock: 190,
    sku: 'BOOK-HABITS-ENG-PB',
    barcode: '9780143126560',
    brand: 'MindGrowth',
    tags: ['book', 'self-help'],
    images: ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
    isFeatured: true,
  },
  {
    name: 'Mystery Novel Collection',
    slug: 'mystery-novel-collection',
    description: 'Top 3 modern mystery thrillers in one beautifully bound box set.',
    shortDesc: 'Paperback 3-book box set',
    costPrice: 15.0,
    price: 29.99,
    comparePrice: null,
    stock: 133,
    sku: 'BOOK-MYSTERY-BOX3',
    barcode: '9780143126577',
    brand: 'ReadMore',
    tags: ['book', 'fiction'],
    images: ['https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400',
    isFeatured: false,
  },
  {
    name: 'Women Premium Blazer',
    slug: 'women-premium-blazer',
    description: 'Elegant formal blazer for office and events with tailored fit and structured shoulders.',
    shortDesc: 'Slim fit premium stretch fabric',
    costPrice: 62.0,
    price: 119.99,
    comparePrice: null,
    stock: 85,
    sku: 'ZARA-BLAZER-BLK-M',
    barcode: '843284019283',
    brand: 'Zara',
    tags: ['women', 'fashion', 'blazer'],
    images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800'],
    thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    isFeatured: false,
  },
];

async function updateAllProducts() {
  console.log('🚀 Starting Full Product Catalog & Inventory Cost Update...');

  // 1. Update preset products by slug
  for (const p of PRODUCT_CATALOG_DATA) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          description: p.description,
          shortDesc: p.shortDesc,
          costPrice: p.costPrice,
          price: p.price,
          comparePrice: null, // Clear active discount
          stock: p.stock,
          sku: p.sku,
          barcode: p.barcode,
          brand: p.brand,
          tags: p.tags,
          images: p.images,
          thumbnail: p.thumbnail,
          isFeatured: p.isFeatured,
          isActive: true,
        },
      });
      console.log(`✅ Updated: ${p.name} -> Cost: $${p.costPrice}, Price: $${p.price}, ComparePrice: NULL`);
    }
  }

  // 2. Query ALL remaining products in database to ensure none have empty costPrice and remove comparePrice
  const allDbProducts = await prisma.product.findMany();
  console.log(`\n🔍 Found total ${allDbProducts.length} products in DB. Standardizing remaining products...`);

  let updatedCount = 0;
  for (const prod of allDbProducts) {
    const isCostMissing = prod.costPrice == null || prod.costPrice <= 0;
    const hasDiscount = prod.comparePrice != null;

    if (isCostMissing || hasDiscount || !prod.sku) {
      // Estimated cost price at 60% of retail price if not set
      const defaultCost = prod.costPrice && prod.costPrice > 0 ? prod.costPrice : Math.round(prod.price * 0.6 * 100) / 100;
      const skuVal = prod.sku || `PROD-${prod.slug.toUpperCase().slice(0, 10)}`;

      await prisma.product.update({
        where: { id: prod.id },
        data: {
          costPrice: defaultCost,
          comparePrice: null, // មិនទាន់ដាក់ Discount
          sku: skuVal,
          stock: prod.stock > 0 ? prod.stock : 50,
          isActive: true,
        },
      });
      updatedCount++;
    }
  }

  console.log(`✨ Successfully standardized and removed active discounts from ${updatedCount} products.`);

  // 3. Print complete accounting & profit summary table
  const refreshedProducts = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  let totalInventoryCost = 0;
  let totalRetailValue = 0;
  let totalStockCount = 0;

  console.log('\n========================================================================================================');
  console.log('📊 REAL-TIME INVENTORY FINANCIAL & PROFIT SUMMARY (តារាងគណនេយ្យដើមទុន និងប្រាក់ចំណេញ)');
  console.log('========================================================================================================');

  for (const p of refreshedProducts) {
    const stock = p.stock || 0;
    const cost = p.costPrice || 0;
    const price = p.price || 0;
    const unitProfit = price - cost;
    const margin = price > 0 ? Math.round((unitProfit / price) * 100) : 0;
    const itemInventoryCost = stock * cost;
    const itemRetailVal = stock * price;
    const itemGrossProfit = stock * unitProfit;

    totalStockCount += stock;
    totalInventoryCost += itemInventoryCost;
    totalRetailValue += itemRetailVal;

    console.log(`📦 ${p.name.padEnd(35)} | Stock: ${String(stock).padStart(4)} | Cost: $${cost.toFixed(2).padStart(7)} | Price: $${price.toFixed(2).padStart(7)} | Profit/Unit: +$${unitProfit.toFixed(2).padStart(6)} (${margin}%) | Total Est Profit: +$${itemGrossProfit.toFixed(2)}`);
  }

  const totalGrossProfit = totalRetailValue - totalInventoryCost;
  console.log('========================================================================================================');
  console.log(`📦 ចំនួនទំនិញសរុបក្នុងស្តុក (Total Catalog Units): ${totalStockCount} គ្រឿង`);
  console.log(`💵 ដើមទុនក្នុងស្តុកសរុប (Total Inventory Cost):   $${totalInventoryCost.toFixed(2)}`);
  console.log(`📈 ចំណូលលក់ប៉ាន់ស្មាន (Estimated Retail Value):    $${totalRetailValue.toFixed(2)}`);
  console.log(`💰 ប្រាក់ចំណេញប៉ាន់ស្មានសរុប (Est. Gross Profit): +$${totalGrossProfit.toFixed(2)}`);
  console.log('========================================================================================================\n');
}

updateAllProducts()
  .catch((e) => {
    console.error('Error updating products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const IMAGE_CONFIG_PATH = path.join(__dirname, 'product-image-links.json');

const dataBySubcategory = {
  smartphones: [
    ['Google Pixel 9', 'Google', 899.99, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900'],
    ['Xiaomi 14 Pro', 'Xiaomi', 799.99, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900'],
    ['OnePlus 12', 'OnePlus', 749.99, 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=900'],
    ['Nothing Phone (2)', 'Nothing', 599.99, 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=900'],
    ['Honor Magic6', 'Honor', 829.99, 'https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?w=900'],
    ['vivo X100', 'vivo', 699.99, 'https://images.unsplash.com/photo-1603921326210-6edd2d60ca68?w=900'],
  ],
  laptops: [
    ['Lenovo ThinkPad X1 Carbon', 'Lenovo', 1599.99, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900'],
    ['HP Spectre x360', 'HP', 1499.99, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900'],
    ['ASUS ROG Zephyrus G14', 'ASUS', 1799.99, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=900'],
    ['Acer Swift Go 14', 'Acer', 999.99, 'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=900'],
    ['MSI Prestige 14', 'MSI', 1299.99, 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=900'],
    ['Razer Blade 14', 'Razer', 2099.99, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=900'],
  ],
  audio: [
    ['JBL Charge 5 Speaker', 'JBL', 179.99, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=900'],
    ['Bose QuietComfort Ultra', 'Bose', 429.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900'],
    ['Anker Soundcore Liberty 4', 'Anker', 129.99, 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=900'],
    ['Marshall Major IV', 'Marshall', 149.99, 'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=900'],
    ['Sennheiser HD 560S', 'Sennheiser', 199.99, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=900'],
    ['Edifier R1280DB', 'Edifier', 139.99, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900'],
  ],
  'mens-fashion': [
    ['Slim Fit Chino Pants', 'Uniqlo', 39.99, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=900'],
    ['Casual Denim Jacket', "Levi's", 89.99, 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=900'],
    ['Classic Polo Shirt', 'Lacoste', 59.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900'],
    ['Wool Blend Coat', 'Zara', 129.99, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=900'],
    ['Streetwear Hoodie', 'H&M', 49.99, 'https://images.unsplash.com/photo-1619603364904-c0498317e145?w=900'],
    ['Formal Black Trousers', 'Mango', 54.99, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=900'],
  ],
  'womens-fashion': [
    ['Floral Summer Dress', 'Forever 21', 45.99, 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900'],
    ['High Waist Jeans', 'Lee', 69.99, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900'],
    ['Knitted Cardigan', 'Uniqlo', 35.99, 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900'],
    ['Silk Blouse', 'Massimo Dutti', 79.99, 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=900'],
    ['Pleated Midi Skirt', 'Zara', 62.99, 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=900'],
    ['Office Pencil Dress', 'Mango', 88.99, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900'],
  ],
  shoes: [
    ['Adidas Ultraboost 5', 'Adidas', 169.99, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900'],
    ['Puma RS-X', 'Puma', 119.99, 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=900'],
    ['New Balance 990v6', 'New Balance', 199.99, 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=900'],
    ['Converse Chuck 70', 'Converse', 89.99, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=900'],
    ['Vans Old Skool', 'Vans', 75.99, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=900'],
    ['Skechers Go Walk', 'Skechers', 69.99, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900'],
  ],
  kitchen: [
    ['Air Fryer 5L', 'Philips', 129.99, 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=900'],
    ['Electric Kettle 1.7L', 'Tefal', 39.99, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=900'],
    ['Knife Set 8pcs', 'Zwilling', 99.99, 'https://images.unsplash.com/photo-1590794056470-1f45d7f7f7c5?w=900'],
    ['Rice Cooker 1.8L', 'Panasonic', 79.99, 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900'],
    ['Blender 1200W', 'Ninja', 109.99, 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=900'],
    ['Stainless Pot Set', 'Meyer', 149.99, 'https://images.unsplash.com/photo-1584990347449-ae1d184e2e0d?w=900'],
  ],
  furniture: [
    ['Modern TV Stand', 'IKEA', 159.99, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900'],
    ['Wooden Coffee Table', 'Ashley', 189.99, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900'],
    ['Bookshelf 5 Tier', 'IKEA', 129.99, 'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=900'],
    ['Recliner Sofa Chair', 'La-Z-Boy', 499.99, 'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=900'],
    ['Dining Table 4 Seats', 'HomePro', 329.99, 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=900'],
    ['Bedside Table Set', 'Index Living', 119.99, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=900'],
  ],
  fitness: [
    ['Adjustable Dumbbell 24kg', 'Bowflex', 299.99, 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900'],
    ['Yoga Mat Pro', 'Liforme', 79.99, 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=900'],
    ['Foam Roller', 'TriggerPoint', 34.99, 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=900'],
    ['Kettlebell 16kg', 'Reebok', 59.99, 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=900'],
    ['Pull Up Bar', 'Decathlon', 49.99, 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=900'],
    ['Smart Jump Rope', 'Xiaomi', 29.99, 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=900'],
  ],
  cycling: [
    ['Mountain Bike 29er', 'Trek', 899.99, 'https://images.unsplash.com/photo-1511994298241-608e28f14fde?w=900'],
    ['Road Bike Tire Set', 'Continental', 89.99, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900'],
    ['Bike Light Combo', 'RockBros', 35.99, 'https://images.unsplash.com/photo-1517654443271-21e4f89f4628?w=900'],
    ['Cycling Gloves', 'Giro', 24.99, 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=900'],
    ['Portable Bike Pump', 'Topeak', 32.99, 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=900'],
    ['Bicycle Repair Kit', 'Park Tool', 44.99, 'https://images.unsplash.com/photo-1518562180175-34a163b1a9a6?w=900'],
  ],
  fiction: [
    ['The Midnight Library', 'Vintage', 17.99, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900'],
    ['Project Hail Mary', 'Ballantine', 19.99, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900'],
    ['Where the Crawdads Sing', 'Putnam', 16.99, 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=900'],
    ['The Silent Patient', 'Celadon', 15.99, 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=900'],
    ['The Seven Husbands of Evelyn Hugo', 'Atria', 14.99, 'https://images.unsplash.com/photo-1530538987395-032d1800fdd0?w=900'],
    ['Tomorrow, and Tomorrow, and Tomorrow', 'Knopf', 18.99, 'https://images.unsplash.com/photo-1513001900722-370f803f498d?w=900'],
  ],
  'self-help': [
    ['Atomic Habits', 'Avery', 21.99, 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=900'],
    ['Deep Work', 'Grand Central', 18.99, 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=900'],
    ['The Psychology of Money', 'Harriman', 17.99, 'https://images.unsplash.com/photo-1455885666463-9c0b7f2a51f9?w=900'],
    ['The 5 AM Club', 'Harper', 16.99, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900'],
    ['Think Again', 'Viking', 19.99, 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=900'],
    ['Essentialism', 'Crown', 15.99, 'https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=900'],
  ],
};

function loadCustomImageLinks() {
  if (!fs.existsSync(IMAGE_CONFIG_PATH)) return {};
  try {
    const raw = fs.readFileSync(IMAGE_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.warn('Cannot read product-image-links.json, fallback to script defaults.');
    return {};
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function main() {
  const customImageLinks = loadCustomImageLinks();
  const subcategories = await prisma.category.findMany({
    where: { parentId: { not: null }, isActive: true, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });

  for (const sub of subcategories) {
    const plan = dataBySubcategory[sub.slug];
    if (!plan) continue;

    await prisma.product.deleteMany({
      where: {
        categoryId: sub.id,
        description: { contains: 'Auto-generated sample product' },
      },
    });

    for (let i = 0; i < plan.length; i += 1) {
      const [name, brand, price, defaultImage] = plan[i];
      const customForSub = Array.isArray(customImageLinks[sub.slug]) ? customImageLinks[sub.slug] : [];
      const image = customForSub[i] || defaultImage;
      const slug = `${sub.slug}-${slugify(name)}`;
      const comparePrice = Number((price * 1.18).toFixed(2));

      await prisma.product.upsert({
        where: { slug },
        update: {
          description: `${name} in ${sub.name} category with reliable quality and practical daily use.`,
          shortDesc: `${brand} | ${sub.name}`,
          price,
          comparePrice,
          stock: 130 + i * 5,
          brand,
          tags: [sub.slug, brand.toLowerCase(), 'new'],
          images: [image],
          thumbnail: image.replace('w=900', 'w=400'),
          isFeatured: i < 2,
          isActive: true,
          rating: 4.3 + (i % 3) * 0.1,
          reviewCount: 10 + i * 3,
          soldCount: 20 + i * 4,
        },
        create: {
          name,
          slug,
          description: `${name} in ${sub.name} category with reliable quality and practical daily use.`,
          shortDesc: `${brand} | ${sub.name}`,
          price,
          comparePrice,
          stock: 130 + i * 5,
          categoryId: sub.id,
          brand,
          tags: [sub.slug, brand.toLowerCase(), 'new'],
          images: [image],
          thumbnail: image.replace('w=900', 'w=400'),
          isFeatured: i < 2,
          isActive: true,
          rating: 4.3 + (i % 3) * 0.1,
          reviewCount: 10 + i * 3,
          soldCount: 20 + i * 4,
        },
      });
    }

    const count = await prisma.product.count({ where: { categoryId: sub.id, isActive: true } });
    console.log(`${sub.slug}: ${count} products`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

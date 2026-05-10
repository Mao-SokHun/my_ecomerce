import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CAMBODIA_LOCATIONS } from '../src/data/cambodiaLocations';
import { PROVINCE_EN_TO_ZH } from '../src/data/cambodiaProvinceZh';
import { delayMs, enPlaceNameToZh, flushZhCache, isEnPlaceNameCached } from '../src/lib/translateEnToZh';
import fs from 'fs';
const { cambodia_gazetterr } = require('cambodia-gazetteer');

const prisma = new PrismaClient();

type SqlProvince = { code: string; nameEn: string; nameKh: string };
type SqlDistrict = { code: string; provinceCode: string; nameEn: string; nameKh: string };
type SqlCommune = { code: string; districtCode: string; nameEn: string; nameKh: string };
type SqlVillage = { code: string; communeCode: string; nameEn: string; nameKh: string };
type CambodiaSqlData = {
  provinces: SqlProvince[];
  districts: SqlDistrict[];
  communes: SqlCommune[];
  villages: SqlVillage[];
};

const DEFAULT_SQL_PATHS = [
  'D:\\Business Sytem Online Shopping\\cambodia_map.sql',
  'C:\\Users\\LyhourMao\\Downloads\\Telegram Desktop\\cambodia_map.sql',
];

const parseSqlRows = (sql: string, table: string): string[][] => {
  const regex = new RegExp(`INSERT INTO\\s+\`${table}\`\\s*\\([^)]*\\)\\s*VALUES\\s*([\\s\\S]*?);`, 'g');
  const rows: string[][] = [];
  let blockMatch: RegExpExecArray | null = regex.exec(sql);

  while (blockMatch) {
    const values = blockMatch[1];
    let i = 0;
    while (i < values.length) {
      while (i < values.length && values[i] !== '(') i += 1;
      if (i >= values.length) break;
      i += 1;

      const row: string[] = [];
      let token = '';
      let inQuote = false;
      let escaped = false;

      while (i < values.length) {
        const ch = values[i];
        if (inQuote) {
          if (escaped) {
            token += ch;
            escaped = false;
          } else if (ch === '\\') {
            escaped = true;
          } else if (ch === "'") {
            inQuote = false;
          } else {
            token += ch;
          }
        } else if (ch === "'") {
          inQuote = true;
        } else if (ch === ',') {
          row.push(token.trim() === 'NULL' ? '' : token.trim());
          token = '';
        } else if (ch === ')') {
          row.push(token.trim() === 'NULL' ? '' : token.trim());
          rows.push(row);
          break;
        } else {
          token += ch;
        }
        i += 1;
      }

      i += 1;
    }

    blockMatch = regex.exec(sql);
  }

  return rows;
};

const loadCambodiaSqlData = (): CambodiaSqlData | null => {
  const sqlPath =
    process.env.CAMBODIA_SQL_PATH ||
    DEFAULT_SQL_PATHS.find((candidate) => fs.existsSync(candidate)) ||
    '';
  if (!sqlPath || !fs.existsSync(sqlPath)) return null;

  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  const provinces: SqlProvince[] = parseSqlRows(rawSql, 'sys_provinces').map((cols) => ({
    code: cols[0] || '',
    nameEn: cols[1] || '',
    nameKh: cols[2] || '',
  }));
  const districts: SqlDistrict[] = parseSqlRows(rawSql, 'sys_districts').map((cols) => ({
    code: cols[1] || '',
    provinceCode: cols[2] || '',
    nameEn: cols[3] || '',
    nameKh: cols[4] || '',
  }));
  const communes: SqlCommune[] = parseSqlRows(rawSql, 'sys_communes').map((cols) => ({
    code: cols[1] || '',
    districtCode: cols[2] || '',
    nameEn: cols[3] || '',
    nameKh: cols[4] || '',
  }));
  const villages: SqlVillage[] = parseSqlRows(rawSql, 'sys_villages').map((cols) => ({
    code: cols[0] || '',
    communeCode: cols[1] || '',
    nameEn: cols[2] || '',
    nameKh: cols[3] || '',
  }));

  return { provinces, districts, communes, villages };
};

const toHierarchyFromSqlData = (sqlData: CambodiaSqlData): typeof CAMBODIA_LOCATIONS => {
  const { provinces, districts, communes, villages } = sqlData;
  const districtsByProvince = new Map<string, SqlDistrict[]>();
  for (const district of districts) {
    const key = district.provinceCode;
    const list = districtsByProvince.get(key) || [];
    list.push(district);
    districtsByProvince.set(key, list);
  }

  const communesByDistrict = new Map<string, SqlCommune[]>();
  for (const commune of communes) {
    const key = commune.districtCode;
    const list = communesByDistrict.get(key) || [];
    list.push(commune);
    communesByDistrict.set(key, list);
  }

  const villagesByCommune = new Map<string, SqlVillage[]>();
  for (const village of villages) {
    const key = village.communeCode;
    const list = villagesByCommune.get(key) || [];
    list.push(village);
    villagesByCommune.set(key, list);
  }

  return provinces
    .filter((province) => province.nameKh)
    .map((province) => ({
      province: province.nameKh.trim(),
      districts: (districtsByProvince.get(province.code) || [])
        .filter((district) => district.nameKh)
        .map((district) => ({
          district: district.nameKh.trim(),
          communes: (communesByDistrict.get(district.code) || [])
            .filter((commune) => commune.nameKh)
            .map((commune) => ({
              commune: commune.nameKh.trim(),
              villages: (villagesByCommune.get(commune.code) || [])
                .filter((village) => village.nameKh)
                .map((village) => village.nameKh.trim()),
            })),
        })),
    }));
};

const prefetchSqlLocationZh = async (data: CambodiaSqlData): Promise<void> => {
  if (process.env.CAMBODIA_SKIP_ZH_PREFETCH === '1' || process.env.CAMBODIA_SKIP_TRANSLATION === '1') return;

  const keys = new Set<string>();
  const addPair = (en: string, km: string) => keys.add(JSON.stringify([en, km]));

  for (const d of data.districts) {
    addPair(d.nameEn?.trim() || '', d.nameKh?.trim() || '');
  }
  for (const c of data.communes) {
    addPair(c.nameEn?.trim() || '', c.nameKh?.trim() || '');
  }
  for (const v of data.villages) {
    addPair(v.nameEn?.trim() || '', v.nameKh?.trim() || '');
  }

  console.log(`Prefetching Chinese (zh-CN) labels for ${keys.size} unique place-name pairs...`);
  let n = 0;
  let misses = 0;
  for (const k of keys) {
    const [en, km] = JSON.parse(k) as [string, string];
    const kmStr = km || '';
    const hadCache = isEnPlaceNameCached(en, kmStr);
    await enPlaceNameToZh(en, kmStr || null);
    if (!hadCache) misses += 1;
    n += 1;
    if (n % 500 === 0) console.log(`  ... ${n}/${keys.size}`);
    // Only throttle real network calls; warm cache (e.g. committed cambodia_location_zh_cache.json) stays fast.
    if (!hadCache) await delayMs(20);
  }
  console.log(`  Prefetch done (${misses} new translations, ${keys.size - misses} from cache).`);
  flushZhCache();
};

async function main() {
  console.log('🌱 Seeding database...');
  if (process.env.CAMBODIA_SKIP_TRANSLATION === '1') {
    console.log('  CAMBODIA_SKIP_TRANSLATION=1 — skipping remote Chinese labels (nameZh empty; seed is fast).');
  } else if (process.env.CAMBODIA_SKIP_ZH_PREFETCH === '1') {
    console.log('  CAMBODIA_SKIP_ZH_PREFETCH=1 — skipping Chinese prefetch pass (still translates per row from cache/API).');
  }

  // Source priority: user SQL dump -> npm gazetteer -> local fallback.
  const sqlData = loadCambodiaSqlData();
  const sqlLocations = sqlData ? toHierarchyFromSqlData(sqlData) : [];
  const gazetteerLocations: typeof CAMBODIA_LOCATIONS =
    Array.isArray(cambodia_gazetterr) && cambodia_gazetterr.length > 0
      ? cambodia_gazetterr.map((province: any) => ({
          province: String(province.khmer || '').trim(),
          districts: Array.isArray(province.districts)
            ? province.districts.map((district: any) => ({
                district: String(district.khmer || '').trim(),
                communes: Array.isArray(district.communes)
                  ? district.communes.map((commune: any) => ({
                      commune: String(commune.khmer || '').trim(),
                      villages: Array.isArray(commune.villages)
                        ? commune.villages.map((village: any) => String(village.khmer || '').trim())
                        : [],
                    }))
                  : [],
              }))
            : [],
        }))
      : [];
  const fullCambodiaLocations: typeof CAMBODIA_LOCATIONS =
    sqlLocations.length > 0 ? sqlLocations : gazetteerLocations.length > 0 ? gazetteerLocations : CAMBODIA_LOCATIONS;

  // Reset location hierarchy to avoid stale/duplicate names between seed versions.
  await prisma.cambodiaVillage.deleteMany({});
  await prisma.cambodiaCommune.deleteMany({});
  await prisma.cambodiaDistrict.deleteMany({});
  await prisma.cambodiaProvince.deleteMany({});

  if (sqlData && sqlData.provinces.length > 0) {
    await prefetchSqlLocationZh(sqlData);

    const provinceIdByCode = new Map<string, string>();
    for (const province of sqlData.provinces) {
      if (!province.nameKh) continue;
      const enP = province.nameEn?.trim() || '';
      const zhP = (enP && PROVINCE_EN_TO_ZH[enP]) || (await enPlaceNameToZh(enP, province.nameKh));
      const p = await prisma.cambodiaProvince.upsert({
        where: { nameKm: province.nameKh.trim() },
        update: {
          nameEn: enP || null,
          nameZh: zhP || null,
          code: province.code?.trim() || null,
        },
        create: {
          nameKm: province.nameKh.trim(),
          nameEn: enP || null,
          nameZh: zhP || null,
          code: province.code?.trim() || null,
        },
      });
      provinceIdByCode.set(province.code, p.id);
    }

    const districtIdByCode = new Map<string, string>();
    for (const district of sqlData.districts) {
      const provinceId = provinceIdByCode.get(district.provinceCode);
      if (!provinceId || !district.nameKh) continue;
      const enD = district.nameEn?.trim() || '';
      const zhD = await enPlaceNameToZh(enD, district.nameKh);
      const d = await prisma.cambodiaDistrict.upsert({
        where: { provinceId_nameKm: { provinceId, nameKm: district.nameKh.trim() } },
        update: {
          nameEn: enD || null,
          nameZh: zhD || null,
          code: district.code?.trim() || null,
        },
        create: {
          provinceId,
          nameKm: district.nameKh.trim(),
          nameEn: enD || null,
          nameZh: zhD || null,
          code: district.code?.trim() || null,
        },
      });
      districtIdByCode.set(district.code, d.id);
    }

    const communeIdByCode = new Map<string, string>();
    for (const commune of sqlData.communes) {
      const districtId = districtIdByCode.get(commune.districtCode);
      if (!districtId || !commune.nameKh) continue;
      const enC = commune.nameEn?.trim() || '';
      const zhC = await enPlaceNameToZh(enC, commune.nameKh);
      const c = await prisma.cambodiaCommune.upsert({
        where: { districtId_nameKm: { districtId, nameKm: commune.nameKh.trim() } },
        update: {
          nameEn: enC || null,
          nameZh: zhC || null,
          code: commune.code?.trim() || null,
        },
        create: {
          districtId,
          nameKm: commune.nameKh.trim(),
          nameEn: enC || null,
          nameZh: zhC || null,
          code: commune.code?.trim() || null,
        },
      });
      communeIdByCode.set(commune.code, c.id);
    }

    for (const village of sqlData.villages) {
      const communeId = communeIdByCode.get(village.communeCode);
      if (!communeId || !village.nameKh) continue;
      const enV = village.nameEn?.trim() || '';
      const zhV = await enPlaceNameToZh(enV, village.nameKh);
      await prisma.cambodiaVillage.upsert({
        where: { communeId_nameKm: { communeId, nameKm: village.nameKh.trim() } },
        update: {
          nameEn: enV || null,
          nameZh: zhV || null,
          code: village.code?.trim() || null,
        },
        create: {
          communeId,
          nameKm: village.nameKh.trim(),
          nameEn: enV || null,
          nameZh: zhV || null,
          code: village.code?.trim() || null,
        },
      });
    }
    flushZhCache();
  } else {
    // Fallback hierarchy seeding
    for (const provinceItem of fullCambodiaLocations) {
      const province = await prisma.cambodiaProvince.upsert({
        where: { nameKm: provinceItem.province },
        update: {},
        create: { nameKm: provinceItem.province },
      });

      for (const districtItem of provinceItem.districts) {
        const district = await prisma.cambodiaDistrict.upsert({
          where: { provinceId_nameKm: { provinceId: province.id, nameKm: districtItem.district } },
          update: {},
          create: {
            provinceId: province.id,
            nameKm: districtItem.district,
          },
        });

        for (const communeItem of districtItem.communes) {
          const commune = await prisma.cambodiaCommune.upsert({
            where: { districtId_nameKm: { districtId: district.id, nameKm: communeItem.commune } },
            update: {},
            create: {
              districtId: district.id,
              nameKm: communeItem.commune,
            },
          });

          for (const village of communeItem.villages) {
            await prisma.cambodiaVillage.upsert({
              where: { communeId_nameKm: { communeId: commune.id, nameKm: village } },
              update: {},
              create: {
                communeId: commune.id,
                nameKm: village,
              },
            });
          }
        }
      }
    }
  }

  console.log(`✅ Seeded ${fullCambodiaLocations.length} Cambodia provinces`);

  const upsertCategory = async (
    slug: string,
    name: string,
    description: string,
    image: string,
    sortOrder: number,
    parentId?: string
  ) =>
    prisma.category.upsert({
      where: { slug },
      update: { name, description, image, sortOrder, parentId: parentId || null, isActive: true },
      create: { slug, name, description, image, sortOrder, parentId },
    });

  // Top-level categories
  const electronics = await upsertCategory(
    'electronics',
    'Electronics',
    'Latest gadgets and technology',
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
    1
  );
  const fashion = await upsertCategory(
    'fashion',
    'Fashion',
    'Trendy fashion and accessories',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
    2
  );
  const homeLiving = await upsertCategory(
    'home-living',
    'Home & Living',
    'Furniture, decor and kitchen essentials',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
    3
  );
  const sports = await upsertCategory(
    'sports',
    'Sports & Outdoors',
    'Gear for active lifestyles',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400',
    4
  );
  const books = await upsertCategory(
    'books',
    'Books',
    'Knowledge and entertainment',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    5
  );
  const beauty = await upsertCategory(
    'beauty',
    'Beauty & Personal Care',
    'Look and feel your best',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
    6
  );
  const groceries = await upsertCategory(
    'groceries',
    'Groceries',
    'Daily essentials and pantry staples',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    7
  );
  const automotive = await upsertCategory(
    'automotive',
    'Automotive',
    'Car care and accessories',
    'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400',
    8
  );

  // Subcategories
  const subcategories = await Promise.all([
    upsertCategory('smartphones', 'Smartphones', 'iOS and Android phones', '', 101, electronics.id),
    upsertCategory('laptops', 'Laptops', 'Business and gaming laptops', '', 102, electronics.id),
    upsertCategory('audio', 'Audio', 'Headphones and speakers', '', 103, electronics.id),
    upsertCategory('mens-fashion', "Men's Fashion", 'Clothing for men', '', 201, fashion.id),
    upsertCategory('womens-fashion', "Women's Fashion", 'Clothing for women', '', 202, fashion.id),
    upsertCategory('shoes', 'Shoes', 'Daily and sports shoes', '', 203, fashion.id),
    upsertCategory('kitchen', 'Kitchen', 'Cookware and utensils', '', 301, homeLiving.id),
    upsertCategory('furniture', 'Furniture', 'Home and office furniture', '', 302, homeLiving.id),
    upsertCategory('fitness', 'Fitness', 'Workout and training gear', '', 401, sports.id),
    upsertCategory('cycling', 'Cycling', 'Bikes and accessories', '', 402, sports.id),
    upsertCategory('fiction', 'Fiction', 'Novels and stories', '', 501, books.id),
    upsertCategory('self-help', 'Self Help', 'Personal development books', '', 502, books.id),
  ]);

  const categoryMap = new Map<string, string>([
    ['electronics', electronics.id],
    ['fashion', fashion.id],
    ['home-living', homeLiving.id],
    ['sports', sports.id],
    ['books', books.id],
    ['beauty', beauty.id],
    ['groceries', groceries.id],
    ['automotive', automotive.id],
    ['smartphones', subcategories[0].id],
    ['laptops', subcategories[1].id],
    ['audio', subcategories[2].id],
    ['mens-fashion', subcategories[3].id],
    ['womens-fashion', subcategories[4].id],
    ['shoes', subcategories[5].id],
    ['kitchen', subcategories[6].id],
    ['furniture', subcategories[7].id],
    ['fitness', subcategories[8].id],
    ['cycling', subcategories[9].id],
    ['fiction', subcategories[10].id],
    ['self-help', subcategories[11].id],
  ]);

  console.log(`✅ Created ${8 + subcategories.length} categories/subcategories`);

  // Admin user
  const adminPassword = await bcrypt.hash('Admin@12345', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shop.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@shop.com',
      password: adminPassword,
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  // Demo user
  const userPassword = await bcrypt.hash('User@12345', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'user@shop.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'user@shop.com',
      password: userPassword,
      role: 'USER',
      phone: '+1 555-0100',
      emailVerified: true,
    },
  });

  // Create cart for demo user
  await prisma.cart.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: { userId: demoUser.id },
  });

  await prisma.cart.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  console.log('✅ Created admin and demo users');

  // Sample address
  await prisma.address.upsert({
    where: { id: 'seed-address-1' },
    update: {},
    create: {
      id: 'seed-address-1',
      userId: demoUser.id,
      name: 'John Doe',
      phone: '+1 555-0100',
      province: 'Phnom Penh',
      district: 'Sen Sok',
      commune: 'Phnom Penh Thmei',
      village: 'Borey Area',
      roadNumber: '271',
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      country: 'US',
      zipCode: '10001',
      isDefault: true,
    },
  });

  // Products
  const products = [
    {
      name: 'Apple MacBook Pro 16"',
      slug: 'apple-macbook-pro-16',
      description: 'The most powerful MacBook Pro ever is here. With the blazing-fast M3 Pro or M3 Max chip, stunning Liquid Retina XDR display, and all-day battery life.',
      shortDesc: 'M3 Pro chip, 18GB RAM, 512GB SSD',
      price: 2499.99,
      comparePrice: 2799.99,
      stock: 25,
      categoryId: categoryMap.get('laptops')!,
      brand: 'Apple',
      tags: ['laptop', 'apple', 'macbook', 'pro'],
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
      isFeatured: true,
      rating: 4.8,
      reviewCount: 234,
      soldCount: 89,
    },
    {
      name: 'Sony WH-1000XM5 Headphones',
      slug: 'sony-wh-1000xm5',
      description: 'Industry-leading noise canceling headphones with exceptional sound quality. 30-hour battery life with quick charging.',
      shortDesc: 'Industry-leading noise cancellation',
      price: 349.99,
      comparePrice: 399.99,
      stock: 60,
      categoryId: categoryMap.get('audio')!,
      brand: 'Sony',
      tags: ['headphones', 'sony', 'wireless', 'noise-canceling'],
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      isFeatured: true,
      rating: 4.7,
      reviewCount: 1892,
      soldCount: 543,
    },
    {
      name: 'Samsung 4K OLED Smart TV 65"',
      slug: 'samsung-4k-oled-65',
      description: 'Experience cinematic quality at home with Samsung\'s S95C OLED TV. With Real Depth Enhancer and Neural Quantum Processor 4K.',
      shortDesc: 'S95C OLED, 120Hz, HDR+',
      price: 1799.99,
      comparePrice: 2199.99,
      stock: 15,
      categoryId: categoryMap.get('electronics')!,
      brand: 'Samsung',
      tags: ['tv', 'samsung', 'oled', '4k', 'smart-tv'],
      images: [
        'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400',
      isFeatured: true,
      rating: 4.6,
      reviewCount: 456,
      soldCount: 78,
    },
    {
      name: "Men's Classic Oxford Shirt",
      slug: 'mens-classic-oxford-shirt',
      description: 'Timeless style meets modern comfort in our classic oxford shirt. Made from 100% premium Egyptian cotton.',
      shortDesc: '100% Egyptian Cotton, Slim Fit',
      price: 89.99,
      comparePrice: 129.99,
      stock: 150,
      categoryId: categoryMap.get('mens-fashion')!,
      brand: 'Calvin Klein',
      tags: ['shirt', 'mens', 'oxford', 'formal'],
      images: [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800',
        'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400',
      isFeatured: false,
      rating: 4.4,
      reviewCount: 327,
      soldCount: 289,
    },
    {
      name: "Women's Running Shoes",
      slug: 'womens-running-shoes',
      description: "Engineered for performance, designed for comfort. Nike's latest running technology in a lightweight package.",
      shortDesc: 'ReactX Foam, Breathable Mesh',
      price: 139.99,
      comparePrice: 169.99,
      stock: 80,
      categoryId: categoryMap.get('shoes')!,
      brand: 'Nike',
      tags: ['shoes', 'running', 'women', 'nike'],
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      isFeatured: true,
      rating: 4.5,
      reviewCount: 1023,
      soldCount: 678,
    },
    {
      name: 'Ergonomic Office Chair',
      slug: 'ergonomic-office-chair',
      description: 'Designed for all-day comfort, this ergonomic chair features lumbar support, adjustable armrests, and breathable mesh back.',
      shortDesc: 'Lumbar Support, Adjustable Height',
      price: 449.99,
      comparePrice: 599.99,
      stock: 30,
      categoryId: categoryMap.get('furniture')!,
      brand: 'Herman Miller',
      tags: ['chair', 'office', 'ergonomic', 'furniture'],
      images: [
        'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400',
      isFeatured: false,
      rating: 4.9,
      reviewCount: 567,
      soldCount: 123,
    },
    {
      name: 'iPhone 16 Pro Max',
      slug: 'iphone-16-pro-max',
      description: 'The ultimate iPhone. A18 Pro chip, 48MP camera system, titanium design, and the longest battery life ever in an iPhone.',
      shortDesc: 'A18 Pro, 48MP Camera, Titanium',
      price: 1199.99,
      comparePrice: null,
      stock: 45,
      categoryId: categoryMap.get('smartphones')!,
      brand: 'Apple',
      tags: ['iphone', 'apple', 'smartphone', 'pro'],
      images: [
        'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400',
      isFeatured: true,
      rating: 4.9,
      reviewCount: 3421,
      soldCount: 1205,
    },
    {
      name: 'Vitamin C Face Serum',
      slug: 'vitamin-c-face-serum',
      description: 'Brighten and even skin tone with our potent 20% Vitamin C serum. Reduces dark spots and boosts collagen production.',
      shortDesc: '20% Vitamin C, Anti-aging Formula',
      price: 49.99,
      comparePrice: 79.99,
      stock: 200,
      categoryId: categoryMap.get('beauty')!,
      brand: 'The Ordinary',
      tags: ['skincare', 'vitamin-c', 'serum', 'anti-aging'],
      images: [
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
      isFeatured: false,
      rating: 4.6,
      reviewCount: 2156,
      soldCount: 1876,
    },
    {
      name: 'Galaxy S25 Ultra',
      slug: 'galaxy-s25-ultra',
      description: 'Flagship Android phone with AI camera and long battery life.',
      shortDesc: '256GB, 12GB RAM',
      price: 1099.99,
      comparePrice: 1249.99,
      stock: 62,
      categoryId: categoryMap.get('smartphones')!,
      brand: 'Samsung',
      tags: ['samsung', 'phone', 'android'],
      images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400',
      isFeatured: true,
      rating: 4.7,
      reviewCount: 785,
      soldCount: 402,
    },
    {
      name: 'Dell XPS 15',
      slug: 'dell-xps-15',
      description: 'High performance laptop for creators and professionals.',
      shortDesc: 'Intel i7, 32GB RAM',
      price: 1899.99,
      comparePrice: 2099.99,
      stock: 34,
      categoryId: categoryMap.get('laptops')!,
      brand: 'Dell',
      tags: ['dell', 'laptop', 'xps'],
      images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400',
      isFeatured: false,
      rating: 4.6,
      reviewCount: 344,
      soldCount: 199,
    },
    {
      name: 'Kitchen Nonstick Pan Set',
      slug: 'kitchen-nonstick-pan-set',
      description: '3-piece nonstick cookware set for daily cooking.',
      shortDesc: 'Durable non-stick coating',
      price: 79.99,
      comparePrice: 109.99,
      stock: 120,
      categoryId: categoryMap.get('kitchen')!,
      brand: 'Tefal',
      tags: ['kitchen', 'cookware'],
      images: ['https://images.unsplash.com/photo-1584990347449-ae1d184e2e0d?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1584990347449-ae1d184e2e0d?w=400',
      isFeatured: false,
      rating: 4.5,
      reviewCount: 188,
      soldCount: 340,
    },
    {
      name: 'Road Bike Helmet',
      slug: 'road-bike-helmet',
      description: 'Lightweight and safe cycling helmet with airflow channels.',
      shortDesc: 'Ultra-light cycling helmet',
      price: 59.99,
      comparePrice: 89.99,
      stock: 200,
      categoryId: categoryMap.get('cycling')!,
      brand: 'Giro',
      tags: ['cycling', 'helmet'],
      images: ['https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400',
      isFeatured: false,
      rating: 4.3,
      reviewCount: 90,
      soldCount: 210,
    },
    {
      name: 'Resistance Bands Set',
      slug: 'resistance-bands-set',
      description: '5-level resistance bands for home and gym training.',
      shortDesc: 'Portable fitness bands',
      price: 24.99,
      comparePrice: 39.99,
      stock: 300,
      categoryId: categoryMap.get('fitness')!,
      brand: 'FitPro',
      tags: ['fitness', 'gym', 'bands'],
      images: ['https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
      isFeatured: false,
      rating: 4.4,
      reviewCount: 267,
      soldCount: 510,
    },
    {
      name: 'Organic Jasmine Rice 5kg',
      slug: 'organic-jasmine-rice-5kg',
      description: 'Premium quality organic jasmine rice.',
      shortDesc: '5kg bag',
      price: 12.5,
      comparePrice: 15.0,
      stock: 500,
      categoryId: categoryMap.get('groceries')!,
      brand: 'RiceLand',
      tags: ['rice', 'grocery'],
      images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
      isFeatured: false,
      rating: 4.7,
      reviewCount: 112,
      soldCount: 980,
    },
    {
      name: 'Car Phone Mount',
      slug: 'car-phone-mount',
      description: '360-degree adjustable dashboard phone holder.',
      shortDesc: 'Universal car mount',
      price: 14.99,
      comparePrice: 22.99,
      stock: 430,
      categoryId: categoryMap.get('automotive')!,
      brand: 'AutoGrip',
      tags: ['car', 'accessory'],
      images: ['https://images.unsplash.com/photo-1541348263662-e068662d82af?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1541348263662-e068662d82af?w=400',
      isFeatured: false,
      rating: 4.2,
      reviewCount: 76,
      soldCount: 260,
    },
    {
      name: 'Daily Habits Self Help Book',
      slug: 'daily-habits-self-help-book',
      description: 'Build better habits and improve productivity.',
      shortDesc: 'Self development best seller',
      price: 18.99,
      comparePrice: 24.99,
      stock: 190,
      categoryId: categoryMap.get('self-help')!,
      brand: 'MindGrowth',
      tags: ['book', 'self-help'],
      images: ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      isFeatured: true,
      rating: 4.8,
      reviewCount: 412,
      soldCount: 645,
    },
    {
      name: 'Mystery Novel Collection',
      slug: 'mystery-novel-collection',
      description: 'Top 3 modern mystery novels in one set.',
      shortDesc: 'Paperback collection',
      price: 29.99,
      comparePrice: 35.99,
      stock: 133,
      categoryId: categoryMap.get('fiction')!,
      brand: 'ReadMore',
      tags: ['book', 'fiction'],
      images: ['https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400',
      isFeatured: false,
      rating: 4.5,
      reviewCount: 201,
      soldCount: 325,
    },
    {
      name: 'Women Premium Blazer',
      slug: 'women-premium-blazer',
      description: 'Elegant formal blazer for office and events.',
      shortDesc: 'Slim fit premium fabric',
      price: 119.99,
      comparePrice: 149.99,
      stock: 85,
      categoryId: categoryMap.get('womens-fashion')!,
      brand: 'Zara',
      tags: ['women', 'fashion', 'blazer'],
      images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      isFeatured: false,
      rating: 4.4,
      reviewCount: 90,
      soldCount: 147,
    },
    // Explicit QA / manual test products (search slug or name "[TEST]")
    {
      name: '[TEST] Sample USB-C Cable 2m',
      slug: 'test-sample-usb-c-cable-2m',
      description: 'Sample product for local QA: braided USB-C cable, 2 meters. Safe to delete from admin after testing.',
      shortDesc: 'USB-C, 2m, braided',
      price: 9.99,
      comparePrice: 14.99,
      stock: 999,
      categoryId: categoryMap.get('audio')!,
      brand: 'TestBrand',
      tags: ['test', 'sample', 'usb-c', 'cable'],
      images: ['https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400',
      isFeatured: true,
      rating: 5,
      reviewCount: 0,
      soldCount: 0,
    },
    {
      name: '[TEST] Sample T-Shirt (unisex)',
      slug: 'test-sample-tshirt-unisex',
      description: 'Sample product for cart/checkout tests. Cotton blend, one size display.',
      shortDesc: 'Unisex cotton tee',
      price: 19.99,
      comparePrice: null,
      stock: 500,
      categoryId: categoryMap.get('mens-fashion')!,
      brand: 'TestBrand',
      tags: ['test', 'sample', 'tshirt', 'apparel'],
      images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      isFeatured: true,
      rating: 5,
      reviewCount: 0,
      soldCount: 0,
    },
    {
      name: '[TEST] Sample Water Bottle 750ml',
      slug: 'test-sample-water-bottle-750ml',
      description: 'Sample product for order flow testing. Insulated stainless steel.',
      shortDesc: '750ml insulated bottle',
      price: 12.5,
      comparePrice: 18.0,
      stock: 200,
      categoryId: categoryMap.get('fitness')!,
      brand: 'TestBrand',
      tags: ['test', 'sample', 'bottle', 'fitness'],
      images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'],
      thumbnail: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
      isFeatured: false,
      rating: 5,
      reviewCount: 0,
      soldCount: 0,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  console.log(`✅ Created ${products.length} products`);

  // Coupon
  await prisma.coupon.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: {
      code: 'WELCOME20',
      description: '20% off for new customers',
      discountType: 'PERCENTAGE',
      discount: 20,
      minOrder: 50,
      maxDiscount: 100,
      usageLimit: 1000,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'SAVE10' },
    update: {},
    create: {
      code: 'SAVE10',
      description: '$10 off any order',
      discountType: 'FIXED',
      discount: 10,
      minOrder: 30,
      isActive: true,
    },
  });

  console.log('✅ Created coupons');
  console.log('\n🎉 Database seeded successfully!');
  console.log('Admin login: admin@shop.com / Admin@12345');
  console.log('User login: user@shop.com / User@12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

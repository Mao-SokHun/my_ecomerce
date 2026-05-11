require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_SQL_PATHS = [
  process.env.CAMBODIA_SQL_PATH,
  path.resolve(__dirname, '..', '..', 'cambodia_map.sql'),
  path.resolve(__dirname, '..', '..', 'cambodia.sql'),
  'D:\\Business Sytem Online Shopping\\cambodia_map.sql',
  'D:\\Business Sytem Online Shopping\\cambodia.sql',
  'C:\\Users\\LyhourMao\\Downloads\\Telegram Desktop\\cambodia_map.sql',
  'C:\\Users\\LyhourMao\\Downloads\\Telegram Desktop\\cambodia.sql',
].filter(Boolean);

const parseSqlRows = (sql, table) => {
  const regex = new RegExp(`INSERT INTO\\s+\`${table}\`\\s*\\([^)]*\\)\\s*VALUES\\s*([\\s\\S]*?);`, 'g');
  const rows = [];
  let blockMatch = regex.exec(sql);

  while (blockMatch) {
    const values = blockMatch[1];
    let i = 0;
    while (i < values.length) {
      while (i < values.length && values[i] !== '(') i += 1;
      if (i >= values.length) break;
      i += 1;

      const row = [];
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

const trim = (value) => String(value || '').trim();
const maybeNull = (value) => trim(value) || null;
const active = (value) => value === undefined || value === null || value === '' || String(value) === '1';
const pad = (value, length) => trim(value).padStart(length, '0');

const findSqlPath = () => DEFAULT_SQL_PATHS.find((candidate) => fs.existsSync(candidate));

const loadSqlSource = () => {
  const sqlPath = findSqlPath();
  if (!sqlPath) {
    throw new Error(`No Cambodia SQL source found. Set CAMBODIA_SQL_PATH or place cambodia.sql at ${DEFAULT_SQL_PATHS[1]}.`);
  }

  const rawSql = fs.readFileSync(sqlPath, 'utf8');
  const modernProvinces = parseSqlRows(rawSql, 'provinces');
  const modernDistricts = parseSqlRows(rawSql, 'districts');
  const modernCommunes = parseSqlRows(rawSql, 'communes');
  const modernVillages = parseSqlRows(rawSql, 'villages');

  if (modernProvinces.length && modernDistricts.length && modernCommunes.length && modernVillages.length) {
    return {
      sqlPath,
      provinces: modernProvinces.map((cols) => ({
          code: pad(cols[0], 2),
          nameEn: maybeNull(cols[1]),
          nameKm: trim(cols[2]),
        })),
      districts: modernDistricts.map((cols) => ({
          code: pad(cols[0], 4),
          parentCode: pad(cols[1], 2),
          nameEn: maybeNull(cols[2]),
          nameKm: trim(cols[3]),
        })),
      communes: modernCommunes.map((cols) => ({
          code: pad(cols[0], 6),
          parentCode: pad(cols[1], 4),
          nameEn: maybeNull(cols[2]),
          nameKm: trim(cols[3]),
        })),
      villages: modernVillages.map((cols) => ({
          code: pad(cols[0], 8),
          parentCode: pad(cols[1], 6),
          nameEn: maybeNull(cols[2]),
          nameKm: trim(cols[3]),
        })),
    };
  }

  return {
    sqlPath,
    provinces: parseSqlRows(rawSql, 'sys_provinces').map((cols) => ({
      code: trim(cols[0]),
      nameEn: maybeNull(cols[1]),
      nameKm: trim(cols[2]),
    })),
    districts: parseSqlRows(rawSql, 'sys_districts').map((cols) => ({
      code: trim(cols[1]),
      parentCode: trim(cols[2]),
      nameEn: maybeNull(cols[3]),
      nameKm: trim(cols[4]),
    })),
    communes: parseSqlRows(rawSql, 'sys_communes').map((cols) => ({
      code: trim(cols[1]),
      parentCode: trim(cols[2]),
      nameEn: maybeNull(cols[3]),
      nameKm: trim(cols[4]),
    })),
    villages: parseSqlRows(rawSql, 'sys_villages').map((cols) => ({
      code: trim(cols[0]),
      parentCode: trim(cols[1]),
      nameEn: maybeNull(cols[2]),
      nameKm: trim(cols[3]),
    })),
  };
};

const uniqueByKey = (rows, keyFor) => {
  const byKey = new Map();
  const duplicates = [];

  for (const row of rows) {
    const key = keyFor(row);
    if (!key) continue;
    if (byKey.has(key)) duplicates.push({ key, row });
    else byKey.set(key, row);
  }

  return { byKey, duplicates };
};

const compareMap = (label, sourceMap, dbMap) => {
  const missing = [];
  const extra = [];
  const codeMismatch = [];
  const englishMismatch = [];

  for (const [key, source] of sourceMap) {
    const db = dbMap.get(key);
    if (!db) {
      missing.push({ key, source });
      continue;
    }
    if (source.code && db.code && source.code !== db.code) {
      codeMismatch.push({ key, sourceCode: source.code, dbCode: db.code });
    }
    if ((source.nameEn || null) !== (db.nameEn || null)) {
      englishMismatch.push({ key, sourceNameEn: source.nameEn, dbNameEn: db.nameEn });
    }
  }

  for (const [key, db] of dbMap) {
    if (!sourceMap.has(key)) extra.push({ key, db });
  }

  const ok = missing.length === 0 && extra.length === 0 && codeMismatch.length === 0 && englishMismatch.length === 0;
  console.log(`\n${ok ? 'OK' : 'CHECK'} ${label}`);
  console.log(`  source expected: ${sourceMap.size}`);
  console.log(`  database:        ${dbMap.size}`);
  console.log(`  missing:         ${missing.length}`);
  console.log(`  extra:           ${extra.length}`);
  console.log(`  code mismatch:   ${codeMismatch.length}`);
  console.log(`  English mismatch:${englishMismatch.length}`);

  const printSamples = (title, items) => {
    if (items.length === 0) return;
    console.log(`  ${title} samples:`);
    for (const item of items.slice(0, 5)) {
      console.log(`    - ${JSON.stringify(item)}`);
    }
  };

  printSamples('missing', missing);
  printSamples('extra', extra);
  printSamples('code mismatch', codeMismatch);
  printSamples('English mismatch', englishMismatch);

  return ok;
};

const main = async () => {
  const source = loadSqlSource();
  console.log(`Using source: ${source.sqlPath}`);

  const sourceProvinces = uniqueByKey(source.provinces, (row) => row.nameKm && `province:${row.nameKm}`);
  const sourceDistricts = uniqueByKey(source.districts, (row) => row.parentCode && row.nameKm && `district:${row.parentCode}:${row.nameKm}`);
  const sourceCommunes = uniqueByKey(source.communes, (row) => row.parentCode && row.nameKm && `commune:${row.parentCode}:${row.nameKm}`);
  const sourceVillages = uniqueByKey(source.villages, (row) => row.parentCode && row.nameKm && `village:${row.parentCode}:${row.nameKm}`);

  console.log('\nSource raw counts');
  console.table({
    provinces: source.provinces.length,
    districts: source.districts.length,
    communes: source.communes.length,
    villages: source.villages.length,
  });

  console.log('Source duplicate rows skipped by seed');
  console.table({
    provinces: sourceProvinces.duplicates.length,
    districts: sourceDistricts.duplicates.length,
    communes: sourceCommunes.duplicates.length,
    villages: sourceVillages.duplicates.length,
  });

  const [dbProvinces, dbDistricts, dbCommunes, dbVillages] = await Promise.all([
    prisma.cambodiaProvince.findMany({
      select: { code: true, nameKm: true, nameEn: true },
    }),
    prisma.cambodiaDistrict.findMany({
      select: { code: true, nameKm: true, nameEn: true, province: { select: { code: true } } },
    }),
    prisma.cambodiaCommune.findMany({
      select: { code: true, nameKm: true, nameEn: true, district: { select: { code: true } } },
    }),
    prisma.cambodiaVillage.findMany({
      select: { code: true, nameKm: true, nameEn: true, commune: { select: { code: true } } },
    }),
  ]);

  const dbProvinceMap = uniqueByKey(dbProvinces, (row) => row.nameKm && `province:${row.nameKm}`).byKey;
  const dbDistrictMap = uniqueByKey(dbDistricts, (row) => row.province?.code && row.nameKm && `district:${row.province.code}:${row.nameKm}`).byKey;
  const dbCommuneMap = uniqueByKey(dbCommunes, (row) => row.district?.code && row.nameKm && `commune:${row.district.code}:${row.nameKm}`).byKey;
  const dbVillageMap = uniqueByKey(dbVillages, (row) => row.commune?.code && row.nameKm && `village:${row.commune.code}:${row.nameKm}`).byKey;

  const results = [
    compareMap('provinces', sourceProvinces.byKey, dbProvinceMap),
    compareMap('districts', sourceDistricts.byKey, dbDistrictMap),
    compareMap('communes', sourceCommunes.byKey, dbCommuneMap),
    compareMap('villages', sourceVillages.byKey, dbVillageMap),
  ];

  if (results.every(Boolean)) {
    console.log('\nAll Cambodia location tables match the present source data.');
  } else {
    console.log('\nSome differences were found. Review the samples above.');
    process.exitCode = 1;
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

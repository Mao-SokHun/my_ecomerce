const fs = require('fs');
const path = require('path');

const sourcePath = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'cambodia.sql'));
const outputPath = path.resolve(process.argv[3] || path.join(__dirname, '..', '..', 'cambodia_map.sql'));

const parseSqlRows = (sql, table) => {
  const regex = new RegExp(`INSERT INTO\\s+\`${table}\`\\s*\\(([^)]*)\\)\\s*VALUES\\s*([\\s\\S]*?);`, 'g');
  const rows = [];
  let blockMatch = regex.exec(sql);

  while (blockMatch) {
    const columns = blockMatch[1].split(',').map((column) => column.replace(/`/g, '').trim());
    const values = blockMatch[2];
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
          row.push(token.trim() === 'NULL' ? null : token.trim());
          token = '';
        } else if (ch === ')') {
          row.push(token.trim() === 'NULL' ? null : token.trim());
          break;
        } else {
          token += ch;
        }
        i += 1;
      }

      rows.push(Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null])));
      i += 1;
    }

    blockMatch = regex.exec(sql);
  }

  return rows;
};

const trim = (value) => String(value || '').trim();
const active = (row) => row.active === undefined || row.active === null || String(row.active) === '1';
const pad = (value, length) => trim(value).padStart(length, '0');
const sqlValue = (value) => {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
};

const chunk = (items, size = 650) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

// `cambodia.sql` contains villages that reference these commune codes, but the
// corresponding commune rows are missing from its `communes` table. Keep these
// parents so the generated map remains referentially complete for seeding.
const ORPHAN_PARENT_COMMUNES = [
  {
    id: '11004',
    com_code: '011004',
    dis_code: '0110',
    name_en: 'Ou Chrov',
    name_kh: 'អូរជ្រៅ',
    note: 'អនុក្រឹត្យ ១៥៦ថ្ងៃទី ២០ សីហា ២០២១',
    active: '1',
  },
  {
    id: '11005',
    com_code: '011005',
    dis_code: '0110',
    name_en: 'Ou Reusey',
    name_kh: 'អូរឫស្សី',
    note: 'អនុក្រឹត្យ ១៥៧ថ្ងៃទី ២០ សីហា ២០២១',
    active: '1',
  },
  {
    id: '20409',
    com_code: '020409',
    dis_code: '0204',
    name_en: 'Bouvel',
    name_kh: 'បួវិល',
    note: 'អនុក្រឹត្យ ១៥៣ ថ្ងៃទី ២០ សីហា ២០២១',
    active: '1',
  },
  {
    id: '40614',
    com_code: '040614',
    dis_code: '0406',
    name_en: 'Phnom Kraing Dey Meas',
    name_kh: 'ភ្នំក្រាំងដីមាស',
    note: 'អនុក្រឹត្យ ១៥១ ថ្ងៃទី ២០ សីហា ២០២១',
    active: '1',
  },
  {
    id: '50614',
    com_code: '050614',
    dis_code: '0506',
    name_en: 'Yeay Mao Pichnil',
    name_kh: 'យាយម៉ៅពេជ្យនិល',
    note: 'អនុក្រឹត្យ១៥០ អនក្របក',
    active: '1',
  },
  {
    id: '100411',
    com_code: '100411',
    dis_code: '1004',
    name_en: 'Oukondear Senchey',
    name_kh: 'អូរកណ្តៀរសែនជ័យ',
    note: 'អនុក្រឹត្យ ១៥២ ថ្ងៃទី ២០ សីហា ២០២១',
    active: '1',
  },
];

const insertBlocks = (table, columns, rows) => {
  if (rows.length === 0) return [`-- No data for ${table}`];

  return chunk(rows).map((batch) => {
    const values = batch
      .map((row) => `(${columns.map((column) => sqlValue(row[column])).join(', ')})`)
      .join(',\n');
    return `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES\n${values};`;
  });
};

const main = () => {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source file: ${sourcePath}`);
  }

  const sourceSql = fs.readFileSync(sourcePath, 'utf8');
  const provinces = parseSqlRows(sourceSql, 'provinces').map((row) => ({
      pro_code: pad(row.id, 2),
      name_en: trim(row.name_en),
      name_kh: trim(row.name_kh),
      Reference: null,
      active: trim(row.active) || '1',
    }));

  const districts = parseSqlRows(sourceSql, 'districts').map((row) => ({
      id: trim(row.id),
      dis_code: pad(row.id, 4),
      pro_code: pad(row.province_id, 2),
      name_en: trim(row.name_en),
      name_kh: trim(row.name_kh),
      note: row.note || null,
      active: trim(row.active) || '1',
    }));

  const communes = parseSqlRows(sourceSql, 'communes').map((row) => ({
      id: trim(row.id),
      com_code: pad(row.id, 6),
      dis_code: pad(row.district_id, 4),
      name_en: trim(row.name_en),
      name_kh: trim(row.name_kh),
      note: row.note || null,
      active: trim(row.active) || '1',
    }));
  const existingCommuneCodes = new Set(communes.map((commune) => commune.com_code));
  for (const commune of ORPHAN_PARENT_COMMUNES) {
    if (!existingCommuneCodes.has(commune.com_code)) communes.push(commune);
  }

  const villages = parseSqlRows(sourceSql, 'villages').map((row) => ({
      vil_code: pad(row.id, 8),
      com_code: pad(row.commune_id, 6),
      name_en: trim(row.name_en),
      name_kh: trim(row.name_kh),
      note: row.notes || row.prakas || null,
    }));

  const lines = [
    '-- Cambodia location map generated from cambodia.sql',
    `-- Generated at: ${new Date().toISOString()}`,
    '-- Source of truth: cambodia.sql',
    `-- Rows: provinces=${provinces.length}, districts=${districts.length}, communes=${communes.length}, villages=${villages.length}`,
    '',
    'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";',
    'START TRANSACTION;',
    'SET time_zone = "+00:00";',
    '',
    'CREATE TABLE `sys_villages` (',
    '  `vil_code` varchar(8) NOT NULL,',
    '  `com_code` varchar(6) NOT NULL,',
    '  `name_en` varchar(191) NOT NULL,',
    '  `name_kh` varchar(191) NOT NULL,',
    '  `note` varchar(255) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
    ...insertBlocks('sys_villages', ['vil_code', 'com_code', 'name_en', 'name_kh', 'note'], villages),
    '',
    'CREATE TABLE `sys_communes` (',
    '  `id` int(11) NOT NULL,',
    '  `com_code` varchar(10) NOT NULL,',
    '  `dis_code` varchar(10) NOT NULL,',
    '  `name_en` varchar(255) NOT NULL,',
    '  `name_kh` varchar(255) NOT NULL,',
    '  `note` text DEFAULT NULL,',
    '  `active` tinyint(1) DEFAULT 1',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
    ...insertBlocks('sys_communes', ['id', 'com_code', 'dis_code', 'name_en', 'name_kh', 'note', 'active'], communes),
    '',
    'CREATE TABLE `sys_districts` (',
    '  `id` int(11) NOT NULL,',
    '  `dis_code` varchar(10) NOT NULL,',
    '  `pro_code` varchar(10) NOT NULL,',
    '  `name_en` varchar(255) NOT NULL,',
    '  `name_kh` varchar(255) NOT NULL,',
    '  `note` text DEFAULT NULL,',
    '  `active` tinyint(1) DEFAULT 1',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
    ...insertBlocks('sys_districts', ['id', 'dis_code', 'pro_code', 'name_en', 'name_kh', 'note', 'active'], districts),
    '',
    'CREATE TABLE `sys_provinces` (',
    '  `pro_code` varchar(2) NOT NULL,',
    '  `name_en` varchar(191) NOT NULL,',
    '  `name_kh` varchar(191) NOT NULL,',
    '  `Reference` varchar(191) DEFAULT NULL,',
    '  `active` tinyint(1) NOT NULL DEFAULT 1',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
    ...insertBlocks('sys_provinces', ['pro_code', 'name_en', 'name_kh', 'Reference', 'active'], provinces),
    '',
    'ALTER TABLE `sys_villages` ADD PRIMARY KEY (`vil_code`), ADD KEY `com_code_index` (`com_code`);',
    'ALTER TABLE `sys_communes` ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `com_code_unique` (`com_code`), ADD KEY `dis_code_index` (`dis_code`);',
    'ALTER TABLE `sys_districts` ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `dis_code_unique` (`dis_code`), ADD KEY `pro_code_index` (`pro_code`);',
    'ALTER TABLE `sys_provinces` ADD PRIMARY KEY (`pro_code`);',
    '',
    'COMMIT;',
    '',
  ];

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
  console.log(`Updated ${outputPath}`);
  console.log(`Rows: provinces=${provinces.length}, districts=${districts.length}, communes=${communes.length}, villages=${villages.length}`);
};

main();

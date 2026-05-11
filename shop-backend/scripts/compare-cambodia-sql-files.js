const fs = require('fs');
const path = require('path');

const correctPath = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'cambodia.sql'));
const oldPath = path.resolve(process.argv[3] || path.join(__dirname, '..', '..', 'cambodia_map.sql'));

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
const idCode = (value, length) => pad(value, length);

const loadCorrect = (sql) => ({
  provinces: parseSqlRows(sql, 'provinces')
    .filter(active)
    .map((row) => ({
      key: idCode(row.id, 2),
      code: idCode(row.id, 2),
      parentCode: null,
      nameEn: trim(row.name_en),
      nameKh: trim(row.name_kh),
    })),
  districts: parseSqlRows(sql, 'districts')
    .filter(active)
    .map((row) => ({
      key: idCode(row.id, 4),
      code: idCode(row.id, 4),
      parentCode: idCode(row.province_id, 2),
      nameEn: trim(row.name_en),
      nameKh: trim(row.name_kh),
    })),
  communes: parseSqlRows(sql, 'communes')
    .filter(active)
    .map((row) => ({
      key: idCode(row.id, 6),
      code: idCode(row.id, 6),
      parentCode: idCode(row.district_id, 4),
      nameEn: trim(row.name_en),
      nameKh: trim(row.name_kh),
    })),
  villages: parseSqlRows(sql, 'villages')
    .filter(active)
    .map((row) => ({
      key: idCode(row.id, 8),
      code: idCode(row.id, 8),
      parentCode: idCode(row.commune_id, 6),
      nameEn: trim(row.name_en),
      nameKh: trim(row.name_kh),
    })),
});

const loadOld = (sql) => ({
  provinces: parseSqlRows(sql, 'sys_provinces')
    .filter(active)
    .map((row) => ({
      key: pad(row.pro_code, 2),
      code: pad(row.pro_code, 2),
      parentCode: null,
      nameEn: trim(row.name_en),
      nameKh: trim(row.name_kh),
    })),
  districts: parseSqlRows(sql, 'sys_districts')
    .filter(active)
    .map((row) => ({
      key: pad(row.dis_code, 4),
      code: pad(row.dis_code, 4),
      parentCode: pad(row.pro_code, 2),
      nameEn: trim(row.name_en),
      nameKh: trim(row.name_kh),
    })),
  communes: parseSqlRows(sql, 'sys_communes')
    .filter(active)
    .map((row) => ({
      key: pad(row.com_code, 6),
      code: pad(row.com_code, 6),
      parentCode: pad(row.dis_code, 4),
      nameEn: trim(row.name_en),
      nameKh: trim(row.name_kh),
    })),
  villages: parseSqlRows(sql, 'sys_villages').map((row) => ({
    key: pad(row.vil_code, 8),
    code: pad(row.vil_code, 8),
    parentCode: pad(row.com_code, 6),
    nameEn: trim(row.name_en),
    nameKh: trim(row.name_kh),
  })),
});

const byKey = (rows) => new Map(rows.map((row) => [row.key, row]));

const compare = (label, correctRows, oldRows) => {
  const correct = byKey(correctRows);
  const old = byKey(oldRows);
  const missingFromOld = [];
  const extraInOld = [];
  const mismatches = [];

  for (const [key, source] of correct) {
    const candidate = old.get(key);
    if (!candidate) {
      missingFromOld.push(source);
      continue;
    }

    const diff = {};
    for (const field of ['parentCode', 'nameEn', 'nameKh']) {
      if ((source[field] || '') !== (candidate[field] || '')) {
        diff[field] = { correct: source[field], old: candidate[field] };
      }
    }
    if (Object.keys(diff).length > 0) mismatches.push({ key, diff });
  }

  for (const [key, candidate] of old) {
    if (!correct.has(key)) extraInOld.push(candidate);
  }

  console.log(`\n${label}`);
  console.log(`  correct rows:     ${correctRows.length}`);
  console.log(`  cambodia_map rows:${oldRows.length}`);
  console.log(`  missing in old:   ${missingFromOld.length}`);
  console.log(`  extra in old:     ${extraInOld.length}`);
  console.log(`  mismatched:       ${mismatches.length}`);

  const printSamples = (title, rows) => {
    if (rows.length === 0) return;
    console.log(`  ${title} samples:`);
    for (const row of rows.slice(0, 10)) {
      console.log(`    - ${JSON.stringify(row)}`);
    }
  };

  printSamples('missing in old', missingFromOld);
  printSamples('extra in old', extraInOld);
  printSamples('mismatch', mismatches);

  return { missingFromOld, extraInOld, mismatches };
};

const main = () => {
  if (!fs.existsSync(correctPath)) throw new Error(`Missing correct file: ${correctPath}`);
  if (!fs.existsSync(oldPath)) throw new Error(`Missing old file: ${oldPath}`);

  const correctSql = fs.readFileSync(correctPath, 'utf8');
  const oldSql = fs.readFileSync(oldPath, 'utf8');
  const correct = loadCorrect(correctSql);
  const old = loadOld(oldSql);

  console.log(`Correct source: ${correctPath}`);
  console.log(`Old source:     ${oldPath}`);
  console.log('Comparison filters: active provinces/districts/communes only; villages have no active field in cambodia_map.sql.');

  const results = [
    compare('provinces', correct.provinces, old.provinces),
    compare('districts', correct.districts, old.districts),
    compare('communes', correct.communes, old.communes),
    compare('villages', correct.villages, old.villages),
  ];

  const hasDiff = results.some(
    (result) => result.missingFromOld.length || result.extraInOld.length || result.mismatches.length
  );

  console.log(hasDiff ? '\nResult: files do NOT fully match.' : '\nResult: files match.');
  process.exitCode = hasDiff ? 1 : 0;
};

main();

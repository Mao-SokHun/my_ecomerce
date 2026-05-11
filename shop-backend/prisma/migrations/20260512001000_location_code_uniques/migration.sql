DROP INDEX IF EXISTS "kh_districts_provinceId_nameKm_key";
DROP INDEX IF EXISTS "kh_communes_districtId_nameKm_key";
DROP INDEX IF EXISTS "kh_villages_communeId_nameKm_key";

CREATE UNIQUE INDEX IF NOT EXISTS "kh_districts_code_key" ON "kh_districts"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "kh_communes_code_key" ON "kh_communes"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "kh_villages_code_key" ON "kh_villages"("code");

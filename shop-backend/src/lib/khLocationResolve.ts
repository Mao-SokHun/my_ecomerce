import prisma from './prisma';
import { AppError } from '../middleware/errorHandler';
import type { AppLang } from './requestLang';
import { addressMsg } from './addressValidationMessages';

/** Public key for selects: official short code when present, else internal id. */
export function computeLocKey(row: { id: string; code: string | null }): string {
  const c = row.code?.trim();
  return c || row.id;
}

export async function resolveProvinceKey(key: string) {
  const k = key.trim();
  if (!k) return null;
  const byId = await prisma.cambodiaProvince.findUnique({ where: { id: k } });
  if (byId) return byId;
  return prisma.cambodiaProvince.findFirst({ where: { code: k } });
}

export async function resolveDistrictKey(province: { id: string } | null, key: string) {
  const k = key.trim();
  if (!k) return null;
  const byId = await prisma.cambodiaDistrict.findUnique({ where: { id: k } });
  if (byId) {
    if (province && byId.provinceId !== province.id) return null;
    return byId;
  }
  if (!province) return null;
  return prisma.cambodiaDistrict.findFirst({ where: { provinceId: province.id, code: k } });
}

export async function resolveCommuneKey(district: { id: string } | null, key: string) {
  const k = key.trim();
  if (!k) return null;
  const byId = await prisma.cambodiaCommune.findUnique({ where: { id: k } });
  if (byId) {
    if (district && byId.districtId !== district.id) return null;
    return byId;
  }
  if (!district) return null;
  return prisma.cambodiaCommune.findFirst({ where: { districtId: district.id, code: k } });
}

export async function resolveVillageKey(commune: { id: string } | null, key: string) {
  const k = key.trim();
  if (!k) return null;
  const byId = await prisma.cambodiaVillage.findUnique({ where: { id: k } });
  if (byId) {
    if (commune && byId.communeId !== commune.id) return null;
    return byId;
  }
  if (!commune) return null;
  return prisma.cambodiaVillage.findFirst({ where: { communeId: commune.id, code: k } });
}

/** Resolve district id for GET /districts/:provinceId — province param is id or code. */
export async function resolveProvinceDbId(key: string): Promise<string | null> {
  const p = await resolveProvinceKey(key);
  return p?.id ?? null;
}

/**
 * Resolve district id for GET /communes/:districtId
 * Optional provinceId query disambiguates district code; omit when district id is internal cuid.
 */
export async function resolveDistrictDbIdForCommunesList(
  provinceKey: string | undefined,
  districtKey: string
): Promise<string | null> {
  const province = provinceKey?.trim() ? await resolveProvinceKey(provinceKey) : null;
  const district = await resolveDistrictKey(province, districtKey);
  return district?.id ?? null;
}

/**
 * Resolve commune id for GET /villages/:communeId
 * Optional provinceId + districtId query disambiguate codes; omit when commune id is cuid.
 */
export async function resolveCommuneDbIdForVillagesList(
  provinceKey: string | undefined,
  districtKey: string | undefined,
  communeKey: string
): Promise<string | null> {
  const province = provinceKey?.trim() ? await resolveProvinceKey(provinceKey) : null;
  const district = await resolveDistrictKey(province, districtKey || '');
  const commune = await resolveCommuneKey(district, communeKey);
  return commune?.id ?? null;
}

/**
 * Validates the four-level Cambodia admin hierarchy against DB rows and returns
 * official Khmer names (nameKm) from the database — single source of truth.
 * Accepts either internal ids or official `code` at each level (codes scoped by parent).
 */
export async function resolveKhAddressFromHierarchyIds(
  params: {
    provinceId: string;
    districtId: string;
    communeId: string;
    villageId: string;
  },
  lang: AppLang
): Promise<{ province: string; district: string; commune: string; village: string }> {
  const province = await resolveProvinceKey(params.provinceId);
  if (!province) {
    throw new AppError(addressMsg('provinceNotFound', lang), 400);
  }

  const district = await resolveDistrictKey(province, params.districtId);
  if (!district) {
    throw new AppError(addressMsg('districtNotFound', lang), 400);
  }

  const commune = await resolveCommuneKey(district, params.communeId);
  if (!commune) {
    throw new AppError(addressMsg('communeNotFound', lang), 400);
  }

  const village = await resolveVillageKey(commune, params.villageId);
  if (!village) {
    throw new AppError(addressMsg('villageNotFound', lang), 400);
  }

  return {
    province: province.nameKm,
    district: district.nameKm,
    commune: commune.nameKm,
    village: village.nameKm,
  };
}

export function hasAllKhHierarchyIds(body: Record<string, unknown>): boolean {
  const p = String(body.provinceId ?? '').trim();
  const d = String(body.districtId ?? '').trim();
  const c = String(body.communeId ?? '').trim();
  const v = String(body.villageId ?? '').trim();
  return Boolean(p && d && c && v);
}

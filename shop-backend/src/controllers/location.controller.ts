import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import {
  computeLocKey,
  resolveProvinceDbId,
  resolveDistrictDbIdForCommunesList,
  resolveCommuneDbIdForVillagesList,
} from '../lib/khLocationResolve';

type Lang = 'km' | 'en' | 'zh';
type LocationRow = {
  id: string;
  code: string | null;
  nameKm: string;
  nameEn: string | null;
  nameZh: string | null;
};

const resolveLang = (req: Request): Lang => {
  const lang = String(req.query.lang || 'km').toLowerCase();
  if (lang === 'en' || lang === 'zh') return lang;
  return 'km';
};

const labelByLang = (row: LocationRow, lang: Lang): string => {
  if (lang === 'zh') return row.nameZh || row.nameEn || row.nameKm;
  if (lang === 'en') return row.nameEn || row.nameZh || row.nameKm;
  return row.nameKm || row.nameZh || row.nameEn || '';
};

const localizeRows = (rows: LocationRow[], lang: Lang) =>
  rows
    .map((row) => ({
      ...row,
      name: labelByLang(row, lang),
      locKey: computeLocKey(row),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

export const getProvinces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lang = resolveLang(req);
    const provinces = await prisma.$queryRawUnsafe<LocationRow[]>(
      `SELECT id, code, "nameKm", "nameEn", "nameZh" FROM kh_provinces WHERE COALESCE(code, '') <> '99' AND COALESCE("nameEn", '') <> 'Central Ministry'`
    );
    res.json({ success: true, data: localizeRows(provinces, lang) });
  } catch (error) {
    next(error);
  }
};

export const getDistricts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lang = resolveLang(req);
    const provinceParam = String(req.params.provinceId);
    const provinceDbId = await resolveProvinceDbId(provinceParam);
    if (!provinceDbId) {
      res.json({ success: true, data: [] });
      return;
    }
    const districts = await prisma.$queryRawUnsafe<LocationRow[]>(
      'SELECT id, code, "nameKm", "nameEn", "nameZh" FROM kh_districts WHERE "provinceId" = $1',
      provinceDbId
    );
    res.json({ success: true, data: localizeRows(districts, lang) });
  } catch (error) {
    next(error);
  }
};

export const getCommunes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lang = resolveLang(req);
    const districtParam = String(req.params.districtId);
    const provinceQ = req.query.provinceId != null ? String(req.query.provinceId) : undefined;
    const districtDbId = await resolveDistrictDbIdForCommunesList(provinceQ, districtParam);
    if (!districtDbId) {
      res.json({ success: true, data: [] });
      return;
    }
    const communes = await prisma.$queryRawUnsafe<LocationRow[]>(
      'SELECT id, code, "nameKm", "nameEn", "nameZh" FROM kh_communes WHERE "districtId" = $1',
      districtDbId
    );
    res.json({ success: true, data: localizeRows(communes, lang) });
  } catch (error) {
    next(error);
  }
};

export const getVillages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lang = resolveLang(req);
    const communeParam = String(req.params.communeId);
    const provinceQ = req.query.provinceId != null ? String(req.query.provinceId) : undefined;
    const districtQ = req.query.districtId != null ? String(req.query.districtId) : undefined;
    const communeDbId = await resolveCommuneDbIdForVillagesList(provinceQ, districtQ, communeParam);
    if (!communeDbId) {
      res.json({ success: true, data: [] });
      return;
    }
    const villages = await prisma.$queryRawUnsafe<LocationRow[]>(
      'SELECT id, code, "nameKm", "nameEn", "nameZh" FROM kh_villages WHERE "communeId" = $1',
      communeDbId
    );
    res.json({ success: true, data: localizeRows(villages, lang) });
  } catch (error) {
    next(error);
  }
};

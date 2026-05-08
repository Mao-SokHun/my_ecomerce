import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { hasAllKhHierarchyIds, resolveKhAddressFromHierarchyIds } from '../lib/khLocationResolve';
import { addressMsg } from '../lib/addressValidationMessages';
import { getRequestLang } from '../lib/requestLang';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { PRODUCT_NAME_TRANSLATIONS } from '../data/productNameTranslations';

type ProductLang = 'km' | 'en' | 'zh';

const resolveLang = (value: unknown): ProductLang => {
  const raw = String(value || '').toLowerCase();
  if (raw === 'en' || raw === 'zh') return raw;
  return 'km';
};

const localizeProductName = (slug: string, fallbackName: string, lang: ProductLang): string => {
  if (lang === 'en') return fallbackName;
  const row = PRODUCT_NAME_TRANSLATIONS[slug];
  if (!row) return fallbackName;
  if (lang === 'zh' && row.zh) return row.zh;
  if (lang === 'km' && row.km) return row.km;
  return fallbackName;
};

export const getAddresses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lang = getRequestLang(req);
    const body = req.body as Record<string, unknown>;
    const {
      name, phone, roadNumber,
      street, city, state, country, zipCode, isDefault, note
    } = req.body;

    if (!name || !phone) {
      throw new AppError(addressMsg('requireNamePhone', lang), 400);
    }

    if (!hasAllKhHierarchyIds(body)) {
      throw new AppError(addressMsg('requireHierarchyIds', lang), 400);
    }

    const { province, district, commune, village } = await resolveKhAddressFromHierarchyIds(
      {
        provinceId: String(body.provinceId).trim(),
        districtId: String(body.districtId).trim(),
        communeId: String(body.communeId).trim(),
        villageId: String(body.villageId).trim(),
      },
      lang
    );
    const provinceId = String(body.provinceId).trim();
    const districtId = String(body.districtId).trim();
    const communeId = String(body.communeId).trim();
    const villageId = String(body.villageId).trim();

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user!.id,
        name,
        phone,
        provinceId,
        districtId,
        communeId,
        villageId,
        province,
        district,
        commune,
        village,
        roadNumber,
        street: street || null,
        city: city || null,
        state: state || null,
        country: country || 'KH',
        zipCode: zipCode || null,
        note: note || null,
        isDefault: !!isDefault,
      },
    });

    res.status(201).json({ success: true, message: addressMsg('addressAdded', lang), data: address });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lang = getRequestLang(req);
    const id = String(req.params.id);
    const body = req.body as Record<string, unknown>;
    const {
      name, phone, roadNumber,
      street, city, state, country, zipCode, isDefault, note
    } = req.body;

    const existing = await prisma.address.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) throw new AppError(addressMsg('addressNotFound', lang), 404);

    if (!name || !phone) {
      throw new AppError(addressMsg('requireNamePhone', lang), 400);
    }

    if (!hasAllKhHierarchyIds(body)) {
      throw new AppError(addressMsg('requireHierarchyIds', lang), 400);
    }

    const { province, district, commune, village } = await resolveKhAddressFromHierarchyIds(
      {
        provinceId: String(body.provinceId).trim(),
        districtId: String(body.districtId).trim(),
        communeId: String(body.communeId).trim(),
        villageId: String(body.villageId).trim(),
      },
      lang
    );
    const provinceId = String(body.provinceId).trim();
    const districtId = String(body.districtId).trim();
    const communeId = String(body.communeId).trim();
    const villageId = String(body.villageId).trim();

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        provinceId,
        districtId,
        communeId,
        villageId,
        name, phone, province, district, commune, village, roadNumber: roadNumber || null,
        street: street || null, city: city || null, state: state || null, country: country || 'KH', zipCode: zipCode || null, note: note || null, isDefault: !!isDefault,
      },
    });

    res.json({ success: true, message: addressMsg('addressUpdated', lang), data: address });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lang = getRequestLang(req);
    const id = String(req.params.id);

    const existing = await prisma.address.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) throw new AppError(addressMsg('addressNotFound', lang), 404);

    await prisma.address.delete({ where: { id } });
    res.json({ success: true, message: addressMsg('addressDeleted', lang) });
  } catch (error) {
    next(error);
  }
};

export const getWishlist = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lang = resolveLang(req.query.lang);
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.user!.id },
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, price: true, comparePrice: true,
            thumbnail: true, rating: true, reviewCount: true, stock: true,
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      success: true,
      data: wishlist.map((item) => ({
        ...item,
        product: item.product
          ? {
              ...item.product,
              name: localizeProductName(item.product.slug, item.product.name, lang),
            }
          : item.product,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const toggleWishlist = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.body;

    if (!productId) throw new AppError('Product ID is required', 400);

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId: req.user!.id, productId } },
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: { userId_productId: { userId: req.user!.id, productId } },
      });
      res.json({ success: true, message: 'Removed from wishlist', inWishlist: false });
    } else {
      await prisma.wishlist.create({ data: { userId: req.user!.id, productId } });
      res.json({ success: true, message: 'Added to wishlist', inWishlist: true });
    }
  } catch (error) {
    next(error);
  }
};

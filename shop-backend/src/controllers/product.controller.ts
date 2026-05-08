import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateSlug, paginate, paginateResponse, str } from '../utils/helpers';
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

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '12',
      category,
      search,
      minPrice,
      maxPrice,
      sort = 'createdAt',
      order = 'desc',
      featured,
      brand,
      rating,
    } = req.query;

    const { skip, take, page: pageNum, limit: limitNum } = paginate(
      Number(page),
      Number(limit)
    );

    const categoryStr = str(category as unknown);
    const searchStr = str(search as unknown);
    const brandStr = str(brand as unknown);
    const sortStr = str(sort as unknown) || 'createdAt';
    const orderStr = str(order as unknown) || 'desc';
    const lang = resolveLang(req.query.lang);

    const where: Record<string, unknown> = { isActive: true };

    if (categoryStr) where.category = { slug: categoryStr };
    if (featured === 'true') where.isFeatured = true;
    if (brandStr) where.brand = { contains: brandStr };
    if (searchStr) {
      where.OR = [
        { name: { contains: searchStr } },
        { description: { contains: searchStr } },
        { brand: { contains: searchStr } },
        { tags: { has: searchStr } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, unknown>).gte = Number(str(minPrice as unknown));
      if (maxPrice) (where.price as Record<string, unknown>).lte = Number(str(maxPrice as unknown));
    }
    if (rating) where.rating = { gte: Number(str(rating as unknown)) };

    const validSortFields = ['price', 'rating', 'createdAt', 'soldCount', 'name'];
    const sortField = validSortFields.includes(sortStr) ? sortStr : 'createdAt';
    const sortOrder = orderStr === 'asc' ? 'asc' : 'desc';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: sortOrder },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          thumbnail: true,
          images: true,
          rating: true,
          reviewCount: true,
          stock: true,
          isFeatured: true,
          brand: true,
          soldCount: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const localizedProducts = products.map((p) => ({
      ...p,
      name: localizeProductName(p.slug, p.name, lang),
    }));

    res.json({
      success: true,
      ...paginateResponse(localizedProducts, total, pageNum, limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slug = String(req.params.slug);
    const lang = resolveLang(req.query.lang);

    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } },
        variants: true,
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!product) throw new AppError('Product not found', 404);

    res.json({
      success: true,
      data: {
        ...product,
        name: localizeProductName(product.slug, product.name, lang),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      description,
      shortDesc,
      price,
      comparePrice,
      costPrice,
      sku,
      stock,
      categoryId,
      brand,
      tags,
      images,
      thumbnail,
      isFeatured,
      variants,
      weight,
      dimensions,
    } = req.body;

    if (!name || !description || !price || !categoryId) {
      throw new AppError('Name, description, price and category are required', 400);
    }

    const slug = await generateUniqueSlug(name);

    const variantRows = Array.isArray(variants)
      ? variants
          .filter((v: { name?: string; value?: string }) => String(v?.name || '').trim() && String(v?.value || '').trim())
          .map((v: { name: string; value: string; stock?: number; price?: number }) => ({
            name: v.name.trim(),
            value: v.value.trim(),
            stock: Number(v.stock) || 0,
            price: v.price != null ? Number(v.price) : null,
          }))
      : [];

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        shortDesc,
        price: Number(price),
        comparePrice: comparePrice ? Number(comparePrice) : null,
        costPrice: costPrice ? Number(costPrice) : null,
        sku,
        stock: Number(stock) || 0,
        categoryId,
        brand,
        tags: tags || [],
        images: (images || []) as string[],
        thumbnail,
        isFeatured: Boolean(isFeatured),
        weight: weight ? Number(weight) : null,
        dimensions,
        variants: variantRows.length ? { create: variantRows } : undefined,
      },
      include: { category: true, variants: true },
    });

    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (error) {
    next(error);
  }
};

/** Fields allowed on Product updates (ignores UI-only keys like imagesStr from the admin form). */
const PRODUCT_SCALAR_UPDATE_KEYS = new Set([
  'name',
  'description',
  'shortDesc',
  'price',
  'comparePrice',
  'costPrice',
  'sku',
  'barcode',
  'stock',
  'lowStockAlert',
  'weight',
  'dimensions',
  'images',
  'thumbnail',
  'categoryId',
  'brand',
  'tags',
  'isFeatured',
  'isActive',
  'metaTitle',
  'metaDesc',
]);

export const updateProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { variants } = req.body;

    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => PRODUCT_SCALAR_UPDATE_KEYS.has(k))
    ) as Record<string, unknown>;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new AppError('Product not found', 404);

    if (updates.name && updates.name !== existing.name) {
      updates.slug = await generateUniqueSlug(String(updates.name), id);
    }

    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.comparePrice !== undefined) updates.comparePrice = Number(updates.comparePrice);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
    if (updates.isFeatured !== undefined) updates.isFeatured = Boolean(updates.isFeatured);
    if (updates.isActive !== undefined) updates.isActive = Boolean(updates.isActive);

    const updateData: Record<string, unknown> = { ...updates };
    if (variants !== undefined) {
      const variantRows = Array.isArray(variants)
        ? variants
            .filter((v: { name?: string; value?: string }) => String(v?.name || '').trim() && String(v?.value || '').trim())
            .map((v: { name: string; value: string; stock?: number; price?: number }) => ({
              name: String(v.name).trim(),
              value: String(v.value).trim(),
              stock: Number(v.stock) || 0,
              price: v.price != null ? Number(v.price) : null,
            }))
        : [];
      updateData.variants = {
        deleteMany: {},
        create: variantRows,
      };
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, variants: true },
    });

    res.json({ success: true, message: 'Product updated', data: product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lang = resolveLang(req.query.lang);
    const products = await prisma.product.findMany({
      where: { isFeatured: true, isActive: true },
      take: 8,
      orderBy: { soldCount: 'desc' },
      select: {
        id: true, name: true, slug: true, price: true, comparePrice: true,
        thumbnail: true, images: true, rating: true, reviewCount: true,
        stock: true, brand: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    res.json({
      success: true,
      data: products.map((p) => ({
        ...p,
        name: localizeProductName(p.slug, p.name, lang),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getRelatedProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slug = String(req.params.slug);
    const lang = resolveLang(req.query.lang);

    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) throw new AppError('Product not found', 404);

    const related = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
      },
      take: 6,
      orderBy: { rating: 'desc' },
      select: {
        id: true, name: true, slug: true, price: true, comparePrice: true,
        thumbnail: true, rating: true, reviewCount: true, brand: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    res.json({
      success: true,
      data: related.map((p) => ({
        ...p,
        name: localizeProductName(p.slug, p.name, lang),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/** Admin catalog: all products (active + inactive), optional filters. */
export const getAdminProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '50',
      search,
      featured,
      active,
    } = req.query;

    const { skip, take, page: pageNum, limit: limitNum } = paginate(Number(page), Number(limit));

    const where: Record<string, unknown> = {};

    if (featured === 'true') where.isFeatured = true;
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    const searchStr = str(search);
    if (searchStr) {
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { brand: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      ...paginateResponse(products, total, pageNum, limitNum),
    });
  } catch (error) {
    next(error);
  }
};

async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  let slug = generateSlug(name);
  let counter = 0;

  while (true) {
    const testSlug = counter === 0 ? slug : `${slug}-${counter}`;
    const existing = await prisma.product.findUnique({ where: { slug: testSlug } });

    if (!existing || existing.id === excludeId) {
      return testSlug;
    }
    counter++;
  }
}


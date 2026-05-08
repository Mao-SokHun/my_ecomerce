import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateSlug } from '../utils/helpers';

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null, deletedAt: null },
      include: {
        children: {
          where: { isActive: true, deletedAt: null },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const allCategoryIds = categories.flatMap((cat) => [cat.id, ...cat.children.map((child) => child.id)]);
    const productCountRows = await prisma.product.groupBy({
      by: ['categoryId'],
      where: {
        categoryId: { in: allCategoryIds },
        isActive: true,
      },
      _count: { _all: true },
    });

    const countByCategoryId = new Map<string, number>(
      productCountRows.map((row) => [row.categoryId, row._count._all])
    );

    const data = categories.map((cat) => {
      const selfCount = countByCategoryId.get(cat.id) || 0;
      const childrenCount = cat.children.reduce(
        (sum, child) => sum + (countByCategoryId.get(child.id) || 0),
        0
      );

      return {
        ...cat,
        totalProducts: selfCount + childrenCount,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slug = String(req.params.slug);

    const category = await prisma.category.findUnique({
      where: { slug }, // Note: we should theoretically check deletedAt but findUnique requires uniqueness. Since slug is unique, we find it and check deletedAt after.
      include: {
        children: { where: { isActive: true, deletedAt: null } },
        _count: { select: { products: true } },
      },
    });

    if (!category || category.deletedAt) throw new AppError('Category not found', 404);

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, image, parentId, sortOrder } = req.body;

    if (!name) throw new AppError('Category name is required', 400);

    const slug = generateSlug(name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) throw new AppError('Category with this name already exists', 409);

    const category = await prisma.category.create({
      data: { name, slug, description, image, parentId, sortOrder: sortOrder || 0 },
    });

    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, image, isActive, sortOrder, parentId } = req.body;

    const category = await prisma.category.update({
      where: { id: String(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
    });

    res.json({ success: true, message: 'Category updated', data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const productCount = await prisma.product.count({ where: { categoryId: String(id) } });
    if (productCount > 0) {
      throw new AppError('Cannot delete category with existing products', 400);
    }

    await prisma.category.update({ 
      where: { id: String(id) },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: (req as any).user?.id || 'admin'
      }
    });

    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

/** Full category list for admin (includes inactive, excludes soft-deleted). */
export const getAdminCategories = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

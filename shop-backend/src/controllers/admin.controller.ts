import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { paginate, paginateResponse } from '../utils/helpers';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalOrders,
      totalOrdersLastMonth,
      totalRevenue,
      totalRevenueLastMonth,
      totalUsers,
      totalUsersLastMonth,
      totalProducts,
      recentOrders,
      topProducts,
      ordersByStatus,
      revenueByDay,
      lowStockCount,
      stockValueAgg,
      inventoryAgg,
      lowStockProducts,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID', createdAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { total: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          items: { select: { name: true, quantity: true } },
        },
      }),
      prisma.product.findMany({
        take: 5,
        orderBy: { soldCount: 'desc' },
        select: { id: true, name: true, thumbnail: true, price: true, soldCount: true, stock: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.$queryRaw<{ date: Date; revenue: number }[]>`
        SELECT ("createdAt")::date AS date, SUM("total")::float AS revenue
        FROM orders
        WHERE "paymentStatus" = 'PAID'::"PaymentStatus"
        AND "createdAt" >= ${startOfMonth}
        GROUP BY ("createdAt")::date
        ORDER BY date ASC
      `,
      prisma.product.count({ where: { isActive: true, stock: { lte: 5 } } }),
      prisma.product.aggregate({
        where: { isActive: true },
        _sum: { stock: true },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { stock: true, price: true, costPrice: true, soldCount: true },
      }),
      prisma.product.findMany({
        where: { isActive: true, stock: { lte: 5 } },
        orderBy: { stock: 'asc' },
        take: 8,
        select: { id: true, name: true, stock: true, thumbnail: true },
      }),
    ]);

    const monthGrowth = (current: number, last: number) =>
      last === 0 ? 100 : Math.round(((current - last) / last) * 100);

    const inventoryValue = inventoryAgg.reduce((sum, p) => sum + (p.stock || 0) * (p.costPrice || 0), 0);
    const estimatedRevenueIfSold = inventoryAgg.reduce((sum, p) => sum + (p.stock || 0) * (p.price || 0), 0);
    const realizedGrossProfit = inventoryAgg.reduce(
      (sum, p) => sum + ((p.price || 0) - (p.costPrice || 0)) * (p.soldCount || 0),
      0
    );

    const actorRole = req.user?.role;
    const canSeeFinancials = actorRole === 'SUPER_ADMIN';
    const canSeeOrders = actorRole !== 'WAREHOUSE';

    res.json({
      success: true,
      data: {
        overview: {
          orders: canSeeOrders
            ? {
                value: totalOrders,
                growth: monthGrowth(totalOrders, totalOrdersLastMonth),
              }
            : { value: 0, growth: 0 },
          revenue: canSeeFinancials
            ? {
                value: totalRevenue._sum.total || 0,
                growth: monthGrowth(
                  totalRevenue._sum.total || 0,
                  totalRevenueLastMonth._sum.total || 0
                ),
              }
            : { value: 0, growth: 0 },
          users: {
            value: totalUsers,
            growth: monthGrowth(totalUsers, totalUsersLastMonth),
          },
          products: { value: totalProducts },
          stock: {
            lowStockCount,
            totalUnits: stockValueAgg._sum.stock || 0,
            inventoryValue: canSeeFinancials ? inventoryValue : 0,
            estimatedRevenueIfSold: canSeeFinancials ? estimatedRevenueIfSold : 0,
          },
          profit: {
            realizedGrossProfit: canSeeFinancials ? realizedGrossProfit : 0,
          },
        },
        recentOrders: canSeeOrders ? recentOrders : [],
        topProducts,
        lowStockProducts,
        ordersByStatus: canSeeOrders
          ? ordersByStatus.map((s) => ({
              status: s.status,
              count: s._count.status,
            }))
          : [],
        revenueByDay: canSeeFinancials ? revenueByDay : [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, role } = req.query;
    const { skip, take, page: pageNum, limit: limitNum } = paginate(Number(page), Number(limit));

    const where: Record<string, unknown> = {};
    if (role) where.role = String(role);
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, staffRole: true, isActive: true,
          avatar: true, phone: true, createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, ...paginateResponse(users, total, pageNum, limitNum) });
  } catch (error) {
    next(error);
  }
};

const VALID_STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CASHIER', 'WAREHOUSE'] as const;
type ValidStaffRole = typeof VALID_STAFF_ROLES[number];

export const createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actorRole = req.user?.role;
    if (actorRole === 'CASHIER' || actorRole === 'WAREHOUSE') {
      throw new AppError('Cashier and Warehouse staff cannot create accounts', 403);
    }

    const { name, email, phone, password, role = 'USER', staffRole } = req.body;

    if (!name || !password) {
      throw new AppError('Name and password are required', 400);
    }
    if (!email && !phone) {
      throw new AppError('Either email or phone is required', 400);
    }

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
      if (existing) throw new AppError('Email already registered', 400);
    }

    if (phone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone: String(phone) } });
      if (existingPhone) throw new AppError('Phone number already registered', 400);
    }

    // Validate staff role assignment hierarchy
    const validStaffRole: ValidStaffRole | null =
      staffRole && VALID_STAFF_ROLES.includes(staffRole as ValidStaffRole)
        ? (staffRole as ValidStaffRole)
        : null;
    const dbRole = validStaffRole || (role === 'ADMIN' ? 'ADMIN' : 'USER');

    if (actorRole === 'ADMIN' && (dbRole === 'SUPER_ADMIN' || dbRole === 'ADMIN')) {
      throw new AppError('Store Admin can only create Cashier or Warehouse accounts', 403);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email ? String(email).toLowerCase() : null,
        phone: phone ? String(phone) : null,
        password: hashedPassword,
        role: dbRole as Parameters<typeof prisma.user.create>[0]['data']['role'],
        staffRole: validStaffRole ?? undefined,
        isActive: true,
        emailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actorRole = req.user?.role;
    if (actorRole === 'CASHIER' || actorRole === 'WAREHOUSE') {
      throw new AppError('Cashier and Warehouse staff cannot modify accounts', 403);
    }

    const id = String(req.params.id);
    const { role, isActive, staffRole } = req.body;

    if (id === req.user!.id) {
      throw new AppError('Cannot modify your own admin account', 400);
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new AppError('User not found', 404);
    }

    if (target.role === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') {
      throw new AppError('Only Super Admin can modify Super Admin accounts', 403);
    }

    if (actorRole === 'ADMIN') {
      if (target.role === 'ADMIN') {
        throw new AppError('Store Admin cannot modify other Admin accounts', 403);
      }
      if (role === 'SUPER_ADMIN' || role === 'ADMIN' || staffRole === 'SUPER_ADMIN' || staffRole === 'ADMIN') {
        throw new AppError('Store Admin cannot assign Super Admin or Admin permissions', 403);
      }
    }

    const validStaffRole: ValidStaffRole | null =
      staffRole && VALID_STAFF_ROLES.includes(staffRole as ValidStaffRole)
        ? (staffRole as ValidStaffRole)
        : staffRole === null ? null : undefined as unknown as null;

    const updateData: Record<string, unknown> = { isActive };
    if (role !== undefined) updateData.role = role;
    if (staffRole !== undefined) {
      updateData.staffRole = validStaffRole;
      // Set DB role directly to specific staff role (SUPER_ADMIN, ADMIN, CASHIER, WAREHOUSE)
      if (validStaffRole) updateData.role = validStaffRole;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.user.update>[0]['data'],
      select: { id: true, name: true, email: true, role: true, staffRole: true, isActive: true },
    });

    res.json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actorRole = req.user?.role;
    if (actorRole === 'CASHIER' || actorRole === 'WAREHOUSE') {
      throw new AppError('Cashier and Warehouse staff cannot deactivate accounts', 403);
    }

    const id = String(req.params.id);

    if (id === req.user!.id) throw new AppError('Cannot delete your own account', 400);

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new AppError('User not found', 404);

    if (target.role === 'SUPER_ADMIN') {
      throw new AppError('Super Admin accounts cannot be deactivated', 403);
    }
    if (target.role === 'ADMIN' && actorRole !== 'SUPER_ADMIN') {
      throw new AppError('Only Super Admin can deactivate Store Admin accounts', 403);
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, description, discountType, discount, minOrder, maxDiscount, usageLimit, expiresAt } = req.body;

    if (!code || !discountType || !discount) {
      throw new AppError('Code, discount type and discount are required', 400);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType,
        discount: Number(discount),
        minOrder: minOrder ? Number(minOrder) : null,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
  } catch (error) {
    next(error);
  }
};

export const getCoupons = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { code, description, discountType, discount, minOrder, maxDiscount, usageLimit, expiresAt, isActive } = req.body;
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: code ? String(code).toUpperCase() : undefined,
        description: typeof description === 'string' ? description : undefined,
        discountType: discountType || undefined,
        discount: typeof discount !== 'undefined' ? Number(discount) : undefined,
        minOrder: typeof minOrder !== 'undefined' ? (minOrder === null || minOrder === '' ? null : Number(minOrder)) : undefined,
        maxDiscount: typeof maxDiscount !== 'undefined' ? (maxDiscount === null || maxDiscount === '' ? null : Number(maxDiscount)) : undefined,
        usageLimit: typeof usageLimit !== 'undefined' ? (usageLimit === null || usageLimit === '' ? null : Number(usageLimit)) : undefined,
        expiresAt: typeof expiresAt !== 'undefined' ? (expiresAt ? new Date(expiresAt) : null) : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    });
    res.json({ success: true, message: 'Coupon updated', data: coupon });
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.coupon.delete({ where: { id } });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    next(error);
  }
};

export const getAdvertisements = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ads = await prisma.advertisement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: ads });
  } catch (error) {
    next(error);
  }
};

export const getSellerProfiles = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { products: true } },
      },
    });
    res.json({ success: true, data: sellers });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCounts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.user!.id;
    const adminMeta = await prisma.user.findUnique({
      where: { id: adminId },
      select: {
        lastSeenLeadsAt: true,
        lastSeenOrdersAt: true,
        lastSeenUsersAt: true,
        lastSeenSupportAt: true,
      },
    });
    const [orders, users, leads, lowStock, support] = await Promise.all([
      prisma.order.count({
        where: adminMeta?.lastSeenOrdersAt
          ? { createdAt: { gt: adminMeta.lastSeenOrdersAt } }
          : undefined,
      }),
      prisma.user.count({
        where: adminMeta?.lastSeenUsersAt
          ? { createdAt: { gt: adminMeta.lastSeenUsersAt } }
          : undefined,
      }),
      prisma.lead.count({
        where: adminMeta?.lastSeenLeadsAt
          ? { createdAt: { gt: adminMeta.lastSeenLeadsAt } }
          : undefined,
      }),
      prisma.product.count({
        where: { isActive: true, stock: { lte: 5 } },
      }),
      prisma.supportInquiry.count({
        where: {
          status: 'open',
          ...(adminMeta?.lastSeenSupportAt
            ? { updatedAt: { gt: adminMeta.lastSeenSupportAt } }
            : {}),
        },
      }),
    ]);

    res.json({ success: true, data: { orders, users, leads, lowStock, support } });
  } catch (error) {
    next(error);
  }
};

export const markSeen = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.user!.id;
    const type = String(req.body?.type || '');
    const now = new Date();
    const data: { lastSeenOrdersAt?: Date; lastSeenUsersAt?: Date; lastSeenLeadsAt?: Date; lastSeenSupportAt?: Date } = {};
    if (type === 'orders') data.lastSeenOrdersAt = now;
    else if (type === 'users') data.lastSeenUsersAt = now;
    else if (type === 'leads') data.lastSeenLeadsAt = now;
    else if (type === 'support') data.lastSeenSupportAt = now;
    else {
      res.status(400).json({ success: false, message: 'Invalid type' });
      return;
    }
    await prisma.user.update({
      where: { id: adminId },
      data,
    });
    res.json({ success: true, message: 'Marked as seen' });
  } catch (error) {
    next(error);
  }
};

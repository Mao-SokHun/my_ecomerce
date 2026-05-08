import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getMyReviews = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, slug: true, thumbnail: true } },
      },
    });
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};

export const getProductReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = String(req.params.productId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sort = String(req.query.sort || 'createdAt');
    const skip = (page - 1) * limit;

    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where: { productId, isApproved: true },
        skip,
        take: limit,
        orderBy: sort === 'helpful' ? { helpfulCount: 'desc' } : { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.review.count({ where: { productId, isApproved: true } }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId, isApproved: true },
        _count: { rating: true },
      }),
    ]);

    const ratingBreakdown = [5, 4, 3, 2, 1].map((r) => ({
      rating: r,
      count: stats.find((s) => s.rating === r)?._count.rating || 0,
    }));

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      ratingBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = String(req.params.productId);
    const { rating, title, comment, images } = req.body;

    if (!rating || !comment) throw new AppError('Rating and comment are required', 400);
    if (rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5', 400);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError('Product not found', 404);

    // Check if user has purchased the product
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId: req.user!.id, status: 'DELIVERED' },
      },
    });

    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId: req.user!.id, productId } },
    });
    if (existing) throw new AppError('You have already reviewed this product', 409);

    const review = await prisma.review.create({
      data: {
        userId: req.user!.id,
        productId,
        rating: Number(rating),
        title,
        comment,
        images: images || [],
        isVerified: !!hasPurchased,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    // Update product rating
    const allReviews = await prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: allReviews._avg.rating || 0,
        reviewCount: allReviews._count.rating,
      },
    });

    res.status(201).json({ success: true, message: 'Review submitted', data: review });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reviewId = String(req.params.reviewId);
    const { rating, title, comment } = req.body;

    const review = await prisma.review.findFirst({
      where: { id: reviewId, userId: req.user!.id },
    });
    if (!review) throw new AppError('Review not found', 404);

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { rating: Number(rating), title, comment },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    res.json({ success: true, message: 'Review updated', data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reviewId = String(req.params.reviewId);

    const where: Record<string, unknown> = { id: reviewId };
    if (req.user!.role !== 'ADMIN') where.userId = req.user!.id;

    await prisma.review.delete({ where: { id: reviewId } });

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

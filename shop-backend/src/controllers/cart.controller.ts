import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const getCartWithItems = (userId: string) =>
  prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, price: true, comparePrice: true,
              thumbnail: true, stock: true, isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

export const getCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let cart = await getCartWithItems(req.user!.id);

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user!.id },
        include: { items: { include: { product: true } } },
      });
    }

    const cartTotal = cart.items.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      data: { ...cart, cartTotal, itemCount },
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId, quantity = 1, variantId } = req.body;

    if (!productId) throw new AppError('Product ID is required', 400);
    if (quantity < 1) throw new AppError('Quantity must be at least 1', 400);

    const product = await prisma.product.findUnique({ where: { id: productId, isActive: true } });
    if (!product) throw new AppError('Product not found', 404);
    if (product.stock < quantity) throw new AppError('Insufficient stock', 400);

    let cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.user!.id } });
    }

    const variantIdValue: string | null = variantId ? String(variantId) : null;

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: String(productId), variantId: variantIdValue ?? undefined },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.stock < newQty) throw new AppError('Insufficient stock', 400);

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: String(productId), quantity, variantId: variantIdValue ?? undefined },
      });
    }

    const updatedCart = await getCartWithItems(req.user!.id);
    const cartTotal = updatedCart!.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const itemCount = updatedCart!.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      message: 'Item added to cart',
      data: { ...updatedCart, cartTotal, itemCount },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const itemId = String(req.params.itemId);
    const { quantity } = req.body;

    if (quantity < 1) throw new AppError('Quantity must be at least 1', 400);

    const cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
    if (!cart) throw new AppError('Cart not found', 404);

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) throw new AppError('Cart item not found', 404);

    const itemProduct = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!itemProduct || itemProduct.stock < quantity) throw new AppError('Insufficient stock', 400);

    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });

    const updatedCart = await getCartWithItems(req.user!.id);
    const cartTotal = updatedCart!.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const itemCount = updatedCart!.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ success: true, message: 'Cart updated', data: { ...updatedCart, cartTotal, itemCount } });
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const itemId = String(req.params.itemId);

    const cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
    if (!cart) throw new AppError('Cart not found', 404);

    await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });

    const updatedCart = await getCartWithItems(req.user!.id);
    const cartTotal = updatedCart!.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const itemCount = updatedCart!.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ success: true, message: 'Item removed', data: { ...updatedCart, cartTotal, itemCount } });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};

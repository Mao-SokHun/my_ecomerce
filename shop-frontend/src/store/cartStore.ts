import { create } from 'zustand';
import { Cart, CartItem } from '@/types';
import { cartApi } from '@/lib/api';

const GUEST_CART_KEY = 'guest-cart-v1';

type CartProductSnapshot = {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnail?: string;
  stock: number;
  isActive?: boolean;
};

function emptyGuestCart(): Cart {
  return { id: 'guest-cart', userId: 'guest', items: [], cartTotal: 0, itemCount: 0 };
}

function normalizeGuestCart(cart: Cart): Cart {
  const items = cart.items.filter((item) => item.quantity > 0);
  const cartTotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { ...cart, items, cartTotal, itemCount };
}

function loadGuestCart(): Cart {
  if (typeof window === 'undefined') return emptyGuestCart();
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return emptyGuestCart();
    const parsed = JSON.parse(raw) as Cart;
    return normalizeGuestCart(parsed);
  } catch {
    return emptyGuestCart();
  }
}

function saveGuestCart(cart: Cart) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(normalizeGuestCart(cart)));
}

function clearGuestCartStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_CART_KEY);
}

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  isOpen: boolean;

  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, variantId?: string, productSnapshot?: CartProductSnapshot) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getItemCount: () => number;
  getCartTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  isOpen: false,

  fetchCart: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ cart: loadGuestCart() });
      return;
    }

    set({ isLoading: true });
    try {
      const guest = loadGuestCart();
      if (guest.items.length > 0) {
        for (const item of guest.items) {
          await cartApi.add({
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId,
          });
        }
        clearGuestCartStorage();
      }
      const { data } = await cartApi.get();
      set({ cart: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, quantity = 1, variantId, productSnapshot) => {
    const token = localStorage.getItem('token');
    if (!token) {
      const base = get().cart || loadGuestCart();
      const key = `guest-${productId}-${variantId || 'default'}`;
      const idx = base.items.findIndex((it) => it.id === key);

      if (idx >= 0) {
        const next = { ...base };
        next.items = [...next.items];
        const current = next.items[idx];
        const maxStock = current.product.stock || 9999;
        next.items[idx] = { ...current, quantity: Math.min(maxStock, current.quantity + quantity) };
        const normalized = normalizeGuestCart(next);
        saveGuestCart(normalized);
        set({ cart: normalized, isOpen: true });
        return;
      }

      if (!productSnapshot) {
        throw new Error('Missing product data for guest cart');
      }

      const newItem: CartItem = {
        id: key,
        cartId: 'guest-cart',
        productId,
        quantity,
        variantId,
        product: {
          id: productSnapshot.id,
          name: productSnapshot.name,
          slug: productSnapshot.slug,
          price: productSnapshot.price,
          comparePrice: productSnapshot.comparePrice,
          thumbnail: productSnapshot.thumbnail,
          stock: productSnapshot.stock,
          isActive: productSnapshot.isActive ?? true,
        },
      };
      const normalized = normalizeGuestCart({ ...base, items: [...base.items, newItem] });
      saveGuestCart(normalized);
      set({ cart: normalized, isOpen: true });
      return;
    }

    set({ isLoading: true });
    try {
      const { data } = await cartApi.add({ productId, quantity, variantId });
      set({ cart: data.data, isLoading: false, isOpen: true });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateItem: async (itemId, quantity) => {
    const token = localStorage.getItem('token');
    if (!token) {
      const base = get().cart || loadGuestCart();
      const next = {
        ...base,
        items: base.items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
      };
      const normalized = normalizeGuestCart(next);
      saveGuestCart(normalized);
      set({ cart: normalized });
      return;
    }

    set({ isLoading: true });
    try {
      const { data } = await cartApi.update(itemId, quantity);
      set({ cart: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  removeItem: async (itemId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      const base = get().cart || loadGuestCart();
      const next = { ...base, items: base.items.filter((item) => item.id !== itemId) };
      const normalized = normalizeGuestCart(next);
      saveGuestCart(normalized);
      set({ cart: normalized });
      return;
    }

    set({ isLoading: true });
    try {
      const { data } = await cartApi.remove(itemId);
      set({ cart: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearCart: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      clearGuestCartStorage();
      set({ cart: emptyGuestCart(), isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      await cartApi.clear();
      set({
        cart: get().cart ? { ...get().cart!, items: [], cartTotal: 0, itemCount: 0 } : null,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  getItemCount: () => get().cart?.itemCount || 0,

  getCartTotal: () => get().cart?.cartTotal || 0,
}));

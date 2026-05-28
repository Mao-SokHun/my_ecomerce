import { create } from 'zustand';
import { cartApi } from '@/lib/api';
import type { Cart } from '@/types';

type State = {
  cart: Cart | null;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  itemCount: () => number;
};

export const useCartStore = create<State>((set, get) => ({
  cart: null,
  isLoading: false,

  itemCount: () => get().cart?.itemCount ?? 0,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await cartApi.get();
      set({ cart: data.data, isLoading: false });
    } catch {
      set({ cart: null, isLoading: false });
    }
  },

  addItem: async (productId, quantity = 1) => {
    set({ isLoading: true });
    try {
      await cartApi.add({ productId, quantity });
      await get().fetchCart();
    } finally {
      set({ isLoading: false });
    }
  },

  updateItem: async (itemId, quantity) => {
    await cartApi.update(itemId, quantity);
    await get().fetchCart();
  },

  removeItem: async (itemId) => {
    await cartApi.remove(itemId);
    await get().fetchCart();
  },
}));

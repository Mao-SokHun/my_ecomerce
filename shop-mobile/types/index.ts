export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  totalProducts?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc?: string;
  price: number;
  comparePrice?: number;
  stock: number;
  images: string[];
  thumbnail?: string;
  category: { id: string; name: string; slug: string };
  brand?: string;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  variants?: Array<{ id: string; name: string; value: string; price?: number; stock: number }>;
}

export interface CartItem {
  id: string;
  quantity: number;
  product: Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'comparePrice' | 'thumbnail' | 'stock'>;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: Pagination;
}

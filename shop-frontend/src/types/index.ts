export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  provider?: 'LOCAL' | 'GOOGLE' | 'FACEBOOK';
  role: 'USER' | 'ADMIN';
  isActive?: boolean;
  createdAt: string;
  _count?: { orders: number; reviews: number; wishlist: number; addresses: number };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  isActive: boolean;
  sortOrder: number;
  _count?: { products: number };
  totalProducts?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  value: string;
  price?: number;
  stock: number;
  sku?: string;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  stock: number;
  images: string[];
  thumbnail?: string;
  categoryId: string;
  category: Pick<Category, 'id' | 'name' | 'slug'> & { parent?: Pick<Category, 'id' | 'name' | 'slug'> };
  brand?: string;
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  user: { id: string; name: string; avatar?: string };
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  variantId?: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice?: number;
    thumbnail?: string;
    stock: number;
    isActive: boolean;
  };
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  cartTotal: number;
  itemCount: number;
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  provinceId?: string;
  districtId?: string;
  communeId?: string;
  villageId?: string;
  province?: string;
  district?: string;
  commune?: string;
  village?: string;
  roadNumber?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  note?: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  variant?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  /** Courier chosen at checkout: VET | JNT */
  shippingCarrier?: string | null;
  tax: number;
  total: number;
  notes?: string;
  shippingAddress?: Partial<Address>;
  trackingNumber?: string;
  items: OrderItem[];
  address?: Address;
  user?: Partial<User>;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  invoiceNumber: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  shippingAddress: string;
  paymentMethod: string;
  /** Display label from API (English), e.g. "Paid by Bakong (KHQR)" */
  paymentTypeLabel?: string;
  paymentStatus: string;
  note?: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  shippingCarrier?: string | null;
  shippingCarrierLabel?: string | null;
  tax: number;
  total: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    lineTotal: number;
  }>;
  textInvoice: string;
  htmlInvoice: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: Pagination;
  error?: string;
}

/** Homepage trust strip — editable in Admin → Homepage (km/en/zh). */
export interface TrustBadgeCard {
  iconKey: string;
  titleKm: string;
  titleEn: string;
  titleZh: string;
  descKm: string;
  descEn: string;
  descZh: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  order?: string;
  rating?: number;
  brand?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

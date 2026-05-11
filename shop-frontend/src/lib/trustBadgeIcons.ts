import type { LucideIcon } from 'lucide-react';
import {
  Truck,
  ShieldCheck,
  RefreshCw,
  Headphones,
  Package,
  CreditCard,
  Award,
  Clock,
  Mail,
  Phone,
  Sparkles,
  Zap,
  ShoppingBag,
  Heart,
  Globe,
} from 'lucide-react';

/** Allowed icons for trust badges (admin dropdown + storefront resolve). */
export const TRUST_BADGE_ICON_MAP: Record<string, LucideIcon> = {
  truck: Truck,
  'shield-check': ShieldCheck,
  'refresh-cw': RefreshCw,
  headphones: Headphones,
  package: Package,
  'credit-card': CreditCard,
  award: Award,
  clock: Clock,
  mail: Mail,
  phone: Phone,
  zap: Zap,
  'shopping-bag': ShoppingBag,
  heart: Heart,
  globe: Globe,
};

export const TRUST_BADGE_ICON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'truck', label: 'Truck — shipping' },
  { value: 'shield-check', label: 'Shield — secure' },
  { value: 'refresh-cw', label: 'Refresh — returns' },
  { value: 'headphones', label: 'Headphones — support' },
  { value: 'package', label: 'Package' },
  { value: 'credit-card', label: 'Credit card' },
  { value: 'award', label: 'Award' },
  { value: 'clock', label: 'Clock' },
  { value: 'mail', label: 'Mail' },
  { value: 'phone', label: 'Phone' },
  { value: 'zap', label: 'Zap' },
  { value: 'shopping-bag', label: 'Shopping bag' },
  { value: 'heart', label: 'Heart' },
  { value: 'globe', label: 'Globe' },
];

export function resolveTrustBadgeIcon(iconKey: string): LucideIcon {
  const Icon = TRUST_BADGE_ICON_MAP[iconKey];
  return Icon ?? Sparkles;
}

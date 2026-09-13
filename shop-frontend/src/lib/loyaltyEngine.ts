'use client';

export type MembershipTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TierBenefit {
  tier: MembershipTier;
  labelKm: string;
  labelEn: string;
  minSpend: number;
  pointsMultiplier: number;
  discountPercentage: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  gradient: string;
  icon: string;
}

export const MEMBERSHIP_TIERS: Record<MembershipTier, TierBenefit> = {
  BRONZE: {
    tier: 'BRONZE',
    labelKm: 'សមាជិកសំរឹទ្ធ (Bronze)',
    labelEn: 'Bronze Member',
    minSpend: 0,
    pointsMultiplier: 1.0,
    discountPercentage: 0,
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-300/60 dark:border-amber-700/60',
    gradient: 'from-amber-700 via-amber-600 to-amber-800',
    icon: '🥉',
  },
  SILVER: {
    tier: 'SILVER',
    labelKm: 'សមាជិកប្រាក់ (Silver VIP)',
    labelEn: 'Silver VIP',
    minSpend: 200,
    pointsMultiplier: 1.2,
    discountPercentage: 1,
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-800 dark:text-slate-200',
    badgeBorder: 'border-slate-300/80 dark:border-slate-600',
    gradient: 'from-slate-400 via-slate-500 to-slate-600',
    icon: '🥈',
  },
  GOLD: {
    tier: 'GOLD',
    labelKm: 'សមាជិកមាស (Gold VIP)',
    labelEn: 'Gold VIP',
    minSpend: 500,
    pointsMultiplier: 1.5,
    discountPercentage: 3,
    badgeBg: 'bg-yellow-100 dark:bg-yellow-950/60',
    badgeText: 'text-yellow-800 dark:text-yellow-300',
    badgeBorder: 'border-yellow-300/80 dark:border-yellow-700/60',
    gradient: 'from-yellow-500 via-amber-500 to-yellow-600',
    icon: '🥇',
  },
  PLATINUM: {
    tier: 'PLATINUM',
    labelKm: 'សមាជិកកិត្តិយស (Platinum VIP)',
    labelEn: 'Platinum Elite VIP',
    minSpend: 1000,
    pointsMultiplier: 2.0,
    discountPercentage: 5,
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    badgeBorder: 'border-indigo-300/80 dark:border-indigo-700/60',
    gradient: 'from-purple-600 via-indigo-600 to-blue-600',
    icon: '💎',
  },
};

/**
 * Calculates user membership tier based on total lifetime spend
 */
export function calculateMembershipTier(lifetimeSpend: number): TierBenefit {
  if (lifetimeSpend >= 1000) return MEMBERSHIP_TIERS.PLATINUM;
  if (lifetimeSpend >= 500) return MEMBERSHIP_TIERS.GOLD;
  if (lifetimeSpend >= 200) return MEMBERSHIP_TIERS.SILVER;
  return MEMBERSHIP_TIERS.BRONZE;
}

/**
 * Calculates next tier target and progress percentage
 */
export function calculateTierProgress(lifetimeSpend: number): {
  currentTier: TierBenefit;
  nextTier: TierBenefit | null;
  progressPercent: number;
  spendNeeded: number;
} {
  const currentTier = calculateMembershipTier(lifetimeSpend);
  let nextTier: TierBenefit | null = null;
  let spendNeeded = 0;
  let progressPercent = 100;

  if (currentTier.tier === 'BRONZE') {
    nextTier = MEMBERSHIP_TIERS.SILVER;
    spendNeeded = Math.max(0, 200 - lifetimeSpend);
    progressPercent = Math.min(100, Math.round((lifetimeSpend / 200) * 100));
  } else if (currentTier.tier === 'SILVER') {
    nextTier = MEMBERSHIP_TIERS.GOLD;
    spendNeeded = Math.max(0, 500 - lifetimeSpend);
    progressPercent = Math.min(100, Math.round(((lifetimeSpend - 200) / 300) * 100));
  } else if (currentTier.tier === 'GOLD') {
    nextTier = MEMBERSHIP_TIERS.PLATINUM;
    spendNeeded = Math.max(0, 1000 - lifetimeSpend);
    progressPercent = Math.min(100, Math.round(((lifetimeSpend - 500) / 500) * 100));
  }

  return {
    currentTier,
    nextTier,
    progressPercent,
    spendNeeded,
  };
}

/**
 * Points to USD conversion rate: 100 points = $1.00 USD
 */
export const POINTS_REDEMPTION_RATE = 100; // 100 pts = $1

export function pointsToUsd(points: number): number {
  return Math.floor(points / POINTS_REDEMPTION_RATE);
}

export function usdToPoints(usd: number, multiplier = 1.0): number {
  return Math.round(usd * multiplier);
}

// Local Storage helpers for Points & Rewards
const STORAGE_KEY_USER_POINTS = 'sh_user_reward_points';
const STORAGE_KEY_USER_LIFETIME = 'sh_user_lifetime_spend';

export function getUserPoints(userId?: string): number {
  if (typeof window === 'undefined') return 150; // default initial demo points
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY_USER_POINTS}_${userId || 'me'}`);
    if (saved !== null) return Number(saved);
  } catch {}
  return 150; // Welcome reward points
}

export function setUserPoints(points: number, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_USER_POINTS}_${userId || 'me'}`, String(Math.max(0, points)));
    window.dispatchEvent(new Event('points_updated'));
  } catch {}
}

export function getUserLifetimeSpend(userId?: string): number {
  if (typeof window === 'undefined') return 280; // default demo spend
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY_USER_LIFETIME}_${userId || 'me'}`);
    if (saved !== null) return Number(saved);
  } catch {}
  return 280;
}

export function addUserLifetimeSpend(amount: number, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getUserLifetimeSpend(userId);
    localStorage.setItem(`${STORAGE_KEY_USER_LIFETIME}_${userId || 'me'}`, String(current + amount));
    window.dispatchEvent(new Event('points_updated'));
  } catch {}
}

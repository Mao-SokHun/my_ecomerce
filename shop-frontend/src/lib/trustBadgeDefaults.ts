import type { TrustBadgeCard } from '@/types';

/** Default homepage trust strip — same content as former i18n-only badges (km / en / zh). */
export const DEFAULT_TRUST_BADGES: TrustBadgeCard[] = [
  {
    iconKey: 'truck',
    titleKm: 'ដឹកជញ្ជូនឥតគិតថ្លៃ',
    titleEn: 'Free Shipping',
    titleZh: '免运费',
    descKm: 'សម្រាប់ការកម្មង់លើស $50',
    descEn: 'On orders over $50',
    descZh: '订单满 $50',
  },
  {
    iconKey: 'shield-check',
    titleKm: 'ការទូទាត់មានសុវត្ថិភាព',
    titleEn: 'Secure Payment',
    titleZh: '安全支付',
    descKm: 'ការទូទាត់ការពារ 100%',
    descEn: '100% protected transactions',
    descZh: '100% 交易保障',
  },
  {
    iconKey: 'refresh-cw',
    titleKm: 'ប្ដូរ/ត្រឡប់ងាយស្រួល',
    titleEn: 'Easy Returns',
    titleZh: '轻松退货',
    descKm: 'គោលការណ៍ត្រឡប់ 30 ថ្ងៃ',
    descEn: '30-day return policy',
    descZh: '30天退货政策',
  },
  {
    iconKey: 'headphones',
    titleKm: 'គាំទ្រ 24/7',
    titleEn: '24/7 Support',
    titleZh: '24/7 支持',
    descKm: 'ជំនួយពេញម៉ោង',
    descEn: 'Round-the-clock assistance',
    descZh: '全天候客服支持',
  },
];

export const createEmptyTrustBadge = (): TrustBadgeCard => ({
  iconKey: 'package',
  titleKm: '',
  titleEn: '',
  titleZh: '',
  descKm: '',
  descEn: '',
  descZh: '',
});

export type LinkItem = { label: string; href: string };
export type SocialItem = { name: string; url: string };

export type HeroSlide = {
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  ctaHref: string;
  bg: string;
  accent: string;
  image: string;
};

export type PromoCard = {
  tag: string;
  title: string;
  description: string;
  cta: string;
  ctaHref: string;
  image?: string;
  gradientFrom: string;
  gradientTo: string;
  gradientFromColor?: string;
  gradientToColor?: string;
};

export interface AdminSettingsForm {
  siteName: string;
  siteTagline: string;
  shippingFeeVet: number;
  shippingFeeJnt: number;
  header: {
    siteName: string;
    logoLetter: string;
    navLinks: LinkItem[];
  };
  footer: {
    brandName: string;
    brandDescription: string;
    address: string;
    phones: string[];
    email: string;
    socialLinks: SocialItem[];
    shopLinks: LinkItem[];
    accountLinks: LinkItem[];
    legalLinks: LinkItem[];
    paymentBadges: string[];
    copyright: string;
  };
  homepage: {
    heroSlides: HeroSlide[];
    promoCards: PromoCard[];
  };
  invoice: {
    shopName: string;
    supportEmail: string;
    supportPhone: string;
    shopAddress: string;
    footerNote: string;
    paymentLabelCard: string;
    paymentLabelBakong: string;
  };
}

export type SettingsSection = 'core' | 'header' | 'homepage' | 'footer' | 'invoice';
export type UILang = 'km' | 'en' | 'zh';

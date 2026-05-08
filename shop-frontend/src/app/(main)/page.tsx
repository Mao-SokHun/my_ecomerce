import { HeroBanner } from '@/components/home/HeroBanner';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { TrustBadges } from '@/components/home/TrustBadges';
import { PromoSection } from '@/components/home/PromoSection';

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <TrustBadges />
      <CategoryGrid />
      <FeaturedProducts />
      <PromoSection />
    </>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { PageTransition } from '@/components/common/PageTransition';

export const metadata: Metadata = {
  title: {
    default: 'SH-Shop — Premium E-Commerce',
    template: '%s | SH-Shop',
  },
  description: 'Discover premium products at unbeatable prices. Shop electronics, fashion, home goods, and more.',
  keywords: ['ecommerce', 'shop', 'online shopping', 'premium products'],
  authors: [{ name: 'SH-Shop' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sh-shop.com',
    siteName: 'SH-Shop',
    title: 'SH-Shop — Premium E-Commerce',
    description: 'Discover premium products at unbeatable prices.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" suppressHydrationWarning>
      <body>
        <Providers>
          <PageTransition>
            {children}
          </PageTransition>
        </Providers>
      </body>
    </html>
  );
}

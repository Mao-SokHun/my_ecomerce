import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="page-container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Terms of Use</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        By using SH-Shop you agree to use the service lawfully, provide accurate checkout information, and accept that
        product availability and prices may change. Shipping and returns follow the policies shown at checkout and on
        product pages where applicable.
      </p>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        We may update these terms; continued use of the site after changes constitutes acceptance of the revised terms.
      </p>
      <Link href="/" className="text-primary-600 hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}

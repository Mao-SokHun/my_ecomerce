import Link from 'next/link';

export default function CookiesPage() {
  return (
    <div className="page-container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Cookie Policy</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        We use essential cookies and local storage so the site can remember your session, cart, language, and theme
        preferences. Third-party services (for example payments or analytics) may set their own cookies according to
        their policies.
      </p>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        You can control cookies through your browser settings; disabling essential cookies may limit site functionality.
      </p>
      <Link href="/" className="text-primary-600 hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}

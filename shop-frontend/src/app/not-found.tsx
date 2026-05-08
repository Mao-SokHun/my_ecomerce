import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="page-container py-20 text-center">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Page not found</h1>
      <p className="text-gray-500 mb-6">The page you are looking for does not exist.</p>
      <Link href="/" className="btn-primary text-sm">
        Back to Home
      </Link>
    </div>
  );
}

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="page-container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        SH-Shop respects your privacy. This page describes what information we collect when you use our store, how we use
        it, and your choices. For full legal terms in your jurisdiction, please consult qualified counsel.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300 mb-8">
        <li>Account data (name, email, phone) is used to process orders and communicate about your purchases.</li>
        <li>Payment details are handled by our payment providers; we do not store full card numbers on our servers.</li>
        <li>You may request account or data changes by contacting support using the details in the site footer.</li>
      </ul>
      <Link href="/" className="text-primary-600 hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}

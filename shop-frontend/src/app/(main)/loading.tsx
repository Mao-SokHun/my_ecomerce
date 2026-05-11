export default function MainGroupLoading() {
  return (
    <div className="page-container py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl space-y-3 animate-pulse">
        <div className="h-7 w-40 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-28 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-28 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}

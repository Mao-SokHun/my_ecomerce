export default function GlobalLoading() {
  return (
    <div className="page-container py-20">
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-40 w-full bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}

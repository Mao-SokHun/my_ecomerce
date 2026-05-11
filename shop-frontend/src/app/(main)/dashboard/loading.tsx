export default function DashboardLoading() {
  return (
    <div className="page-container py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4 animate-pulse">
        <div className="h-8 w-44 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-24 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-24 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-surface-800',
        className
      )}
      {...props}
    />
  );
}

export function ProductSkeleton() {
  return (
    <div className="card h-full">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="card aspect-[4/3] flex flex-col items-center justify-center p-6 space-y-3">
      <Skeleton className="w-12 h-12 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-cafe-surface-2 border border-cafe-border',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

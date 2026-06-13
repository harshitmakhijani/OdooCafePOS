import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const variantClasses = {
  default: 'bg-coral text-coral-foreground border-cafe-text',
  secondary: 'bg-cafe-surface-2 text-cafe-text border-cafe-text',
  destructive: 'bg-cancelled text-white border-cafe-text',
  outline: 'bg-transparent text-cafe-text border-cafe-text',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border-[1.5px] whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

import { cn } from '@/lib/utils';

type StatusVariant = 'paid' | 'draft' | 'cancelled' | 'info' | 'to-cook' | 'preparing' | 'completed';

const variantClasses: Record<StatusVariant, string> = {
  paid: 'bg-paid-bg text-paid border-paid',
  draft: 'bg-draft-bg text-draft border-draft',
  cancelled: 'bg-cancelled-bg text-cancelled border-cancelled',
  info: 'bg-info-bg text-info border-info',
  'to-cook': 'bg-draft-bg text-draft border-draft',
  preparing: 'bg-info-bg text-info border-info',
  completed: 'bg-paid-bg text-paid border-paid',
};

const variantLabels: Record<StatusVariant, string> = {
  paid: 'Paid',
  draft: 'Draft',
  cancelled: 'Cancelled',
  info: 'Info',
  'to-cook': 'To cook',
  preparing: 'Preparing',
  completed: 'Completed',
};

interface StatusPillProps {
  variant: StatusVariant;
  /** Override the default label text. */
  label?: string;
  className?: string;
}

/** Status badge — always shows the status word (accessibility). */
export function StatusPill({ variant, label, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border-[1.5px] whitespace-nowrap uppercase tracking-wide',
        variantClasses[variant],
        className,
      )}
    >
      {label ?? variantLabels[variant]}
    </span>
  );
}

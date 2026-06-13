import { type ReactNode, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';

interface FormShellProps {
  title: string;
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
  onDiscard?: () => void;
  submitLabel?: string;
  discardLabel?: string;
  isSubmitting?: boolean;
  /** Whether to use 2-column grid for short fields. */
  twoColumn?: boolean;
}

/**
 * Reusable form shell with Neubrutalism styling.
 * Used full-page or inside a modal. Actions bottom-right (primary on right).
 */
export function FormShell({
  title,
  children,
  onSubmit,
  onDiscard,
  submitLabel = 'Save',
  discardLabel = 'Discard',
  isSubmitting = false,
  twoColumn = false,
}: FormShellProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
    >
      <h2 className="text-heading font-bold text-cafe-text">{title}</h2>

      <div className={twoColumn ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
        {children}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onDiscard && (
          <Button type="button" variant="secondary" onClick={onDiscard} disabled={isSubmitting}>
            {discardLabel}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

import type { FormEvent, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface InlineCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** The form fields. */
  children: ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

/**
 * Reusable inline-create modal styled in Neubrutalism:
 * Combines Radix primitives with high-contrast borders and active-click animations.
 */
export function InlineCreateModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Create',
  isSubmitting = false,
}: InlineCreateModalProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[3px] border-black bg-neubrutal-cream rounded-none p-0 overflow-hidden shadow-neubrutal-lg max-w-md w-[95%]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="bg-neubrutal-lavender border-b-2 border-black p-5 text-left flex flex-col space-y-1">
            <DialogTitle className="text-xl font-black text-black uppercase tracking-wide">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-xs font-bold text-neutral-800">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 p-5 bg-white text-sm font-bold text-black">
            {children}
          </div>

          <div className="flex justify-end gap-3 p-5 bg-neutral-50 border-t-2 border-black">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="nb-button-white px-4 py-2 text-xs uppercase tracking-wider font-extrabold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="nb-button-primary px-4 py-2 text-xs uppercase tracking-wider font-extrabold"
            >
              {isSubmitting ? 'Creating…' : submitLabel}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

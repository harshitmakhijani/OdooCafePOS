import type { FormEvent, ReactNode } from 'react';

export interface FormShellProps {
  title: string;
  /** The form fields. */
  children: ReactNode;
  onSubmit: () => void;
  onDiscard?: () => void;
  submitLabel?: string;
  discardLabel?: string;
  isSubmitting?: boolean;
}

/**
 * Reusable create/edit form shell styled in Neubrutalism:
 * Features thick outlines, hard drop-shadows, sand backdrop elements, and responsive action keys.
 */
export function FormShell({
  title,
  children,
  onSubmit,
  onDiscard,
  submitLabel = 'Save',
  discardLabel = 'Discard',
  isSubmitting = false,
}: FormShellProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="mx-auto max-w-2xl nb-card border-2 border-black shadow-neubrutal-md bg-white">
      <div className="border-b-2 border-black p-5 bg-neubrutal-lavender/30">
        <h2 className="text-2xl font-black text-black uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">{children}</div>
          <div className="flex justify-end gap-3 pt-4 border-t border-dashed border-neutral-300">
            {onDiscard && (
              <button
                type="button"
                onClick={onDiscard}
                disabled={isSubmitting}
                className="nb-button-white px-5 py-2 text-sm uppercase tracking-wider font-extrabold"
              >
                {discardLabel}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="nb-button-primary px-5 py-2 text-sm uppercase tracking-wider font-extrabold"
            >
              {isSubmitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

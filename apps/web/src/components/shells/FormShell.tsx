import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
 * Reusable create/edit form shell (base prompt §6): a titled card with a fields
 * slot and Save / Discard actions. No field or persistence logic of its own.
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
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">{children}</div>
          <div className="flex justify-end gap-3 pt-2">
            {onDiscard && (
              <Button type="button" variant="outline" onClick={onDiscard} disabled={isSubmitting}>
                {discardLabel}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

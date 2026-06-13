import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PlaceholderProps {
  title: string;
  /** PRD section anchor this screen implements, e.g. "§9.4". */
  prd?: string;
  children?: ReactNode;
}

/** Labelled scaffold placeholder shown on every not-yet-built screen (base prompt §6). */
export function Placeholder({ title, prd, children }: PlaceholderProps) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Scaffold placeholder{prd ? ` — implements PRD ${prd}` : ''}. Feature UI not yet built.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {children ?? (
          <p>
            This screen is part of the foundation skeleton. Wire it to the API and reusable shells
            during feature work.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

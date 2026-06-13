import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Signup screen (PRD §8.1) — placeholder; wire to POST /auth/signup during feature work. */
export function Signup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Scaffold placeholder — implements PRD §8.1. Form fields (Name, Email, Username,
            Password) to be wired to <code>POST /auth/signup</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}


import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { LoginInput, User } from '../../../server/src/schema';

interface LoginFormProps {
  onSuccess: (user: User) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // loginUser returns User | null according to the handler
      const user = await trpc.loginUser.mutate(formData);
      if (user) {
        onSuccess(user);
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
          }
          placeholder="Enter your email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
          }
          placeholder="Enter your password"
          required
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-green-600 hover:bg-green-700" 
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="text-sm text-gray-600 text-center">
        <p>Demo credentials (since backend is stubbed):</p>
        <p className="font-mono text-xs mt-1">
          Email: demo@example.com<br />
          Password: password123
        </p>
      </div>
    </form>
  );
}

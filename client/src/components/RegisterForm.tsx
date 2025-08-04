
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { CreateUserInput, User } from '../../../server/src/schema';

interface RegisterFormProps {
  onSuccess: (user: User) => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // createUser returns User according to the handler
      const user = await trpc.createUser.mutate(formData);
      onSuccess(user);
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error('Registration failed:', err);
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateUserInput) => ({ ...prev, first_name: e.target.value }))
            }
            placeholder="John"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateUserInput) => ({ ...prev, last_name: e.target.value }))
            }
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
          }
          placeholder="john@example.com"
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
            setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
          }
          placeholder="Minimum 8 characters"
          minLength={8}
          required
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-green-600 hover:bg-green-700" 
        disabled={isLoading}
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>

      <div className="text-sm text-gray-600 text-center">
        <p>Note: Backend handlers are currently stubbed for demo purposes</p>
      </div>
    </form>
  );
}

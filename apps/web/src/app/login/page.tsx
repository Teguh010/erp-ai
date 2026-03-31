'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Package } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Package className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Sign in to your ERP account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}
            
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="admin@erp.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>

            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </p>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center mb-2">Demo accounts:</p>
            {/* <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Admin:</strong> admin@erp.com / password123</p>
              <p><strong>Warehouse:</strong> warehouse@erp.com / password123</p>
              <p><strong>Production:</strong> production@erp.com / password123</p>
            </div> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

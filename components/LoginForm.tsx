'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  const { login, resendVerification } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError('');
      setShowResendButton(false);
      console.log('Attempting login...');
      await login(email, password);
      console.log('Login successful, redirecting to dashboard...');
      
      // Add a small delay to ensure auth state is updated
      setTimeout(() => {
        console.log('Executing redirect to dashboard...');
        router.push('/dashboard');
      }, 500);
    } catch (err: Error | unknown) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
        // Show resend button if it's a verification error
        if (err.message.includes('verify your email')) {
          setShowResendButton(true);
        }
      } else {
        setError('Failed to login. Please check your credentials.');
      }
    }
  };

  const handleResendVerification = async () => {
    try {
      setError('Sending verification email...');
      // Use the auth from our firebase config
      const { signInWithEmailAndPassword, sendEmailVerification, signOut } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      
      setError('Verification email sent! Please check your inbox and click the link.');
      setShowResendButton(false);
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        setError('Failed to resend verification email: ' + err.message);
      } else {
        setError('Failed to resend verification email.');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 relative mb-4">
            <Image src="/window.svg" alt="Green Guardian Logo" fill className="object-contain" />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Sign in to continue to Green Guardian</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-500 text-center text-sm bg-red-50 p-2 rounded-md">
              {error}
              {showResendButton && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="text-green-600 hover:text-green-700 underline text-sm"
                  >
                    Resend Verification Email
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email-address"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Sign in
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-green-600 hover:text-green-500">
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

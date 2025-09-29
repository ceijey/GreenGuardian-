'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, AuthErrorCodes } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import OnboardingModal from '@/components/OnboardingModal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Check if user is first time visitor
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();

      if (!userData?.hasCompletedOnboarding) {
        setShowOnboarding(true);
        // Update user document to mark onboarding as completed
        await updateDoc(doc(db, 'users', userCredential.user.uid), {
          hasCompletedOnboarding: true,
        });
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      // Handle specific Firebase auth errors
      switch (err.code) {
        case AuthErrorCodes.USER_DELETED:
          setError('This email is not registered. Please sign up first.');
          break;
        case AuthErrorCodes.INVALID_PASSWORD:
          setError('Incorrect password. Please try again.');
          break;
        case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          setError('An error occurred. Please try again.');
      }
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    router.push('/dashboard');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <h2 className="text-3xl font-bold text-center">Welcome Back</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 border rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-green-600 text-white p-3 rounded hover:bg-green-700 transition-colors duration-200"
            >
              Login
            </button>
          </form>
          <p className="text-center">
            Need an account?{' '}
            <Link href="/signup" className="text-green-600 hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
      {showOnboarding && <OnboardingModal onClose={handleOnboardingComplete} />}
    </>
  );
}
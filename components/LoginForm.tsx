'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  const { login } = useAuth();
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
    <div className={styles.container}>
      <Link href="/" className={styles.backButton} aria-label="Back to home">
        <i className="fas fa-arrow-left"></i>
      </Link>
      
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Image src="/window.svg" alt="Green Guardian Logo" width={60} height={60} />
          </div>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Sign in to continue to Green Guardian</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
              {showResendButton && (
                <div>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className={styles.resendButton}
                  >
                    Resend Verification Email
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={styles.formFields}>
            <div className={styles.field}>
              <label htmlFor="email-address" className={styles.label}>
                Email address
              </label>
              <input
                id="email-address"
                type="email"
                required
                className={styles.input}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className={styles.input}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitButton}>
            Sign in
          </button>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className={styles.footerLink}>
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

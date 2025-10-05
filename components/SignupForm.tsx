'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './SignupForm.module.css';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError("Passwords don't match");
    }

    try {
      setError('');
      setMessage('');
      await signup(email, password);
      
      // This won't execute because signup throws an error after sending verification
      setMessage('Account created successfully!');
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        // If it's the verification message, show it as a message, not an error
        if (err.message.includes('verification link')) {
          setMessage(err.message);
          setError('');
          // Redirect to login after showing the message
          setTimeout(() => router.push('/login'), 5000);
        } else {
          console.error(err.message);
          setError(err.message);
        }
      } else {
        setError('Failed to create an account.');
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
          <h2 className={styles.title}>Create Account</h2>
          <p className={styles.subtitle}>Join Green Guardian today</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          {message && <div className={styles.successMessage}>{message}</div>}

          <div className={styles.formFields}>
            <div className={styles.field}>
              <label htmlFor="email-address" className={styles.label}>
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
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
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={styles.input}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="confirm-password" className={styles.label}>
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className={styles.input}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitButton}>
            Create Account
          </button>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Already have an account?{' '}
              <Link href="/login" className={styles.footerLink}>
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

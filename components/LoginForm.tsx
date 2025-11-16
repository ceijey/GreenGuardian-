'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import * as roleUtils from '@/lib/roleUtils';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  
  // Refs for accessibility
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Auto-focus email field on mount (WCAG 2.4.3)
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Announce errors to screen readers
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isLoading) return;

    try {
      setError('');
      setShowResendButton(false);
      setIsLoading(true);
      console.log('Attempting login...');
      const userCredential = await login(email, password);
      console.log('Login successful, determining redirect...');
      
      // Get the appropriate redirect based on user role (now async)
      const redirectPath = await roleUtils.getLoginRedirectPath(userCredential?.user || null);
      console.log('Executing redirect to:', redirectPath);
      
      // Add a small delay to ensure auth state is updated
      setTimeout(() => {
        router.push(redirectPath);
      }, 500);
    } catch (err: Error | unknown) {
      console.error('Login error:', err);
      setIsLoading(false);
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

  // Keyboard navigation helper
  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement | HTMLButtonElement | null>) => {
    // Tab navigation enhancement
    if (e.key === 'Enter' && nextRef?.current) {
      e.preventDefault();
      nextRef.current.focus();
    }
  };

  // Toggle password visibility (WCAG 1.4.8)
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
    // Keep focus on password field
    setTimeout(() => passwordInputRef.current?.focus(), 0);
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
    <div className={styles.container} role="main">
      <Link 
        href="/" 
        className={styles.backButton} 
        aria-label="Go back to home page"
        tabIndex={0}
      >
        <i className="fas fa-arrow-left" aria-hidden="true"></i>
        <span className={styles.srOnly}>Back to home</span>
      </Link>
      
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Image 
              src="/greenguardian logo.png" 
              alt="Green Guardian Logo - Environmental sustainability platform" 
              width={60} 
              height={60}
              priority
            />
          </div>
          <h1 className={styles.title} id="login-heading">Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to continue to Green Guardian</p>
        </div>

        <form 
          className={styles.form} 
          onSubmit={handleSubmit}
          aria-labelledby="login-heading"
          noValidate
        >
          {error && (
            <div 
              ref={errorRef}
              className={styles.errorMessage}
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              tabIndex={-1}
            >
              <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
              <span>{error}</span>
              {showResendButton && (
                <div>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className={styles.resendButton}
                    aria-label="Resend email verification"
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
                <span aria-label="required" className={styles.required}>*</span>
              </label>
              <input
                ref={emailInputRef}
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'error-message' : undefined}
                className={styles.input}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, passwordInputRef)}
                disabled={isLoading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
                <span aria-label="required" className={styles.required}>*</span>
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  ref={passwordInputRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={showPassword ? 'password-visible' : 'password-hidden'}
                  className={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, submitButtonRef)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className={styles.togglePassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                  disabled={isLoading}
                >
                  <i 
                    className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} 
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
              <span id="password-visible" className={styles.srOnly}>
                {showPassword ? 'Password is visible' : 'Password is hidden'}
              </span>
            </div>
          </div>

          <button 
            ref={submitButtonRef}
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? 'Signing in, please wait' : 'Sign in to your account'}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                <span>Signing in...</span>
              </>
            ) : (
              'Sign in'
            )}
          </button>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Don&apos;t have an account?{' '}
              <Link 
                href="/signup" 
                className={styles.footerLink}
                aria-label="Go to sign up page"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

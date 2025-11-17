'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './ForgotPasswordForm.module.css';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();
  const router = useRouter();
  
  const emailInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if ((error || message) && messageRef.current) {
      messageRef.current.focus();
    }
  }, [error, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    // Validate email
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setError('');
      setMessage('');
      setIsLoading(true);
      
      await resetPassword(email);
      
      setMessage('Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
      setEmail('');
      
      // Redirect to login after 5 seconds
      setTimeout(() => {
        router.push('/login');
      }, 5000);
    } catch (err: Error | unknown) {
      setIsLoading(false);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
    }
  };

  return (
    <div className={styles.container} role="main">
      <Link 
        href="/login" 
        className={styles.backButton} 
        aria-label="Go back to login page"
        tabIndex={0}
      >
        <i className="fas fa-arrow-left" aria-hidden="true"></i>
        <span className={styles.srOnly}>Back to login</span>
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
          <h1 className={styles.title} id="forgot-password-heading">Forgot Password?</h1>
          <p className={styles.subtitle}>
            Enter your email address and we&apos;ll send you instructions to reset your password
          </p>
        </div>

        <form 
          className={styles.form} 
          onSubmit={handleSubmit}
          aria-labelledby="forgot-password-heading"
          noValidate
        >
          {error && (
            <div 
              ref={messageRef}
              className={styles.errorMessage}
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              tabIndex={-1}
            >
              <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div 
              ref={messageRef}
              className={styles.successMessage}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              tabIndex={-1}
            >
              <i className="fas fa-check-circle" aria-hidden="true"></i>
              <span>{message}</span>
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
                className={styles.input}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || !!message}
              />
            </div>
          </div>

          <button 
            ref={submitButtonRef}
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading || !!message}
            aria-busy={isLoading}
            aria-label={isLoading ? 'Sending reset email, please wait' : 'Send password reset email'}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                <span>Sending...</span>
              </>
            ) : message ? (
              <>
                <i className="fas fa-check" aria-hidden="true"></i>
                <span>Email Sent!</span>
              </>
            ) : (
              <>
                <i className="fas fa-envelope" aria-hidden="true"></i>
                <span>Send Reset Email</span>
              </>
            )}
          </button>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Remember your password?{' '}
              <Link 
                href="/login" 
                className={styles.footerLink}
                aria-label="Go back to sign in page"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

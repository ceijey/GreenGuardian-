'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import TermsModal from './TermsModal';
import PrivacyModal from './PrivacyModal';
import styles from './SignupForm.module.css';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('citizen');
  const [showRoleSelection, setShowRoleSelection] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();
  
  // Refs for accessibility
  const displayNameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  // Auto-focus display name field on mount
  useEffect(() => {
    displayNameInputRef.current?.focus();
  }, []);

  // Check email domain and adjust role selection visibility
  useEffect(() => {
    if (email.endsWith('@gordoncollege.edu.ph')) {
      setRole('government');
      setShowRoleSelection(false);
    } else if (email.includes('@')) {
      setShowRoleSelection(true);
      if (role === 'government') {
        setRole('citizen');
      }
    }
  }, [email]);

  // Announce messages to screen readers
  useEffect(() => {
    if ((error || message) && messageRef.current) {
      messageRef.current.focus();
    }
  }, [error, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    // Check if terms are accepted
    if (!acceptedTerms) {
      setError('Please accept the Terms and Conditions to continue');
      return;
    }

    if (password !== confirmPassword) {
      return setError("Passwords don't match");
    }

    try {
      setError('');
      setMessage('');
      setIsLoading(true);
      
      // Validate display name
      if (!displayName || displayName.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters)');
        setIsLoading(false);
        return;
      }
      
      // Validate government email domain
      if (role === 'government' && !email.endsWith('@gordoncollege.edu.ph')) {
        setError('Government officials must use @gordoncollege.edu.ph email address');
        setIsLoading(false);
        return;
      }
      
      await signup(email, password, role, displayName.trim());
      
      // This won't execute because signup throws an error after sending verification
      setMessage('Account created successfully!');
    } catch (err: Error | unknown) {
      setIsLoading(false);
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

  // Keyboard navigation helper
  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement | HTMLButtonElement | null>) => {
    if (e.key === 'Enter' && nextRef?.current) {
      e.preventDefault();
      nextRef.current.focus();
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
    setTimeout(() => passwordInputRef.current?.focus(), 0);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
    setTimeout(() => confirmPasswordInputRef.current?.focus(), 0);
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
          <h1 className={styles.title} id="signup-heading">Create Account</h1>
          <p className={styles.subtitle}>Join Green Guardian today</p>
        </div>

        <form 
          className={styles.form} 
          onSubmit={handleSubmit}
          aria-labelledby="signup-heading"
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
            {/* Full Name Field */}
            <div className={styles.field}>
              <label htmlFor="display-name" className={styles.label}>
                Full Name
                <span aria-label="required" className={styles.required}>*</span>
              </label>
              <input
                ref={displayNameInputRef}
                id="display-name"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                aria-required="true"
                aria-invalid={error ? 'true' : 'false'}
                className={styles.input}
                placeholder="Enter your full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, emailInputRef)}
                disabled={isLoading}
              />
            </div>

            {/* Email Field */}
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
                onKeyDown={(e) => handleKeyDown(e, passwordInputRef)}
                disabled={isLoading}
              />
              {email.endsWith('@gordoncollege.edu.ph') && (
                <p className={styles.roleNote}>
                  <i className="fas fa-info-circle"></i>
                  Detected as Government Official account
                </p>
              )}
            </div>

            {showRoleSelection && email.includes('@') && !email.endsWith('@gordoncollege.edu.ph') && (
              <div className={styles.roleSelectionSection}>
                <label className={styles.label}>
                  Select Your Role
                  <span aria-label="required" className={styles.required}>*</span>
                </label>
                <div className={styles.roleGrid}>
                  {/* Citizen Card */}
                  <button
                    type="button"
                    className={`${styles.roleCard} ${role === 'citizen' ? styles.roleCardActive : ''}`}
                    onClick={() => setRole('citizen')}
                    disabled={isLoading}
                    aria-pressed={role === 'citizen'}
                  >
                    <div className={styles.roleIcon}>
                      <i className="fas fa-user"></i>
                    </div>
                    <h3 className={styles.roleTitle}>Citizen</h3>
                    <p className={styles.roleDesc}>Track waste, join challenges, and earn rewards</p>
                    {role === 'citizen' && (
                      <div className={styles.checkmark}>
                        <i className="fas fa-check-circle"></i>
                      </div>
                    )}
                  </button>

                  {/* NGO Card */}
                  <button
                    type="button"
                    className={`${styles.roleCard} ${role === 'ngo' ? styles.roleCardActive : ''}`}
                    onClick={() => setRole('ngo')}
                    disabled={isLoading}
                    aria-pressed={role === 'ngo'}
                  >
                    <div className={styles.roleIcon}>
                      <i className="fas fa-hands-helping"></i>
                    </div>
                    <h3 className={styles.roleTitle}>NGO</h3>
                    <p className={styles.roleDesc}>Manage campaigns and coordinate volunteers</p>
                    {role === 'ngo' && (
                      <div className={styles.checkmark}>
                        <i className="fas fa-check-circle"></i>
                      </div>
                    )}
                  </button>

                  {/* School Card */}
                  <button
                    type="button"
                    className={`${styles.roleCard} ${role === 'school' ? styles.roleCardActive : ''}`}
                    onClick={() => setRole('school')}
                    disabled={isLoading}
                    aria-pressed={role === 'school'}
                  >
                    <div className={styles.roleIcon}>
                      <i className="fas fa-graduation-cap"></i>
                    </div>
                    <h3 className={styles.roleTitle}>School</h3>
                    <p className={styles.roleDesc}>Create classroom challenges and track progress</p>
                    {role === 'school' && (
                      <div className={styles.checkmark}>
                        <i className="fas fa-check-circle"></i>
                      </div>
                    )}
                  </button>

                  {/* Private Partner Card */}
                  <button
                    type="button"
                    className={`${styles.roleCard} ${role === 'private-partner' ? styles.roleCardActive : ''}`}
                    onClick={() => setRole('private-partner')}
                    disabled={isLoading}
                    aria-pressed={role === 'private-partner'}
                  >
                    <div className={styles.roleIcon}>
                      <i className="fas fa-handshake"></i>
                    </div>
                    <h3 className={styles.roleTitle}>Partner</h3>
                    <p className={styles.roleDesc}>Sponsor challenges and promote eco-products</p>
                    {role === 'private-partner' && (
                      <div className={styles.checkmark}>
                        <i className="fas fa-check-circle"></i>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}

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
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={showPassword ? 'password-visible' : 'password-hidden'}
                  className={styles.input}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, confirmPasswordInputRef)}
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

            <div className={styles.field}>
              <label htmlFor="confirm-password" className={styles.label}>
                Confirm Password
                <span aria-label="required" className={styles.required}>*</span>
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  ref={confirmPasswordInputRef}
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={showConfirmPassword ? 'confirm-password-visible' : 'confirm-password-hidden'}
                  className={styles.input}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, submitButtonRef)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className={styles.togglePassword}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={0}
                  disabled={isLoading}
                >
                  <i 
                    className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} 
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
              <span id="confirm-password-visible" className={styles.srOnly}>
                {showConfirmPassword ? 'Confirm password is visible' : 'Confirm password is hidden'}
              </span>
            </div>
          </div>

          <div className={styles.termsContainer}>
            <label className={styles.termsLabel}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className={styles.termsCheckbox}
                disabled={isLoading}
                aria-required="true"
              />
              <span>
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className={styles.termsLink}
                  disabled={isLoading}
                >
                  Terms and Conditions
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className={styles.termsLink}
                  disabled={isLoading}
                >
                  Privacy Policy
                </button>
              </span>
            </label>
          </div>

          <button 
            ref={submitButtonRef}
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? 'Creating account, please wait' : 'Create your account'}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                <span>Creating Account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Already have an account?{' '}
              <Link 
                href="/login" 
                className={styles.footerLink}
                aria-label="Go to sign in page"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>

      <TermsModal 
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setAcceptedTerms(true);
          setShowTermsModal(false);
        }}
      />

      <PrivacyModal 
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
}

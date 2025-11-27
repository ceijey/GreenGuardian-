'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
  AuthError
} from 'firebase/auth';
import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Helper function to convert Firebase error codes to user-friendly messages
const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later or reset your password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support for assistance.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please login instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string, role: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  resendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Check if Firebase is properly configured
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.error('❌ Firebase API Key not configured in environment variables');
      setError('Firebase is not properly configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          console.log('✅ Auth state changed:', user ? 'User logged in' : 'User logged out');
          setUser(user);
          setLoading(false);
          setAuthInitialized(true);
        },
        (error) => {
          console.error('❌ Auth state change error:', error);
          setError(error.message);
          setLoading(false);
          setAuthInitialized(true);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up auth listener:', error);
      setError((error as Error).message);
      setLoading(false);
      setAuthInitialized(true);
    }
  }, []);

  // ✅ Signup with email verification
  const signup = async (email: string, password: string, role: string, displayName?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document with role and display name
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          email: user.email,
          displayName: displayName || email.split('@')[0],
          role: role,
          createdAt: serverTimestamp(),
          emailVerified: false,
          profileComplete: !!displayName
        });
      } catch (error) {
        console.error('Error creating user document:', error);
      }

      // Update global user count
      try {
        const globalStatsRef = doc(db, 'globalStats', 'aggregate');
        await setDoc(globalStatsRef, {
          totalUsers: increment(1),
          lastUpdated: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error updating user count:', error);
      }

      // Send verification email
      await sendEmailVerification(user);
      await signOut(auth);

      throw new Error('Please check your email and click the verification link before logging in.');
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code) {
        throw new Error(getAuthErrorMessage(authError));
      }
      throw new Error(authError.message || 'Signup failed');
    }
  };

  // ✅ Login with email verification check
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await user.reload();

      if (!user.emailVerified) {
        await signOut(auth);
        throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
      }

      return { user };
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code) {
        throw new Error(getAuthErrorMessage(authError));
      }
      throw new Error(authError.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const resendVerification = async () => {
    if (user) {
      await sendEmailVerification(user);
    } else {
      throw new Error('No user is currently logged in.');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code) {
        throw new Error(getAuthErrorMessage(authError));
      }
      throw new Error(authError.message || 'Failed to send password reset email');
    }
  };

  const value = {
    user,
    loading,
    error,
    signup,
    login,
    logout,
    resendVerification,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {authInitialized ? children : <div>Initializing...</div>}
    </AuthContext.Provider>
  );
}

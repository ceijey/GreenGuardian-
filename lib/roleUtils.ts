/**
 * Utility functions for user role management
 */

import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Check if a user is a government official based on their email domain
 * @param user - Firebase user object
 * @returns true if user is a government official, false otherwise
 */
export function isGovernmentOfficial(user: User | null): boolean {
  if (!user || !user.email) return false;
  
  return user.email.endsWith('@gordoncollege.edu.ph') || 
         user.email.includes('admin');
}

/**
 * Get user role from Firestore
 * @param user - Firebase user object
 * @returns user role or 'citizen' as default
 */
async function getUserRole(user: User | null): Promise<string> {
  if (!user) return 'citizen';
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return userDoc.data()?.role || 'citizen';
    }
    // Fallback: check email domain for government officials
    if (isGovernmentOfficial(user)) {
      return 'government';
    }
    return 'citizen';
  } catch (error) {
    console.error('Error fetching user role:', error);
    // Fallback: check email domain
    if (isGovernmentOfficial(user)) {
      return 'government';
    }
    return 'citizen';
  }
}

/**
 * Get the appropriate redirect path after login based on user role
 * @param user - Firebase user object
 * @returns path to redirect to
 */
export async function getLoginRedirectPath(user: User | null): Promise<string> {
  if (!user) return '/dashboard';
  
  const role = await getUserRole(user);
  
  switch (role) {
    case 'government':
      return '/gov-portal';
    case 'ngo':
      return '/ngo-portal';
    case 'school':
      return '/school-portal';
    case 'private-partner':
      return '/private-partner';
    case 'citizen':
    default:
      return '/dashboard';
  }
}

/**
 * Check if a government official should be blocked from accessing citizen views
 * @param user - Firebase user object
 * @param pathname - Current pathname
 * @returns true if access should be blocked, false otherwise
 */
export function shouldBlockCitizenAccess(user: User | null, pathname: string): boolean {
  if (!isGovernmentOfficial(user)) return false;
  
  // List of citizen-only routes
  const citizenRoutes = [
    '/dashboard',
    '/waste-tracker',
    '/community',
    '/community-hub',
    '/swap',
    '/volunteer',
    '/impact',
    '/profile'
  ];
  
  return citizenRoutes.some(route => pathname.startsWith(route));
}

// Explicit exports at the end
export { getUserRole };

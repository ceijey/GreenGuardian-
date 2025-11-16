/**
 * Utility functions for user role management
 */

import { User } from 'firebase/auth';

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
 * Get the appropriate redirect path after login based on user role
 * @param user - Firebase user object
 * @returns path to redirect to
 */
export function getLoginRedirectPath(user: User | null): string {
  if (isGovernmentOfficial(user)) {
    return '/gov-portal';
  }
  return '/dashboard';
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

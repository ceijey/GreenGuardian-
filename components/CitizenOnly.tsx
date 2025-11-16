'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import * as roleUtils from '@/lib/roleUtils';

/**
 * Component that redirects non-citizen users away from citizen-only pages
 * Usage: Add <CitizenOnly /> at the top of any citizen-only page component
 */
export default function CitizenOnly() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (loading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      const role = await roleUtils.getUserRole(user);
      
      // Redirect based on role
      if (role === 'government') {
        router.push('/gov-portal');
      } else if (role === 'ngo') {
        router.push('/ngo-portal');
      } else if (role === 'school') {
        router.push('/school-portal');
      } else if (role === 'private-partner') {
        router.push('/private-partner');
      }
      
      setChecking(false);
    };

    checkRole();
  }, [user, loading, router]);

  // Show nothing while checking
  if (checking || loading) {
    return null;
  }

  return null;
}

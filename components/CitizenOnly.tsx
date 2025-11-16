'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { isGovernmentOfficial } from '@/lib/roleUtils';

/**
 * Component that redirects government officials away from citizen pages
 * Usage: Add <CitizenOnly /> at the top of any citizen-only page component
 */
export default function CitizenOnly() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && isGovernmentOfficial(user)) {
      router.push('/gov-portal');
    }
  }, [user, router]);

  return null;
}

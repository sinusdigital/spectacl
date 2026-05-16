'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const logout = async () => {
    await signOut();
    router.push('/login');
  };

  return {
    user: session?.user,
    session,
    isLoading: isPending,
    isAuthenticated: !!session,
    logout,
  };
}

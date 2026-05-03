'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      router.replace('/auth/login');
      router.refresh();
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </Button>
  );
}

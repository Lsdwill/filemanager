'use client';

import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/files';
    } else {
      window.location.href = '/login';
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
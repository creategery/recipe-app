'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// Load AuthProvider (and thus Firebase) only in the browser, never during SSR
const AuthProvider = dynamic(
  () => import('@/contexts/AuthContext').then(m => ({ default: m.AuthProvider })),
  { ssr: false }
);

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

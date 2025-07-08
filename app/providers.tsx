'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/providers/ToastProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
} 
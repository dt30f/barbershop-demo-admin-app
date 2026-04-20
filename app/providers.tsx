'use client';

import { PropsWithChildren } from 'react';

import { AuthProvider } from '@/components/auth-provider';
import { ConfirmProvider } from '@/components/confirm-provider';
import { FeedbackProvider } from '@/components/feedback-provider';

export function Providers({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <FeedbackProvider>{children}</FeedbackProvider>
      </ConfirmProvider>
    </AuthProvider>
  );
}

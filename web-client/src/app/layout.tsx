import { AuthProvider } from '@/contexts/AuthContext';
import { QueryProvider } from '@/lib/QueryProvider';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import DocBar from '@/components/DocBar/DocBar';

import './globals.scss';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Multi-tenant AI Assistant',
  description:
    'Each organization gets its own AI assistant with isolated conversations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <DocBar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import '../styles/index.css';

export const metadata: Metadata = {
  title: 'Academia - School Academic Management',
  description: 'A production-grade school academic management system for admins and faculty.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#f4f7fb] text-slate-950 antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

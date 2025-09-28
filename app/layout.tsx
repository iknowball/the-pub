import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Pub', // Adjust to your app’s title
  description: 'A social platform with a bulletin board', // Optional
  viewport: 'width=device-width, initial-scale=1', // Ensures mobile responsiveness
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics /> {/* Added for Vercel Analytics */}
      </body>
    </html>
  );
}

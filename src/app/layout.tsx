import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nodemap',
  description: 'Generative knowledge exploration tool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0c0a09" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </head>
      <body className="font-sans antialiased bg-surface-0 text-ink-1">
        {children}
      </body>
    </html>
  );
}

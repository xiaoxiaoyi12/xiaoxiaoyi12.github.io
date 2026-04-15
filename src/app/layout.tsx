import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: '依人相的月光集市',
  description: '只在深夜营业，售卖代码与随想',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: '依人相的月光集市',
    description: '只在深夜营业，售卖代码与随想',
    url: 'https://xiaoxiaoyi12.github.io',
    siteName: '依人相的月光集市',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '依人相的月光集市',
    description: '只在深夜营业，售卖代码与随想',
  },
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var saved = localStorage.getItem('theme') || 'system';
            var theme = saved === 'system'
              ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
              : saved;
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `}} />
      </head>
      <body>
        <Header />
        <main className="max-w-[980px] mx-auto px-4">
          {children}
        </main>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import '@/styles/globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

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
    images: [{ url: 'https://xiaoxiaoyi12.github.io/og-image.svg', width: 1200, height: 630, alt: '依人相的月光集市' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '依人相的月光集市',
    description: '只在深夜营业，售卖代码与随想',
    images: ['https://xiaoxiaoyi12.github.io/og-image.svg'],
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
            try {
              var saved = localStorage.getItem('theme') || 'system';
              var theme = saved === 'system'
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : saved;
              document.documentElement.setAttribute('data-theme', theme);
            } catch(e) {
              document.documentElement.setAttribute('data-theme', 'light');
            }
          })();
        `}} />
      </head>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-lg focus:text-sm">
          跳转到主要内容
        </a>
        <Header />
        <main id="main-content" className="max-w-[980px] mx-auto px-4">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

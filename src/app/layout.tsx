import type { Metadata, Viewport } from 'next'
import { Inter, Lexend } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import IncomingCallModal from '@/components/IncomingCallModal'
import NetworkStatusBanner from '@/components/NetworkStatusBanner'
import ConsentBanner from '@/components/ConsentBanner'
import Footer from '@/components/Footer'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'),
  title: {
    default: 'Kuppi — Free Learning Platform for Sri Lankan Students',
    template: '%s | Kuppi',
  },
  description:
    'Free community learning platform for Sri Lankan O/L, A/L, University and Masters students. Past papers, Z-score calculator, UGC cut-offs, tutors, and Q&A — all in Sinhala, Tamil, and English.',
  applicationName: 'Kuppi',
  keywords: [
    'Sri Lanka education',
    'O/L past papers',
    'A/L past papers',
    'Z-score calculator',
    'UGC cut-off marks',
    'Sri Lankan tutors',
    'free learning platform',
    'kuppi',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'Kuppi',
    title: 'Kuppi — Free Learning Platform for Sri Lankan Students',
    description:
      'Free community learning platform for Sri Lankan O/L, A/L, University and Masters students. Past papers, Z-score calculator, UGC cut-offs, tutors, and Q&A.',
    url: '/',
    locale: 'en_LK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kuppi — Free Learning Platform for Sri Lankan Students',
    description:
      'Past papers, Z-score, UGC cut-offs, tutors, and Q&A — free, in Sinhala, Tamil, and English.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kuppi',
  },
  other: {
    'google-adsense-account': 'ca-pub-1224577042495394',
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense Script - Required for verification */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1224577042495394"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} ${lexend.variable} font-sans`}>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <div className="min-h-screen flex flex-col">
                <NetworkStatusBanner />
                <div className="flex-1">{children}</div>
                <Footer />
              </div>
              <IncomingCallModal />
              <ConsentBanner />
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}

/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    // Firebase Auth handler is proxied through our own origin via Next.js
    // rewrites (see nextConfig.rewrites below). The SW must NEVER cache these
    // requests: a stale auth response would break the OAuth handshake and
    // potentially leak a previous user's state. Keep this rule first so it
    // matches before the generic same-origin / static-asset rules.
    {
      urlPattern: ({ url }) =>
        url.origin === self.location.origin &&
        (url.pathname.startsWith('/__/auth/') || url.pathname.startsWith('/__/firebase/')),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\/api\/files\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'kuppi-materials',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/pagead2\.googlesyndication\.com\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: ({ request }) => request.destination === 'image',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'kuppi-images',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'kuppi-static' },
    },
    {
      urlPattern: ({ url }) => url.origin === self.location.origin && !url.pathname.startsWith('/api/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'kuppi-pages',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  // Serve Firebase's OAuth handler from our own origin so the redirect /
  // popup flow looks like a first-party request to the browser. Mobile
  // Safari and mobile Chrome partition third-party storage by eTLD+1; when
  // the Firebase authDomain (<project-id>.firebaseapp.com) differs from the
  // app origin, the cross-site cookies the auth handshake relies on are
  // dropped and Google sign-in silently fails. Proxying /__/auth and
  // /__/firebase here keeps everything same-origin from the browser's POV.
  // The proxy target is derived from the Firebase project id.
  async rewrites() {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id';
    const authHandler = `https://${projectId}.firebaseapp.com`;
    return [
      {
        source: '/__/auth/:path*',
        destination: `${authHandler}/__/auth/:path*`,
      },
      {
        source: '/__/firebase/:path*',
        destination: `${authHandler}/__/firebase/:path*`,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);

import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';

type Route = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
};

const PUBLIC_ROUTES: Route[] = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/courses', changeFrequency: 'daily', priority: 0.9 },
  { path: '/past-papers', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/z-score', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/ugc-cutoffs', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/scholarship', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/streams', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/qa', changeFrequency: 'daily', priority: 0.8 },
  { path: '/offers', changeFrequency: 'daily', priority: 0.8 },
  { path: '/learn', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/teach', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/study-buddies', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/announcements', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/help', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/guidelines', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

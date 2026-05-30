'use client';

import Link from 'next/link';
import { HeartFilled } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                K
              </div>
              <span className="text-xl font-display font-bold text-gray-900">
                Kuppi
              </span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              {t('footerTaglineDescription')}
            </p>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-4">{t('footerPlatform')}</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/courses" className="hover:text-primary-600 transition-colors">{t('footerLinkBrowseCourses')}</Link></li>
              <li><Link href="/offers" className="hover:text-primary-600 transition-colors">{t('footerLinkFindTutors')}</Link></li>
              <li><Link href="/requests" className="hover:text-primary-600 transition-colors">{t('footerLinkStudentRequests')}</Link></li>
              <li><Link href="/announcements" className="hover:text-primary-600 transition-colors">{t('footerLinkAnnouncements')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-4">{t('support')}</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/help" className="hover:text-primary-600 transition-colors">{t('footerLinkHelpCenter')}</Link></li>
              <li><Link href="/guidelines" className="hover:text-primary-600 transition-colors">{t('footerLinkCommunityGuidelines')}</Link></li>
              <li><Link href="/contact" className="hover:text-primary-600 transition-colors">{t('footerLinkContactUs')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-4">{t('footerLegal')}</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/privacy" className="hover:text-primary-600 transition-colors">{t('footerLinkPrivacyPolicy')}</Link></li>
              <li><Link href="/terms" className="hover:text-primary-600 transition-colors">{t('footerLinkTermsOfService')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} Kuppi. {t('footerCopyrightSuffix')}
          </p>
          <p className="text-sm text-gray-500 flex items-center">
            {t('footerMadeBefore')} <HeartFilled className="text-red-500 mx-1" /> {t('footerMadeAfter')}
          </p>
        </div>
      </div>
    </footer>
  );
}

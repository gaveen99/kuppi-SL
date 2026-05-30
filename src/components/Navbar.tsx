'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useState } from 'react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { permission, isSupported, requestPermission } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">
                K
              </div>
              <span className="text-2xl font-display font-bold text-gray-900 tracking-tight">
                Kuppi
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link href="/courses" className="text-gray-600 hover:text-primary-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('courses')}
            </Link>
            <Link href="/offers" className="text-gray-600 hover:text-primary-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('findTeachers')}
            </Link>
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 whitespace-nowrap">
                {t('navPapers')}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-50">
                <Link href="/past-papers" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600">
                  {t('navPapersOfficial')}
                </Link>
                <Link href="/community-papers" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600">
                  {t('communityPapersNavLink')}
                </Link>
              </div>
            </div>
            <Link href="/qa" className="text-gray-600 hover:text-primary-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('navQA')}
            </Link>
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 whitespace-nowrap">
                {t('navTools')}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-50">
                <Link href="/z-score" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600">
                  {t('navZScoreCalculator')}
                </Link>
                <Link href="/ugc-cutoffs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600">
                  {t('navUGCCutoffs')}
                </Link>
                <Link href="/streams" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600">
                  {t('navALStreamNavigator')}
                </Link>
                <Link href="/scholarship" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600">
                  {t('navScholarshipHub')}
                </Link>
                <Link href="/study-buddies" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600">
                  {t('navStudyBuddies')}
                </Link>
              </div>
            </div>
            <Link href="/announcements" className="text-gray-600 hover:text-primary-600 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('announcements')}
            </Link>
            
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            
            {/* Language Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-lg" role="group" aria-label={t('navLanguage')}>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-label="English"
                aria-pressed={language === 'en'}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('si')}
                aria-label="Sinhala"
                aria-pressed={language === 'si'}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'si' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                සි
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                aria-label="Tamil"
                aria-pressed={language === 'ta'}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'ta' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                த
              </button>
            </div>
            
            <div className="ml-4 flex items-center gap-3">
              {user ? (
                <>
                  {user.role === 'teacher' && (
                    <Link href="/teach" className="text-gray-600 hover:text-primary-600 font-medium px-3 py-2">
                      {t('teach')}
                    </Link>
                  )}
                  {user.role === 'student' && (
                    <Link href="/learn" className="text-gray-600 hover:text-primary-600 font-medium px-3 py-2">
                      {t('learnRequests')}
                    </Link>
                  )}
                  <Link href="/messages" aria-label={t('navMessages')} className="relative p-2 text-gray-500 hover:text-primary-600 transition-colors">
                    <svg className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                  </Link>
                  
                  {/* Notification Permission Button */}
                  {isSupported && user && permission !== 'granted' && (
                    <button
                      onClick={requestPermission}
                      className="text-gray-500 hover:text-primary-600 p-2 relative"
                      title={t('navEnableNotifications')}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
                    </button>
                  )}
                  
                  <div className="relative group">
                    <button
                      type="button"
                      aria-label={t('navAccountMenu')}
                      aria-haspopup="true"
                      className="flex items-center gap-2 ml-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold shadow-md">
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                      </div>
                    </button>

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all transform origin-top-right z-50">
                      <div className="px-4 py-2 border-b border-gray-50">
                        <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link href={`/dashboard/${user.role}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600">
                        {t('navDashboard')}
                      </Link>
                      <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600">
                        {t('navProfile')}
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        {t('signOut')}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 ml-4">
                  <Link href="/auth/login" className="text-gray-600 hover:text-primary-600 font-bold text-sm px-4 py-2">
                    {t('navLogIn')}
                  </Link>
                  <Link href="/auth/register" className="btn-primary text-sm px-5 py-2.5">
                    {t('navSignUp')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? t('navCloseMenu') : t('navOpenMenu')}
              aria-expanded={mobileMenuOpen}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <svg className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 shadow-lg absolute w-full">
          <div className="flex flex-col space-y-3">
            <Link href="/courses" className="text-gray-700 font-medium py-2">
              {t('courses')}
            </Link>
            <Link href="/offers" className="text-gray-700 font-medium py-2">
              {t('findTeachers')}
            </Link>
            <Link href="/past-papers" className="text-gray-700 font-medium py-2">
              {t('navPastPapers')}
            </Link>
            <Link href="/community-papers" className="text-gray-700 font-medium py-2">
              {t('communityPapersNavLink')}
            </Link>
            <Link href="/qa" className="text-gray-700 font-medium py-2">
              {t('navQA')}
            </Link>
            <Link href="/z-score" className="text-gray-700 font-medium py-2">
              {t('navZScoreCalculator')}
            </Link>
            <Link href="/ugc-cutoffs" className="text-gray-700 font-medium py-2">
              {t('navUGCCutoffs')}
            </Link>
            <Link href="/streams" className="text-gray-700 font-medium py-2">
              {t('navALStreams')}
            </Link>
            <Link href="/scholarship" className="text-gray-700 font-medium py-2">
              {t('navScholarshipHub')}
            </Link>
            <Link href="/study-buddies" className="text-gray-700 font-medium py-2">
              {t('navStudyBuddies')}
            </Link>
            <Link href="/announcements" className="text-gray-700 font-medium py-2">
              {t('announcements')}
            </Link>
            <div className="border-t border-gray-100 my-2"></div>
            {user ? (
              <>
                <Link href={`/dashboard/${user.role}`} className="text-gray-700 font-medium py-2">
                  {t('navDashboard')}
                </Link>
                <Link href="/messages" className="text-gray-700 font-medium py-2">
                  {t('navMessages')}
                </Link>
                {user.role === 'teacher' && (
                  <Link href="/teach" className="text-gray-700 font-medium py-2">
                    {t('teach')}
                  </Link>
                )}
                {user.role === 'student' && (
                  <Link href="/learn" className="text-gray-700 font-medium py-2">
                    {t('learnRequests')}
                  </Link>
                )}
                <Link href="/profile" className="text-gray-700 font-medium py-2">
                  {t('navProfile')}
                </Link>
                <button onClick={handleSignOut} className="text-red-600 font-medium py-2 text-left">
                  {t('signOut')}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                <Link href="/auth/login" className="btn-secondary text-center justify-center">
                  {t('navLogIn')}
                </Link>
                <Link href="/auth/register" className="btn-primary text-center justify-center">
                  {t('navSignUp')}
                </Link>
              </div>
            )}
            <div className="border-t border-gray-100 my-2"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('navLanguage')}
              </span>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  aria-label="English"
                  aria-pressed={language === 'en'}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    language === 'en'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('si')}
                  aria-label="Sinhala"
                  aria-pressed={language === 'si'}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    language === 'si'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  සි
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ta')}
                  aria-label="Tamil"
                  aria-pressed={language === 'ta'}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    language === 'ta'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  த
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

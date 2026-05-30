'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { AdBanner } from '@/components/ads';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course, Level, Medium } from '@/types';
import { SL_DISTRICTS } from '@/lib/sriLanka';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = [
  'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
  'IT', 'Computer Science', 'Engineering', 'Business', 'Medicine',
  'Language', 'Arts', 'Other'
];

const MEDIUMS: Medium[] = ['Sinhala', 'Tamil', 'English'];

export default function CoursesPage() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<Level | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<Medium | 'All'>('All');
  const [districtFilter, setDistrictFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, levelFilter, categoryFilter, mediumFilter, districtFilter, searchQuery]);

  const fetchCourses = async () => {
    try {
      const coursesQuery = query(
        collection(db, 'courses'),
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc')
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const coursesData = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    if (levelFilter !== 'All') {
      filtered = filtered.filter(course => course.level === levelFilter);
    }

    if (categoryFilter !== 'All') {
      filtered = filtered.filter(course => course.category === categoryFilter);
    }

    if (mediumFilter !== 'All') {
      filtered = filtered.filter(course => course.medium === mediumFilter);
    }

    if (districtFilter !== 'All') {
      filtered = filtered.filter(course => course.district === districtFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCourses(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('coursesListTitle')}</h1>

        {/* Filters */}
        <div className="card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="label">{t('search')}</label>
              <input
                type="text"
                placeholder={t('coursesListSearchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">{t('level')}</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as Level | 'All')}
                className="input-field"
              >
                <option value="All">{t('allLevels')}</option>
                <option value="OL">O/L</option>
                <option value="AL">A/L</option>
                <option value="Undergraduate">{t('undergraduate')}</option>
                <option value="Masters">{t('masters')}</option>
                <option value="Other">{t('other')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('courseSharedCategory')}</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('courseSharedAllCategories')}</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('courseSharedMedium')}</label>
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value as Medium | 'All')}
                className="input-field"
              >
                <option value="All">{t('courseSharedAllMediums')}</option>
                {MEDIUMS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('courseSharedDistrict')}</label>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('courseSharedAllDistricts')}</option>
                {SL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ad Banner */}
        <div className="mb-8">
          <AdBanner type="horizontal" />
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">{t('coursesListLoading')}</div>
          </div>
        ) : filteredCourses.length > 0 ? (
          <>
            <h2 className="sr-only">{t('coursesListCoursesHeading')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <div className="card hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                    {course.isPremium && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        {t('courseSharedPremium')}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-3">{course.description}</p>
                  {course.teacherName && (
                    <p className="text-sm text-gray-500 mb-3">{t('coursesListByTeacher')} {course.teacherName}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                      {course.level}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      {course.category}
                    </span>
                    {course.medium && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {course.medium}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            </div>
          </>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500">{t('coursesListEmpty')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

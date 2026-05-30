'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course, CourseModule } from '@/types';

export default function ManageModulesPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      // Fetch course
      const courseDoc = await getDoc(doc(db, 'courses', params.id));
      if (!courseDoc.exists()) {
        router.push('/courses');
        return;
      }
      const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
      setCourse(courseData);

      // Fetch modules - try with orderBy, fallback to simple query
      try {
        const modulesQuery = query(
          collection(db, 'courseModules'),
          where('courseId', '==', params.id),
          orderBy('orderIndex', 'asc')
        );
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseModule));
        setModules(modulesData);
      } catch (indexError) {
        // If composite index is not ready, fetch without ordering and sort client-side
        console.log('Index not ready, fetching without order:', indexError);
        const modulesQuery = query(
          collection(db, 'courseModules'),
          where('courseId', '==', params.id)
        );
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as CourseModule))
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        setModules(modulesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(t('courseModulesFailedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  // Check if user is authorized
  useEffect(() => {
    if (!authLoading && !loading && course) {
      if (!user || user.uid !== course.teacherId) {
        router.push(`/courses/${params.id}`);
      }
    }
  }, [user, authLoading, loading, course, router, params.id]);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const newOrderIndex = modules.length > 0 
        ? Math.max(...modules.map(m => m.orderIndex)) + 1 
        : 0;

      await addDoc(collection(db, 'courseModules'), {
        courseId: params.id,
        title: newModuleTitle.trim(),
        orderIndex: newOrderIndex,
        createdAt: Timestamp.now(),
      });

      setNewModuleTitle('');
      fetchData();
    } catch (err: any) {
      console.error('Error adding module:', err);
      setError(err.message || t('courseModulesFailedToAdd'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateModule = async (moduleId: string) => {
    if (!editTitle.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      await updateDoc(doc(db, 'courseModules', moduleId), {
        title: editTitle.trim(),
        updatedAt: Timestamp.now(),
      });

      setEditingModule(null);
      setEditTitle('');
      fetchData();
    } catch (err: any) {
      console.error('Error updating module:', err);
      setError(err.message || t('courseModulesFailedToUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm(t('courseModulesDeleteConfirm'))) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Delete all materials in this module
      const materialsQuery = query(
        collection(db, 'materials'),
        where('moduleId', '==', moduleId)
      );
      const materialsSnapshot = await getDocs(materialsQuery);
      for (const materialDoc of materialsSnapshot.docs) {
        await deleteDoc(materialDoc.ref);
      }

      // Delete the module
      await deleteDoc(doc(db, 'courseModules', moduleId));
      fetchData();
    } catch (err: any) {
      console.error('Error deleting module:', err);
      setError(err.message || t('courseModulesFailedToDelete'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const currentIndex = modules.findIndex(m => m.id === moduleId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;

    setSubmitting(true);

    try {
      const currentModule = modules[currentIndex];
      const swapModule = modules[newIndex];

      await updateDoc(doc(db, 'courseModules', currentModule.id), {
        orderIndex: swapModule.orderIndex,
      });
      await updateDoc(doc(db, 'courseModules', swapModule.id), {
        orderIndex: currentModule.orderIndex,
      });

      fetchData();
    } catch (err: any) {
      console.error('Error reordering modules:', err);
      setError(err.message || t('courseModulesFailedToReorder'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">{t('loading')}</div>
      </div>
    );
  }

  if (!course || !user || user.uid !== course.teacherId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">{t('courseModulesNotAuthorized')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('courseModulesTitle')}</h1>
            <p className="text-gray-600 mt-1">{course.title}</p>
          </div>
          <button
            onClick={() => router.push(`/courses/${params.id}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            {t('courseModulesBackToCourse')}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Add New Module */}
        <form onSubmit={handleAddModule} className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('courseModulesAddNewModule')}</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder={t('courseModulesTitlePlaceholder')}
              className="input-field flex-1"
            />
            <button
              type="submit"
              disabled={submitting || !newModuleTitle.trim()}
              className="btn-primary"
            >
              {t('courseModulesAddButton')}
            </button>
          </div>
        </form>

        {/* Modules List */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('courseModulesCourseModules')}</h2>
          
          {modules.length > 0 ? (
            <div className="space-y-4">
              {modules.map((module, index) => (
                <div 
                  key={module.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  {editingModule === module.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="input-field flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateModule(module.id)}
                        disabled={submitting}
                        className="btn-primary text-sm"
                      >
                        {t('courseModulesSave')}
                      </button>
                      <button
                        onClick={() => {
                          setEditingModule(null);
                          setEditTitle('');
                        }}
                        className="btn-secondary text-sm"
                      >
                        {t('courseModulesCancel')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-medium">{index + 1}.</span>
                        <span className="font-medium text-gray-900">{module.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMoveModule(module.id, 'up')}
                          disabled={index === 0 || submitting}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                          title={t('courseModulesMoveUp')}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveModule(module.id, 'down')}
                          disabled={index === modules.length - 1 || submitting}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                          title={t('courseModulesMoveDown')}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => {
                            setEditingModule(module.id);
                            setEditTitle(module.title);
                          }}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          {t('courseModulesEdit')}
                        </button>
                        <button
                          onClick={() => handleDeleteModule(module.id)}
                          disabled={submitting}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          {t('courseModulesDelete')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              {t('courseModulesEmpty')}
            </p>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-4">
          {t('courseModulesFooterNote')}
        </p>
      </div>
    </div>
  );
}

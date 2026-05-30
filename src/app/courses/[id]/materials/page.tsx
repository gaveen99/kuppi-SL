'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FilePdfOutlined, FileImageOutlined, LinkOutlined } from '@ant-design/icons';
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
  deleteDoc,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course, CourseModule, Material, MaterialType } from '@/types';

export default function AddMaterialsPage({ params }: { params: { id: string } }) {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [selectedModule, setSelectedModule] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('pdf');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Past-paper / model-paper metadata (optional)
  const [resourceCategory, setResourceCategory] = useState<string>('note');
  const [examYear, setExamYear] = useState<string>('');
  const [examSubject, setExamSubject] = useState<string>('');
  const [examMedium, setExamMedium] = useState<string>('');

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

      // Fetch modules - with index fallback
      let modulesData: CourseModule[] = [];
      try {
        const modulesQuery = query(
          collection(db, 'courseModules'),
          where('courseId', '==', params.id),
          orderBy('orderIndex', 'asc')
        );
        const modulesSnapshot = await getDocs(modulesQuery);
        modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseModule));
      } catch (indexError) {
        console.log('Index not ready, fetching without order:', indexError);
        const modulesQuery = query(
          collection(db, 'courseModules'),
          where('courseId', '==', params.id)
        );
        const modulesSnapshot = await getDocs(modulesQuery);
        modulesData = modulesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as CourseModule))
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      }
      setModules(modulesData);

      if (modulesData.length > 0 && !selectedModule) {
        setSelectedModule(modulesData[0].id);
      }

      // Fetch materials - with index fallback
      try {
        const materialsQuery = query(
          collection(db, 'materials'),
          where('courseId', '==', params.id),
          orderBy('createdAt', 'desc')
        );
        const materialsSnapshot = await getDocs(materialsQuery);
        const materialsData = materialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
        setMaterials(materialsData);
      } catch (indexError) {
        console.log('Materials index not ready, fetching without order:', indexError);
        const materialsQuery = query(
          collection(db, 'materials'),
          where('courseId', '==', params.id)
        );
        const materialsSnapshot = await getDocs(materialsQuery);
        const materialsData = materialsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Material))
          .sort((a, b) => {
            const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return bTime - aTime;
          });
        setMaterials(materialsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(t('courseMaterialsFailedToLoad'));
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError(t('courseMaterialsFileTooLarge'));
        return;
      }
      setSelectedFile(file);
      if (!materialTitle) {
        setMaterialTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !materialTitle.trim()) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      let materialData: any = {
        courseId: params.id,
        moduleId: selectedModule,
        title: materialTitle.trim(),
        type: materialType,
        createdAt: Timestamp.now(),
      };

      if (resourceCategory && resourceCategory !== 'note') {
        materialData.resourceCategory = resourceCategory;
        if (examYear) materialData.examYear = Number(examYear);
        if (examSubject) materialData.subject = examSubject;
        if (examMedium) materialData.medium = examMedium;
        if (course?.level) materialData.level = course.level;
      }

      if (materialType === 'link') {
        if (!externalUrl.trim()) {
          setError(t('courseMaterialsEnterUrl'));
          setUploading(false);
          return;
        }
        materialData.externalUrl = externalUrl.trim();
      } else {
        if (!selectedFile) {
          setError(t('courseMaterialsSelectFile'));
          setUploading(false);
          return;
        }

        // Upload file
        const formData = new FormData();
        formData.append('file', selectedFile);

        const idToken = await firebaseUser?.getIdToken();
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || t('courseMaterialsUploadFailed'));
        }

        const uploadResult = await response.json();
        materialData.filePath = uploadResult.file.filePath;
        materialData.fileSize = uploadResult.file.fileSize;
        materialData.mimeType = uploadResult.file.mimeType;
        materialData.originalFileName = uploadResult.file.originalFileName;
      }

      await addDoc(collection(db, 'materials'), materialData);

      setSuccess(t('courseMaterialsAddSuccess'));
      setMaterialTitle('');
      setExternalUrl('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchData();
    } catch (err: any) {
      console.error('Error adding material:', err);
      setError(err.message || t('courseMaterialsAddFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm(t('courseMaterialsDeleteConfirm'))) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'materials', materialId));
      fetchData();
    } catch (err: any) {
      console.error('Error deleting material:', err);
      setError(err.message || t('courseMaterialsDeleteFailed'));
    }
  };

  const getModuleName = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    return module?.title || t('courseMaterialsUnknownModule');
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
        <div className="flex items-center justify-center py-12">{t('courseMaterialsNotAuthorized')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('courseMaterialsTitle')}</h1>
            <p className="text-gray-600 mt-1">{course.title}</p>
          </div>
          <button
            onClick={() => router.push(`/courses/${params.id}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            {t('courseMaterialsBackToCourse')}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {modules.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">{t('courseMaterialsNeedModule')}</p>
            <button
              onClick={() => router.push(`/courses/${params.id}/modules`)}
              className="btn-primary"
            >
              {t('courseMaterialsManageModules')}
            </button>
          </div>
        ) : (
          <>
            {/* Add Material Form */}
            <form onSubmit={handleSubmit} className="card mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('courseMaterialsAddNewMaterial')}</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('courseMaterialsModule')}</label>
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      className="input-field"
                    >
                      {modules.map(module => (
                        <option key={module.id} value={module.id}>{module.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">{t('courseMaterialsMaterialType')}</label>
                    <select
                      value={materialType}
                      onChange={(e) => {
                        setMaterialType(e.target.value as MaterialType);
                        setSelectedFile(null);
                        setExternalUrl('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="input-field"
                    >
                      <option value="pdf">{t('courseMaterialsTypePdf')}</option>
                      <option value="image">{t('courseMaterialsTypeImage')}</option>
                      <option value="link">{t('courseMaterialsTypeLink')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{t('courseMaterialsMaterialTitle')}</label>
                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder={t('courseMaterialsTitlePlaceholder')}
                    className="input-field"
                    required
                  />
                </div>

                <div className="border border-dashed border-gray-200 rounded-lg p-3">
                  <label className="label">{t('courseMaterialsResourceCategory')}</label>
                  <p className="text-xs text-gray-500 mb-2">
                    {t('courseMaterialsResourceHelp')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      value={resourceCategory}
                      onChange={(e) => setResourceCategory(e.target.value)}
                      className="input-field"
                    >
                      <option value="note">{t('courseMaterialsCategoryNote')}</option>
                      <option value="past-paper">{t('courseMaterialsCategoryPastPaper')}</option>
                      <option value="model-paper">{t('courseMaterialsCategoryModelPaper')}</option>
                      <option value="marking-scheme">{t('courseMaterialsCategoryMarkingScheme')}</option>
                    </select>
                    <input
                      type="number"
                      min="1990"
                      max="2100"
                      value={examYear}
                      onChange={(e) => setExamYear(e.target.value)}
                      placeholder={t('courseMaterialsYearPlaceholder')}
                      className="input-field"
                      disabled={resourceCategory === 'note'}
                    />
                    <input
                      type="text"
                      value={examSubject}
                      onChange={(e) => setExamSubject(e.target.value)}
                      placeholder={t('courseMaterialsSubjectPlaceholder')}
                      className="input-field"
                      disabled={resourceCategory === 'note'}
                    />
                    <select
                      value={examMedium}
                      onChange={(e) => setExamMedium(e.target.value)}
                      className="input-field"
                      disabled={resourceCategory === 'note'}
                    >
                      <option value="">{t('courseMaterialsMediumPlaceholder')}</option>
                      <option value="Sinhala">{t('courseSharedMediumSinhala')}</option>
                      <option value="Tamil">{t('courseSharedMediumTamil')}</option>
                      <option value="English">{t('courseSharedMediumEnglish')}</option>
                    </select>
                  </div>
                </div>

                {materialType === 'link' ? (
                  <div>
                    <label className="label">{t('courseMaterialsExternalUrl')}</label>
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder={t('courseMaterialsUrlPlaceholder')}
                      className="input-field"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="label">
                      {materialType === 'pdf' ? t('courseMaterialsFilePdfLabel') : t('courseMaterialsFileImageLabel')}
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept={materialType === 'pdf' ? '.pdf' : 'image/*'}
                      className="input-field"
                      required
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-500 mt-1">
                        {t('courseMaterialsSelected')} {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary w-full"
                >
                  {uploading ? t('courseMaterialsUploading') : t('courseMaterialsAddButton')}
                </button>
              </div>
            </form>

            {/* Materials List */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('courseMaterialsCourseMaterials')}</h2>
              
              {materials.length > 0 ? (
                <div className="space-y-4">
                  {modules.map(module => {
                    const moduleMaterials = materials.filter(m => m.moduleId === module.id);
                    if (moduleMaterials.length === 0) return null;
                    
                    return (
                      <div key={module.id} className="border rounded-lg p-4">
                        <h3 className="font-medium text-gray-900 mb-3">{module.title}</h3>
                        <div className="space-y-2">
                          {moduleMaterials.map(material => (
                            <div 
                              key={material.id} 
                              className="flex items-center justify-between p-3 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-3">
                                {material.type === 'pdf' && <FilePdfOutlined className="text-red-600" />}
                                {material.type === 'image' && <FileImageOutlined className="text-blue-600" />}
                                {material.type === 'link' && <LinkOutlined className="text-green-600" />}
                                <div>
                                  <p className="font-medium text-gray-900">{material.title}</p>
                                  {material.fileSize && material.fileSize > 0 ? (
                                    <p className="text-xs text-gray-500">
                                      {material.fileSize >= 1024 * 1024 
                                        ? `${(material.fileSize / 1024 / 1024).toFixed(2)} MB`
                                        : `${(material.fileSize / 1024).toFixed(2)} KB`}
                                    </p>
                                  ) : material.originalFileName ? (
                                    <p className="text-xs text-gray-500">{material.originalFileName}</p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {material.type === 'link' && material.externalUrl && (
                                  <a
                                    href={material.externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:text-primary-700 text-sm"
                                  >
                                    {t('courseMaterialsOpen')}
                                  </a>
                                )}
                                {material.filePath && (
                                  <a
                                    href={`/api/files/${material.filePath.split('/').pop()}`}
                                    download={material.originalFileName}
                                    className="text-primary-600 hover:text-primary-700 text-sm"
                                  >
                                    {t('courseMaterialsDownload')}
                                  </a>
                                )}
                                <button
                                  onClick={() => handleDeleteMaterial(material.id)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  {t('courseMaterialsDelete')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t('courseMaterialsEmpty')}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

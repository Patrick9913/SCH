'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';
import { db } from '@/app/config';
import { useAuthContext } from '@/app/context/authContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useUserPermissions } from '@/app/utils/rolePermissions';
import { HiAcademicCap, HiArrowRight, HiCheck, HiX, HiExclamationCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { User } from '@/app/types/user';
import { Course } from '@/app/types/course';

interface StudentTransition {
  uid: string;
  name: string;
  currentCourse: string;
  currentLevel: number;
  currentDivision: string;
  nextLevel: number;
  nextDivision: string;
  isEgresado: boolean;
  excluded: boolean;
}

type TransitionStep = 'preview' | 'selection' | 'confirmation' | 'processing' | 'completed';

export const YearTransition: React.FC = () => {
  const { user } = useAuthContext();
  const { users } = useTriskaContext();
  
  // Usar el nuevo sistema de permisos
  const permissions = useUserPermissions(user?.role);
  
  const [step, setStep] = useState<TransitionStep>('preview');
  const [students, setStudents] = useState<StudentTransition[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Verificar que sea SuperAdmin
  if (!permissions.canPerformYearTransition) {
    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-8">
        <div className="max-w-md mx-auto text-center">
          <HiExclamationCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">
            Solo el Super Administrador puede realizar el pase de año.
          </p>
        </div>
      </div>
    );
  }

  // Cargar estudiantes y cursos
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar cursos
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesData: Course[] = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Course));
      setCourses(coursesData);

      // Filtrar solo estudiantes activos
      const activeStudents = users.filter(u => 
        u.role === 3 && 
        u.status === 'active' && 
        u.courseId
      );

      // Crear mapa de transiciones
      const transitions: StudentTransition[] = activeStudents.map(student => {
        const currentCourse = coursesData.find(c => c.id === student.courseId);
        if (!currentCourse) {
          return null;
        }

        const currentLevel = currentCourse.level;
        const currentDivision = currentCourse.division;
        const nextLevel = currentLevel + 1;
        const isEgresado = currentLevel >= 5; // 5to año es el último

        // Buscar curso de destino (mismo division, siguiente nivel)
        const nextCourse = coursesData.find(c => 
          c.level === nextLevel && 
          c.division === currentDivision
        );

        return {
          uid: student.uid,
          name: student.name,
          currentCourse: student.courseId!,
          currentLevel,
          currentDivision,
          nextLevel: isEgresado ? currentLevel : nextLevel,
          nextDivision: nextCourse ? nextCourse.division : currentDivision,
          isEgresado,
          excluded: false
        };
      }).filter(Boolean) as StudentTransition[];

      setStudents(transitions);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar estudiantes por búsqueda
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(term) ||
      s.currentCourse.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  // Agrupar estudiantes por curso actual
  const groupedStudents = useMemo(() => {
    const groups: { [key: string]: StudentTransition[] } = {};
    filteredStudents.forEach(student => {
      const key = `${student.currentLevel}°${student.currentDivision}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(student);
    });
    return groups;
  }, [filteredStudents]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = students.length;
    const excluded = students.filter(s => s.excluded).length;
    const toPromote = total - excluded;
    const egresados = students.filter(s => s.isEgresado && !s.excluded).length;
    return { total, excluded, toPromote, egresados };
  }, [students]);

  // Toggle exclusión de estudiante
  const toggleExclusion = (uid: string) => {
    setStudents(prev => prev.map(s => 
      s.uid === uid ? { ...s, excluded: !s.excluded } : s
    ));
  };

  // Excluir/incluir todo un curso
  const toggleCourseExclusion = (courseKey: string, exclude: boolean) => {
    setStudents(prev => prev.map(s => {
      const key = `${s.currentLevel}°${s.currentDivision}`;
      return key === courseKey ? { ...s, excluded: exclude } : s;
    }));
  };

  // Ejecutar pase de año
  const executeTransition = async () => {
    if (!window.confirm(
      `¿Estás seguro de ejecutar el pase de año?\n\n` +
      `- ${stats.toPromote} estudiantes serán promovidos\n` +
      `- ${stats.egresados} estudiantes se convertirán en egresados\n` +
      `- ${stats.excluded} estudiantes NO serán promovidos\n\n` +
      `Esta acción NO se puede deshacer.`
    )) {
      return;
    }

    try {
      setProcessing(true);
      setStep('processing');
      setProgress(0);

      const studentsToPromote = students.filter(s => !s.excluded);
      const batchSize = 500; // Firestore limit
      let processed = 0;

      for (let i = 0; i < studentsToPromote.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchStudents = studentsToPromote.slice(i, i + batchSize);

        for (const student of batchStudents) {
          const userRef = doc(db, 'users', student.uid);
          
          if (student.isEgresado) {
            // Marcar como egresado con el año actual
            const currentYear = new Date().getFullYear();
            batch.update(userRef, {
              status: 'egresado',
              level: student.currentLevel,
              egresadoDate: Date.now(),
              egresadoYear: currentYear, // Año de egreso para agrupar
              uid: student.uid // Mantener uid consistente
            });
          } else {
            // Buscar o crear curso de destino
            const nextCourse = courses.find(c => 
              c.level === student.nextLevel && 
              c.division === student.nextDivision
            );

            if (nextCourse) {
              // Actualizar al siguiente curso
              batch.update(userRef, {
                courseId: nextCourse.id,
                level: student.nextLevel,
                division: student.nextDivision,
                uid: student.uid // Mantener uid consistente
              });

              // Agregar estudiante al curso
              const courseRef = doc(db, 'courses', nextCourse.id);
              const updatedStudentUids = Array.from(
                new Set([...nextCourse.studentUids, student.uid])
              );
              batch.update(courseRef, {
                studentUids: updatedStudentUids,
                updatedAt: Date.now()
              });

              // Remover del curso anterior
              const prevCourse = courses.find(c => c.id === student.currentCourse);
              if (prevCourse) {
                const prevCourseRef = doc(db, 'courses', prevCourse.id);
                const updatedPrevStudentUids = prevCourse.studentUids.filter(
                  uid => uid !== student.uid
                );
                batch.update(prevCourseRef, {
                  studentUids: updatedPrevStudentUids,
                  updatedAt: Date.now()
                });
              }
            }
          }

          processed++;
          setProgress(Math.round((processed / studentsToPromote.length) * 100));
        }

        await batch.commit();
      }

      setStep('completed');
      toast.success(`¡Pase de año completado! ${stats.toPromote} estudiantes promovidos.`);
      
      // Recargar datos después de 3 segundos
      setTimeout(() => {
        loadData();
        setStep('preview');
      }, 5000);

    } catch (error) {
      console.error('Error en pase de año:', error);
      toast.error('Error al ejecutar el pase de año');
      setStep('confirmation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando información...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3 mb-4">
          <HiAcademicCap className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Pase de Año</h1>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            <span className="font-medium">1. Preview</span>
          </div>
          <HiArrowRight className="text-gray-400" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            step === 'selection' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            <span className="font-medium">2. Selección</span>
          </div>
          <HiArrowRight className="text-gray-400" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            step === 'confirmation' || step === 'processing' || step === 'completed' 
              ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            <span className="font-medium">3. Confirmación</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Total Estudiantes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200 bg-green-50">
            <p className="text-sm text-green-700">A Promover</p>
            <p className="text-2xl font-bold text-green-700">{stats.toPromote}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-purple-200 bg-purple-50">
            <p className="text-sm text-purple-700">Egresados</p>
            <p className="text-2xl font-bold text-purple-700">{stats.egresados}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-orange-200 bg-orange-50">
            <p className="text-sm text-orange-700">Excluidos</p>
            <p className="text-2xl font-bold text-orange-700">{stats.excluded}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {step === 'processing' && (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Procesando Pase de Año...</h3>
            <p className="text-gray-600 mb-4">Por favor, no cierres esta ventana</p>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{progress}% completado</p>
          </div>
        )}

        {step === 'completed' && (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <HiCheck className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Pase de Año Completado!</h3>
            <p className="text-gray-600 mb-4">
              Se han promovido {stats.toPromote} estudiantes exitosamente.
            </p>
            <p className="text-sm text-gray-500">Redirigiendo...</p>
          </div>
        )}

        {(step === 'preview' || step === 'selection' || step === 'confirmation') && (
          <>
            {/* Search bar */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Buscar estudiante o curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Grouped students */}
            <div className="space-y-6">
              {Object.keys(groupedStudents).sort().map(courseKey => {
                const courseStudents = groupedStudents[courseKey];
                const allExcluded = courseStudents.every(s => s.excluded);
                const someExcluded = courseStudents.some(s => s.excluded) && !allExcluded;

                return (
                  <div key={courseKey} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-900">{courseKey}</h3>
                        <span className="text-sm text-gray-600">
                          ({courseStudents.length} estudiantes)
                        </span>
                      </div>
                      {step === 'selection' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleCourseExclusion(courseKey, false)}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                          >
                            Incluir Todos
                          </button>
                          <button
                            onClick={() => toggleCourseExclusion(courseKey, true)}
                            className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                          >
                            Excluir Todos
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="divide-y divide-gray-200">
                      {courseStudents.map(student => (
                        <div
                          key={student.uid}
                          className={`p-4 flex items-center justify-between ${
                            student.excluded ? 'bg-orange-50' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-sm text-gray-600">
                                {student.currentLevel}°{student.currentDivision}
                              </p>
                            </div>

                            <HiArrowRight className="text-gray-400" />

                            <div className="flex-1">
                              {student.isEgresado ? (
                                <div className="flex items-center gap-2">
                                  <HiAcademicCap className="text-purple-600" />
                                  <span className="font-medium text-purple-700">Egresado</span>
                                </div>
                              ) : (
                                <p className="font-medium text-green-700">
                                  {student.nextLevel}°{student.nextDivision}
                                </p>
                              )}
                            </div>
                          </div>

                          {step === 'selection' && (
                            <button
                              onClick={() => toggleExclusion(student.uid)}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                student.excluded
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                              }`}
                            >
                              {student.excluded ? 'Incluir' : 'Excluir'}
                            </button>
                          )}

                          {step === 'confirmation' && student.excluded && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">
                              Excluido
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No se encontraron estudiantes</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      {(step === 'preview' || step === 'selection' || step === 'confirmation') && (
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
          <div>
            {step !== 'preview' && (
              <button
                onClick={() => {
                  if (step === 'selection') setStep('preview');
                  if (step === 'confirmation') setStep('selection');
                }}
                className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Volver
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {step === 'preview' && (
              <button
                onClick={() => setStep('selection')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Continuar a Selección
              </button>
            )}

            {step === 'selection' && (
              <button
                onClick={() => setStep('confirmation')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Continuar a Confirmación
              </button>
            )}

            {step === 'confirmation' && (
              <button
                onClick={executeTransition}
                disabled={processing}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <HiCheck className="w-5 h-5" />
                Ejecutar Pase de Año
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


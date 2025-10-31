'use client';

import React, { useMemo, useState } from 'react';
import { useGrades } from '@/app/context/gradesContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { useCourses } from '@/app/context/courseContext';
import { Assignments, UserCurses, User } from '@/app/types/user';
import { GradeLabels, PeriodLabels, Period } from '@/app/types/grade';
import { HiDocumentText, HiPrinter } from 'react-icons/hi';
import { HiCog } from 'react-icons/hi';
import { RefreshButton } from '../reusable/RefreshButton';
import { BulletinTemplate } from '../reusable/BulletinTemplate';
import { useSettings } from '@/app/context/settingsContext';
import { useSubjects } from '@/app/context/subjectContext';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export const BulletinReports: React.FC = () => {
  const { grades, publishGrades, publishBulletins, getBulletinStatus, refreshGrades } = useGrades();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();
  const { courses } = useCourses();
  const { isMainAdmin, gradeLoadingEnabled, toggleGradeLoading, isConnected, lastUpdated } = useSettings();
  const { subjects } = useSubjects();
  
  // Estados para la publicación de boletines
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Estados para la vista de boletín individual
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [showBulletinTemplate, setShowBulletinTemplate] = useState(false);
  
  // Estado para el curso seleccionado en la vista de administrador
  const [selectedAdminCourse, setSelectedAdminCourse] = useState<number | null>(null);

  const isStaff = user?.role === 1 || user?.role === 4 || user?.role === 2;
  const isStudent = user?.role === 3;
  const isFamily = user?.role === 5;
  
  // Obtener el estudiante relacionado si es Familia
  const relatedStudent = useMemo(() => {
    if (!user || !isFamily || !user.childId) return null;
    return users.find(u => u.uid === user.childId || u.id === user.childId);
  }, [user, isFamily, users]);
  
  // Obtener el estudiante objetivo (el propio estudiante o el hijo si es familia)
  const targetStudent = useMemo(() => {
    if (isStudent && user) return user;
    if (isFamily && relatedStudent) return relatedStudent;
    return null;
  }, [isStudent, isFamily, user, relatedStudent]);

  // Estado computado basado en alumnos asignados a materias del curso (fuente real de inscriptos)
  const computedStatus = useMemo(() => {
    if (!selectedCourse || !selectedPeriod) return null;
    const courseSubjects = subjects.filter(s => s.courseLevel === selectedCourse);
    const enrolledUids = new Set<string>();
    courseSubjects.forEach(s => (s.studentUids || []).forEach(uid => enrolledUids.add(uid)));
    const totalStudents = enrolledUids.size;
    const coursePeriodGrades = grades.filter(g => g.courseLevel === selectedCourse && g.period === selectedPeriod);
    const gradedStudents = Array.from(enrolledUids).filter(uid => coursePeriodGrades.some(g => g.studentUid === uid)).length;
    const publishedStudents = Array.from(enrolledUids).filter(uid => {
      const sg = coursePeriodGrades.filter(g => g.studentUid === uid);
      return sg.length > 0 && sg.every(g => g.published);
    }).length;
    return { totalStudents, gradedStudents, publishedStudents, isComplete: gradedStudents === totalStudents && totalStudents > 0 };
  }, [subjects, grades, selectedCourse, selectedPeriod]);

  // Función para manejar la publicación de boletines
  const handlePublishBulletins = async () => {
    if (!selectedCourse || !selectedPeriod) {
      toast.error('Por favor selecciona un curso y período');
      return;
    }

    const bulletinStatus = computedStatus || getBulletinStatus(selectedCourse, selectedPeriod);
    
    if (!bulletinStatus.isComplete) {
      const missing = Math.max(0, bulletinStatus.totalStudents - bulletinStatus.gradedStudents);
      const courseName = Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === selectedCourse) || 'Curso';
      const periodName = PeriodLabels[selectedPeriod];
      const confirm = await Swal.fire({
        title: 'Faltan calificaciones',
        html: `
          <div style="text-align:left">
            <p>Hay <strong>${missing}</strong> estudiante(s) sin calificaciones para:</n>
            <p><strong>• Curso:</strong> ${courseName}</p>
            <p><strong>• Período:</strong> ${periodName}</p>
            <p style="font-size:0.875rem;color:#92400e;margin-top:8px;">Puedes publicar de todos modos. Solo se publicarán las calificaciones existentes; los estudiantes sin notas no verán calificaciones en este período.</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Publicar de todos modos',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#6b7280',
        reverseButtons: true,
      });
      if (!confirm.isConfirmed) return;
    }

    const courseName = Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === selectedCourse) || 'Curso';
    const periodName = PeriodLabels[selectedPeriod];

    const result = await Swal.fire({
      title: '¿Publicar Boletines?',
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 8px;">¿Estás seguro de que deseas publicar los boletines para:</p>
          <p style="font-weight: bold; margin-bottom: 8px;">• Curso: ${courseName}</p>
          <p style="font-weight: bold; margin-bottom: 8px;">• Período: ${periodName}</p>
          <p style="font-size: 0.875rem; color: #6b7280;">Esta acción hará visibles las calificaciones para todos los estudiantes del curso.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Publicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setIsPublishing(true);
      try {
        const result = await publishBulletins(selectedCourse, selectedPeriod);
        
        if (result.success) {
          toast.success(result.message);
          setSelectedCourse(null);
          setSelectedPeriod(null);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error('Error al publicar boletines:', error);
        toast.error('Error al publicar los boletines');
      } finally {
        setIsPublishing(false);
      }
    }
  };

  // Función para manejar el toggle con confirmación
  const handleToggle = async () => {
    const action = gradeLoadingEnabled ? 'deshabilitar' : 'habilitar';
    const actionPast = gradeLoadingEnabled ? 'deshabilitada' : 'habilitada';
    
    const result = await Swal.fire({
      title: `¿Estás seguro?`,
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 8px;">¿Estás seguro de que deseas <strong>${action}</strong> la carga de notas?</p>
          <p style="font-size: 0.875rem; color: #6b7280;">Esta acción afectará la capacidad de todos los profesores y administradores para registrar calificaciones.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${action}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: gradeLoadingEnabled ? '#dc2626' : '#16a34a',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      // Llamar directamente sin try-catch porque toggleGradeLoading maneja sus propios errores
      toggleGradeLoading().catch((error) => {
        console.error('Error al cambiar el estado:', error);
        // El error ya se maneja dentro de toggleGradeLoading con toast
      });
    }
  };

  // Función para refrescar datos
  const handleRefresh = () => {
    refreshGrades();
  };

  // Función para mostrar boletín individual
  const handleShowBulletin = (student: User) => {
    setSelectedStudent(student);
    setShowBulletinTemplate(true);
  };

  // Función para generar el boletín de un estudiante específico
  const generateStudentBulletin = (student: User) => {
    const studentGrades = grades.filter(g => g.studentUid === student.uid);

    // Agrupar por materia
    const groupedBySubject: Record<number, Record<Period, typeof studentGrades>> = {};
    
    studentGrades.forEach(grade => {
      if (!groupedBySubject[grade.subjectId]) {
        groupedBySubject[grade.subjectId] = {
          primer_cuatrimestre: [],
          segundo_cuatrimestre: [],
          tercer_cuatrimestre: []
        };
      }
      groupedBySubject[grade.subjectId][grade.period].push(grade);
    });

    const courseName = student.level ? Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === student.level) || 'Sin curso' : 'Sin curso';

    return {
      student,
      groupedBySubject,
      courseName
    };
  };

  // Función para cerrar vista de boletín
  const handleCloseBulletin = () => {
    setShowBulletinTemplate(false);
    setSelectedStudent(null);
  };

  // Función para imprimir boletín
  const handlePrintBulletin = () => {
    window.print();
  };

  // Filtrar calificaciones según el usuario
  const visibleGrades = useMemo(() => {
    if (isStaff) {
      // Staff ve todas las calificaciones (publicadas y no publicadas)
      return grades;
    } else if (targetStudent?.uid) {
      // Estudiantes y Familia solo ven calificaciones publicadas
      return grades.filter(g => g.studentUid === targetStudent.uid && g.published);
    }
    return [];
  }, [grades, targetStudent, isStaff]);

  // Agrupar calificaciones por estudiante
  const gradesByStudent = useMemo(() => {
    const grouped: Record<string, typeof visibleGrades> = {};
    visibleGrades.forEach(grade => {
      if (!grouped[grade.studentUid]) {
        grouped[grade.studentUid] = [];
      }
      grouped[grade.studentUid].push(grade);
    });
    return grouped;
  }, [visibleGrades]);

  // Estudiantes del curso seleccionado por el administrador
  const studentsInSelectedCourse = useMemo(() => {
    if (!selectedAdminCourse) return [];
    const courseSubjects = subjects.filter(s => s.courseLevel === selectedAdminCourse);
    const enrolledUids = new Set<string>();
    courseSubjects.forEach(s => (s.studentUids || []).forEach(uid => enrolledUids.add(uid)));
    return users.filter(u => u.role === 3 && enrolledUids.has(u.uid));
  }, [users, selectedAdminCourse, subjects]);

  // Calificaciones de estudiantes del curso seleccionado
  const courseGradesByStudent = useMemo(() => {
    if (!selectedAdminCourse) return {};
    
    const courseGrades = grades.filter(g => g.courseLevel === selectedAdminCourse);
    const grouped: Record<string, typeof courseGrades> = {};
    
    courseGrades.forEach(grade => {
      if (!grouped[grade.studentUid]) {
        grouped[grade.studentUid] = [];
      }
      grouped[grade.studentUid].push(grade);
    });
    
    return grouped;
  }, [grades, selectedAdminCourse]);

  // Para estudiantes y familia: mostrar solo su boletín o el del hijo
  const studentView = useMemo(() => {
    if (!targetStudent?.uid) return null;

    const studentGrades = visibleGrades.filter(g => g.studentUid === targetStudent.uid);

    // Agrupar por materia
    const groupedBySubject: Record<number, Record<Period, typeof studentGrades>> = {};
    
    studentGrades.forEach(grade => {
      if (!groupedBySubject[grade.subjectId]) {
        groupedBySubject[grade.subjectId] = {
          primer_cuatrimestre: [],
          segundo_cuatrimestre: [],
          tercer_cuatrimestre: []
        };
      }
      groupedBySubject[grade.subjectId][grade.period].push(grade);
    });

    const handlePrint = () => {
      window.print();
    };

    // Obtener datos del estudiante
    const studentData = targetStudent;
    const courseName = studentData?.level ? Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === studentData.level) || 'Sin curso' : 'Sin curso';

    return (
      <div className="space-y-6">
        {/* Datos del Estudiante */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 print:border-black">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Datos del Estudiante</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Nombre Completo</h3>
              <p className="text-lg font-semibold text-gray-800">{studentData?.name || 'No disponible'}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Curso</h3>
              <p className="text-lg font-semibold text-gray-800">{courseName}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Año Escolar</h3>
              <p className="text-lg font-semibold text-gray-800">{new Date().getFullYear()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Fecha de Emisión</h3>
              <p className="text-lg font-semibold text-gray-800">{new Date().toLocaleDateString('es-ES')}</p>
            </div>
          </div>
        </div>

        {/* Tabla de Calificaciones */}
        {Object.keys(groupedBySubject).length > 0 && (
          <div className="grades-table bg-white rounded-lg border border-gray-200 overflow-hidden print:border-black">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Boletín de Calificaciones</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                      Materia
                    </th>
                    {Object.entries(PeriodLabels).map(([periodKey, periodLabel]) => (
                      <th key={periodKey} className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                        {periodLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(groupedBySubject).map(([subjectId, periods]) => {
                    const assignmentKey = Object.keys(Assignments).find(
                      key => Assignments[key as keyof typeof Assignments] === Number(subjectId)
                    ) as keyof typeof Assignments | undefined;
                    const subjectName = assignmentKey || `Materia ${subjectId}`;
                    return (
                      <tr key={subjectId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-800 border-r border-gray-200">
                          {subjectName}
                        </td>
                        {Object.entries(PeriodLabels).map(([periodKey, periodLabel]) => {
                          const periodGrades = periods[periodKey as Period];
                          return (
                            <td key={periodKey} className="px-6 py-4 text-center border-r border-gray-200 last:border-r-0">
                              {periodGrades.length > 0 ? (
                                <div className="flex flex-col items-center gap-1">
                                  {periodGrades.map((grade, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className={`grade-badge ${
                                        grade.grade === 'S' ? 's' :
                                        grade.grade === 'AL' ? 'al' :
                                        grade.grade === 'L' ? 'l' :
                                        'ep'
                                      }`}>
                                        {grade.grade}
                                      </span>
                                    </div>
                                  ))}
                                  <span className="text-xs text-gray-500 mt-1">
                                    {GradeLabels[periodGrades[0].grade]}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <span className="text-sm text-gray-400">Sin calificaciones</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {Object.keys(groupedBySubject).length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <HiDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No tienes boletín publicado aún</h3>
              <p className="text-sm text-gray-400">
                Tu boletín será visible aquí una vez que el administrador publique las calificaciones de tu curso.
              </p>
            </div>
          </div>
        )}

        {Object.keys(groupedBySubject).length > 0 && (
          <button
            onClick={handlePrint}
            className="fixed bottom-10 right-10 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 flex items-center gap-2 print:hidden"
          >
            <HiPrinter className="w-5 h-5" />
            Imprimir Boletín
          </button>
        )}
      </div>
    );
  }, [targetStudent, visibleGrades, users]);

  // Para admin/staff: ver todos los boletines
  const adminView = useMemo(() => {
    if (!isStaff) return null;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Boletines de Estudiantes</h2>
          <div className="text-sm text-gray-600">
            Selecciona un curso para ver los boletines de los estudiantes
          </div>
        </div>

        {/* Selector de Curso para Administrador */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Curso
          </label>
          <select
            value={selectedAdminCourse || ''}
            onChange={(e) => setSelectedAdminCourse(Number(e.target.value) || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona un curso</option>
            {courses.map(course => (
              <option key={course.id} value={course.level}>
                {Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === course.level)}
                {course.division ? ` - División ${course.division}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de Estudiantes del Curso Seleccionado */}
        {selectedAdminCourse && studentsInSelectedCourse.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Estudiantes de {Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === selectedAdminCourse)}
            </h2>
            
            {studentsInSelectedCourse.map((student) => {
              const studentGrades = courseGradesByStudent[student.uid] || [];
              const publishedGrades = studentGrades.filter(g => g.published).length;
              const totalGrades = studentGrades.length;
              const isFullyPublished = totalGrades > 0 && publishedGrades === totalGrades;

              return (
                <div key={student.uid} className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{student.name}</h3>
                        {student.mail && (
                          <p className="text-sm text-gray-500">{student.mail}</p>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isFullyPublished 
                          ? 'bg-green-100 text-green-800' 
                          : publishedGrades > 0 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isFullyPublished ? 'Completo' : `${publishedGrades}/${totalGrades}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleShowBulletin(student)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
                    >
                      <HiDocumentText className="w-4 h-4" />
                      Ver Boletín
                    </button>
                  </div>

                  {/* Resumen de calificaciones por período */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(PeriodLabels).map(([periodKey, periodLabel]) => {
                      const periodGrades = studentGrades.filter(g => g.period === periodKey);
                      return (
                        <div key={periodKey} className="bg-white p-3 rounded border">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">{periodLabel}</h4>
                          {periodGrades.length > 0 ? (
                            <div className="space-y-1">
                              {periodGrades.map((grade) => {
                                const assignmentKey = Object.keys(Assignments).find(
                                  key => Assignments[key as keyof typeof Assignments] === grade.subjectId
                                ) as keyof typeof Assignments | undefined;
                                const subjectName = assignmentKey || `Materia ${grade.subjectId}`;
                                return (
                                  <div key={grade.id} className="text-xs">
                                    <span className="font-medium">{subjectName}: </span>
                                    <span className={grade.published ? 'text-green-600 font-semibold' : 'text-orange-500'}>
                                      {grade.grade} {grade.published ? '✓' : '(pendiente)'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">Sin calificaciones</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedAdminCourse && studentsInSelectedCourse.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No hay estudiantes en este curso</p>
          </div>
        )}

        {!selectedAdminCourse && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">Selecciona un curso para ver los boletines de los estudiantes</p>
          </div>
        )}
      </div>
    );
  }, [isStaff, selectedAdminCourse, studentsInSelectedCourse, courseGradesByStudent]);

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <HiDocumentText className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900">Boletines</h1>
          </div>
          <RefreshButton 
            onRefresh={handleRefresh}
            tooltip="Actualizar boletines"
            size="md"
          />
        </div>
        <p className="text-sm text-gray-500">
          {(isStudent || isFamily)
            ? (isFamily ? 'Consulta el boletín de calificaciones' : 'Consulta tu boletín de calificaciones')
            : isMainAdmin
            ? 'Gestiona y publica los boletines de calificaciones'
            : 'Consulta los boletines de los estudiantes'}
        </p>
      </div>

      {/* Panel de Control para Administradores (role === 1) */}
      {user?.role === 1 && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HiCog className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-800 text-lg">Control de Carga de Notas</h3>
                <p className="text-sm text-gray-600">
                  Estado actual: 
                  <span className={`font-semibold ml-1 ${
                    gradeLoadingEnabled ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {gradeLoadingEnabled ? 'HABILITADA' : 'DESHABILITADA'}
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-gray-500">
                    {isConnected ? 'Conectado en tiempo real' : 'Desconectado'}
                  </span>
                  {lastUpdated && (
                    <span className="text-xs text-gray-400">
                      • Última actualización: {new Date(lastUpdated).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                {/* Debug info temporal */}
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                  <strong>Debug:</strong> Estado: {gradeLoadingEnabled ? 'HABILITADA' : 'DESHABILITADA'} | 
                  Conexión: {isConnected ? 'ACTIVA' : 'INACTIVA'} | 
                  Timestamp: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'N/A'}
                </div>
                {!isConnected && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                    ⚠️ Sin conexión en tiempo real. El botón sigue funcionando pero los cambios pueden tardar en reflejarse.
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleToggle}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                gradeLoadingEnabled
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } ${!isConnected ? 'opacity-75' : ''}`}
            >
              {gradeLoadingEnabled ? 'Deshabilitar Carga' : 'Habilitar Carga'}
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-white rounded border border-gray-200">
            <p className="text-sm text-gray-700">
              <strong className="font-semibold">Nota:</strong> Cuando la carga de notas está{' '}
              <span className="font-semibold text-blue-600">habilitada</span>, los profesores y 
              administradores pueden registrar calificaciones. Cuando está{' '}
              <span className="font-semibold text-gray-600">deshabilitada</span>, 
              solo tú puedes ver y gestionar los boletines, pero no se pueden cargar nuevas notas.
            </p>
          </div>
        </div>
      )}

      {/* Panel de Publicación de Boletines para Administradores (role === 1) */}
      {user?.role === 1 && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <HiDocumentText className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">Publicación de Boletines</h3>
              <p className="text-sm text-gray-600">
                Publica los boletines para que los estudiantes puedan ver sus calificaciones
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Selector de Curso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Curso
              </label>
              <select
                value={selectedCourse || ''}
                onChange={(e) => setSelectedCourse(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecciona un curso</option>
                {courses.map(course => (
                  <option key={course.id} value={course.level}>
                    {Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === course.level)}
                    {course.division ? ` - División ${course.division}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Período
              </label>
              <select
                value={selectedPeriod || ''}
                onChange={(e) => setSelectedPeriod(e.target.value as Period || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecciona un período</option>
                {Object.entries(PeriodLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón de Publicación */}
            <div className="flex items-end">
              <button
                onClick={handlePublishBulletins}
                disabled={!selectedCourse || !selectedPeriod || isPublishing}
                className={`w-full px-4 py-2 rounded-md font-semibold transition-all ${
                  selectedCourse && selectedPeriod && !isPublishing
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isPublishing ? 'Publicando...' : 'Publicar Boletines'}
              </button>
            </div>
          </div>

          {/* Estado del Boletín */}
          {selectedCourse && selectedPeriod && (
            <div className="mt-4 p-4 bg-white rounded border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Estado del Boletín</h4>
              {(() => {
                const status = computedStatus || getBulletinStatus(selectedCourse, selectedPeriod);
                const courseName = Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === selectedCourse) || 'Curso';
                const periodName = PeriodLabels[selectedPeriod];
                
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Curso:</strong> {courseName} | <strong>Período:</strong> {periodName}
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{status.totalStudents}</div>
                        <div className="text-gray-500">Total Estudiantes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-orange-600">{status.gradedStudents}</div>
                        <div className="text-gray-500">Con Calificaciones</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{status.publishedStudents}</div>
                        <div className="text-gray-500">Publicados</div>
                      </div>
                    </div>
                    {status.isComplete ? (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                        ✅ Todos los estudiantes tienen calificaciones. Listo para publicar.
                      </div>
                    ) : (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                        ⚠️ Faltan calificaciones para {status.totalStudents - status.gradedStudents} estudiantes.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Vista según rol */}
      {(isStudent || isFamily) && studentView}
      {isFamily && !relatedStudent && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            No hay estudiante vinculado
          </h3>
          <p className="text-yellow-700">
            Tu cuenta no está vinculada a ningún estudiante. Contacta con la administración para vincular tu cuenta a tu hijo/hija.
          </p>
        </div>
      )}
      {isStaff && adminView}

      {/* Modal/Vista de Boletín Individual */}
      {showBulletinTemplate && selectedStudent && (() => {
        const bulletinData = generateStudentBulletin(selectedStudent);
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">
                  Boletín de {selectedStudent.name}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintBulletin}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <HiPrinter className="w-4 h-4" />
                    Imprimir
                  </button>
                  <button
                    onClick={handleCloseBulletin}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Datos del Estudiante */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 print:border-black mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Datos del Estudiante</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Nombre Completo</h3>
                      <p className="text-lg font-semibold text-gray-800">{selectedStudent.name}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Curso</h3>
                      <p className="text-lg font-semibold text-gray-800">{bulletinData.courseName}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Año Escolar</h3>
                      <p className="text-lg font-semibold text-gray-800">{new Date().getFullYear()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Fecha de Emisión</h3>
                      <p className="text-lg font-semibold text-gray-800">{new Date().toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                </div>

                {/* Tabla de Calificaciones */}
                {Object.keys(bulletinData.groupedBySubject).length > 0 && (
                  <div className="grades-table bg-white rounded-lg border border-gray-200 overflow-hidden print:border-black">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-800">Boletín de Calificaciones</h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                              Materia
                            </th>
                            {Object.entries(PeriodLabels).map(([periodKey, periodLabel]) => (
                              <th key={periodKey} className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                                {periodLabel}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(bulletinData.groupedBySubject).map(([subjectId, periods]) => {
                            const assignmentKey = Object.keys(Assignments).find(
                              key => Assignments[key as keyof typeof Assignments] === Number(subjectId)
                            ) as keyof typeof Assignments | undefined;
                            const subjectName = assignmentKey || `Materia ${subjectId}`;
                            return (
                              <tr key={subjectId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-800 border-r border-gray-200">
                                  {subjectName}
                                </td>
                                {Object.entries(PeriodLabels).map(([periodKey, periodLabel]) => {
                                  const periodGrades = periods[periodKey as Period];
                                  return (
                                    <td key={periodKey} className="px-6 py-4 text-center border-r border-gray-200 last:border-r-0">
                                      {periodGrades.length > 0 ? (
                                        <div className="flex flex-col items-center gap-1">
                                          {periodGrades.map((grade, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                              <span className={`grade-badge ${
                                                grade.grade === 'S' ? 's' :
                                                grade.grade === 'AL' ? 'al' :
                                                grade.grade === 'L' ? 'l' :
                                                'ep'
                                              }`}>
                                                {grade.grade}
                                              </span>
                                            </div>
                                          ))}
                                          <span className="text-xs text-gray-500 mt-1">
                                            {GradeLabels[periodGrades[0].grade]}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="text-center">
                                          <span className="text-sm text-gray-400">Sin calificaciones</span>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {Object.keys(bulletinData.groupedBySubject).length === 0 && (
                  <div className="text-center py-12">
                    <div className="max-w-md mx-auto">
                      <HiDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-500 mb-2">No hay calificaciones registradas</h3>
                      <p className="text-sm text-gray-400">
                        Este estudiante no tiene calificaciones registradas aún.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
};


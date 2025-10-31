'use client';

import React, { useState, useMemo } from 'react';
import { useGrades } from '@/app/context/gradesContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { useCourses } from '@/app/context/courseContext';
import { Assignments, UserCurses } from '@/app/types/user';
import { GradeLabels, PeriodLabels, GradeValue, Period } from '@/app/types/grade';
import { HiChartBar, HiCheck } from 'react-icons/hi';
import { useSettings } from '@/app/context/settingsContext';
import { useSubjects } from '@/app/context/subjectContext';
import { Subject } from '@/app/types/subject';
import { RefreshButton } from '../reusable/RefreshButton';
import Swal from 'sweetalert2';
import { 
  isAdmin, 
  isStaff, 
  isTeacher, 
  canManageGrades, 
  getAvailableSubjects, 
  getAvailableCourses,
  getSubjectName,
  getCourseName
} from '@/app/utils/permissions';

export const Grades: React.FC = () => {
  const { grades, addMultipleGrades, getGradeForStudent, refreshGrades } = useGrades();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();
  const { courses } = useCourses();
  const { gradeLoadingEnabled, isMainAdmin, isConnected } = useSettings();
  const { 
    subjects,
    getSubjectsByTeacher, 
    getSubjectByCourseAndSubject,
    isTeacherAssignedToSubject 
  } = useSubjects();

  const isStaffUser = isStaff(user);
  const isAdminUser = isAdmin(user);
  const isTeacherUser = isTeacher(user);
  const isStudent = user?.role === 3;
  const isFamily = user?.role === 5;
  const canManage = canManageGrades(user);
  
  // Obtener el estudiante relacionado si es Familia
  const relatedStudent = useMemo(() => {
    if (!user || !isFamily || !user.childId) return null;
    return users.find(u => u.uid === user.childId || u.id === user.childId);
  }, [user, isFamily, users]);

  // Estados para el flujo de registro
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null); // ID de Firestore del curso
  const [selectedCourseDivision, setSelectedCourseDivision] = useState<string | null>(null); // División del curso seleccionado
  const [selectedSubject, setSelectedSubject] = useState<number | string | ''>(''); // Puede ser enum ID o Firestore ID
  const [selectedSubjectFirestoreId, setSelectedSubjectFirestoreId] = useState<string | null>(null); // ID de Firestore si hay división
  const [selectedPeriod, setSelectedPeriod] = useState<Period | ''>('');
  const [studentGrades, setStudentGrades] = useState<Record<string, GradeValue>>({});

  // Obtener materias y cursos disponibles según permisos
  const availableSubjects = useMemo(() => {
    if (isAdminUser || isStaffUser) {
      // Admin y Staff pueden ver todas las materias creadas
      // Filtrar por curso seleccionado si hay uno seleccionado
      let filtered = selectedCourse 
        ? subjects.filter(s => s.courseLevel === selectedCourse)
        : subjects;
      
      // Si hay división seleccionada, filtrar también por división
      if (selectedCourseDivision && filtered.length > 0) {
        filtered = filtered.filter(s => s.courseDivision === selectedCourseDivision);
      }
      // Ordenar: primero por nombre de materia (alfabético), luego por división (A, B, C)
      const sorted = [...filtered].sort((a, b) => {
        // 1. Ordenar por nombre de materia
        if (a.name !== b.name) {
          return a.name.localeCompare(b.name);
        }
        // 2. Si tienen el mismo nombre, ordenar por división (A antes que B, etc.)
        const divA = a.courseDivision || '';
        const divB = b.courseDivision || '';
        return divA.localeCompare(divB);
      });
      return sorted.map(subject => ({
        id: subject.subjectId, // Enum ID para compatibilidad
        name: subject.name,
        courseDivision: subject.courseDivision,
        firestoreId: subject.id // ID de Firestore para identificar la materia específica cuando hay división
      }));
    } else if (isTeacherUser && user) {
      // Docente solo ve sus materias asignadas usando el nuevo sistema
      const teacherSubjects = getSubjectsByTeacher(user.uid);
      // Filtrar por curso seleccionado si hay uno seleccionado
      let filtered = selectedCourse 
        ? teacherSubjects.filter(s => s.courseLevel === selectedCourse)
        : teacherSubjects;
      
      // Si hay división seleccionada, filtrar también por división
      if (selectedCourseDivision && filtered.length > 0) {
        filtered = filtered.filter(s => s.courseDivision === selectedCourseDivision);
      }
      
      // Ordenar: primero por nombre de materia (alfabético), luego por división (A, B, C)
      const sorted = [...filtered].sort((a, b) => {
        // 1. Ordenar por nombre de materia
        if (a.name !== b.name) {
          return a.name.localeCompare(b.name);
        }
        // 2. Si tienen el mismo nombre, ordenar por división (A antes que B, etc.)
        const divA = a.courseDivision || '';
        const divB = b.courseDivision || '';
        return divA.localeCompare(divB);
      });
      return sorted.map(subject => ({
        id: subject.subjectId, // Enum ID para compatibilidad
        name: subject.name,
        courseDivision: subject.courseDivision,
        firestoreId: subject.id // ID de Firestore para identificar la materia específica cuando hay división
      }));
    }
    return [];
  }, [isAdminUser, isStaffUser, isTeacherUser, user, selectedCourse, selectedCourseDivision, subjects, getSubjectsByTeacher]);

  const availableCourses = useMemo(() => {
    if (isAdminUser || isStaffUser) {
      // Admin y Staff pueden ver todos los cursos creados
      return courses.map(course => ({
        id: course.level,
        name: getCourseName(course.level),
        division: course.division,
        courseId: course.id
      }));
    } else if (isTeacherUser && user) {
      // Docente solo ve sus cursos asignados usando el nuevo sistema
      const teacherSubjects = getSubjectsByTeacher(user.uid);
      const assignedCourseLevels = [...new Set(teacherSubjects.map(ts => ts.courseLevel))];
      return courses
        .filter(course => assignedCourseLevels.includes(course.level))
        .map(course => ({
          id: course.level,
          name: getCourseName(course.level),
          division: course.division,
          courseId: course.id
        }));
    }
    return [];
  }, [isAdminUser, isStaffUser, isTeacherUser, user, courses, getSubjectsByTeacher]);

  // Estudiantes filtrados por curso seleccionado y materia
  const studentsInCourse = useMemo(() => {
    if (!selectedCourse || !selectedSubject) return [];
    
    if (isAdminUser || isStaffUser) {
      // Admin y Staff ven todos los estudiantes del curso (y división si está seleccionada)
      let filtered = users.filter(u => u.role === 3 && u.level === selectedCourse);
      if (selectedCourseDivision) {
        filtered = filtered.filter(u => u.division === selectedCourseDivision);
      }
      return filtered;
    } else if (isTeacherUser && user) {
      // Docente solo ve estudiantes asignados a la materia específica usando el nuevo sistema
      // Si hay ID de Firestore, buscar directamente por ese ID; si no, usar el método tradicional
      let subject: Subject | undefined;
      if (selectedSubjectFirestoreId) {
        subject = subjects.find(s => s.id === selectedSubjectFirestoreId && s.teacherUid === user.uid);
      } else {
        subject = getSubjectByCourseAndSubject(Number(selectedCourse), Number(selectedSubject));
      }
      
      if (!subject || subject.teacherUid !== user.uid) {
        return [];
      }
      
      const assignedStudentUids = subject.studentUids || [];
      if (assignedStudentUids.length === 0) {
        return [];
      }
      
      return users.filter(u => 
        u.role === 3 && 
        u.level === Number(selectedCourse) && 
        assignedStudentUids.includes(u.uid)
      );
    }
    return [];
  }, [users, selectedCourse, selectedCourseDivision, selectedSubject, selectedSubjectFirestoreId, isAdminUser, isStaffUser, isTeacherUser, user, subjects, getSubjectByCourseAndSubject]);

  // Validar que el docente esté asignado a la materia seleccionada
  const canManageSelectedSubject = useMemo(() => {
    if (!selectedSubject || !selectedCourse || !user) return true;
    
    if (isAdminUser || isStaffUser) return true;
    
    if (isTeacherUser) {
      // Si hay ID de Firestore, buscar directamente por ese ID; si no, usar el método tradicional
      let subject: Subject | undefined;
      if (selectedSubjectFirestoreId) {
        subject = subjects.find(s => s.id === selectedSubjectFirestoreId && s.teacherUid === user.uid);
      } else {
        subject = getSubjectByCourseAndSubject(selectedCourse, Number(selectedSubject));
      }
      return subject ? subject.teacherUid === user.uid : false;
    }
    
    return false;
  }, [selectedSubject, selectedCourse, selectedSubjectFirestoreId, user, isAdminUser, isStaffUser, isTeacherUser, subjects, getSubjectByCourseAndSubject]);
  React.useEffect(() => {
    if (!selectedCourse || !selectedSubject || !selectedPeriod) {
      setStudentGrades({});
      return;
    }

    const initialGrades: Record<string, GradeValue> = {};
    studentsInCourse.forEach(student => {
      const existingGrade = getGradeForStudent(
        student.uid,
        Number(selectedSubject),
        Number(selectedCourse),
        selectedPeriod as Period
      );
      if (existingGrade) {
        initialGrades[student.uid] = existingGrade.grade;
      }
    });
    setStudentGrades(initialGrades);
  }, [selectedCourse, selectedSubject, selectedPeriod, studentsInCourse, getGradeForStudent]);

  const handleGradeChange = (studentUid: string, grade: GradeValue) => {
    setStudentGrades(prev => ({
      ...prev,
      [studentUid]: grade
    }));
  };

  const handleSave = async () => {
    if (!selectedCourse || !selectedSubject || !selectedPeriod) return;

    const gradesToSave = Object.entries(studentGrades)
      .filter(([_, grade]) => grade) // Solo incluir si hay una calificación
      .map(([studentUid, grade]) => ({
        studentUid,
        subjectId: Number(selectedSubject),
        courseLevel: Number(selectedCourse),
        period: selectedPeriod as Period,
        grade: grade as GradeValue,
        published: false
      }));

    if (gradesToSave.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Sin calificaciones',
        text: 'No hay calificaciones para guardar',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    try {
      await addMultipleGrades(gradesToSave);
      await Swal.fire({
        icon: 'success',
        title: 'Calificaciones guardadas',
        text: 'Las calificaciones se guardaron correctamente',
        confirmButtonColor: '#2563eb',
      });
      // Resetear el formulario
      setSelectedCourse('');
      setSelectedSubject('');
      setSelectedSubjectFirestoreId(null);
      setSelectedPeriod('');
      setStudentGrades({});
    } catch (error) {
      console.error('Error al guardar calificaciones:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al guardar las calificaciones',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  // Resetear formulario
  const handleReset = () => {
    setSelectedCourse('');
    setSelectedSubject('');
    setSelectedSubjectFirestoreId(null);
    setSelectedPeriod('');
    setStudentGrades({});
  };

  // Función para refrescar datos
  const handleRefresh = () => {
    refreshGrades();
  };

  // Vista para estudiantes y familia
  const studentView = useMemo(() => {
    let targetStudentUid: string | null = null;
    let displayName = '';
    
    if (isStudent && user?.uid) {
      targetStudentUid = user.uid;
      displayName = user.name || 'Estudiante';
    } else if (isFamily && relatedStudent) {
      targetStudentUid = relatedStudent.uid;
      displayName = relatedStudent.name || 'Estudiante';
    } else {
      return null;
    }
    
    if (!targetStudentUid) return null;

    // Solo mostrar calificaciones publicadas
    const studentCourses = grades.filter(g => g.studentUid === targetStudentUid && g.published);

    // Agrupar por materia y periodo
    const groupedBySubject: Record<number, Record<Period, GradeValue[]>> = {};
    
    studentCourses.forEach(grade => {
      if (!groupedBySubject[grade.subjectId]) {
        groupedBySubject[grade.subjectId] = {
          primer_cuatrimestre: [],
          segundo_cuatrimestre: [],
          tercer_cuatrimestre: []
        };
      }
      groupedBySubject[grade.subjectId][grade.period].push(grade.grade);
    });

    return (
      <div className="space-y-6">
        {Object.entries(groupedBySubject).map(([subjectId, periods]) => {
          const subjectName = getSubjectName(Number(subjectId));
          return (
            <div key={subjectId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">{subjectName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(PeriodLabels).map(([periodKey, periodLabel]) => {
                  const periodGrades = periods[periodKey as Period];
                  return (
                    <div key={periodKey} className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-gray-700 mb-2">{periodLabel}</h4>
                      {periodGrades.length > 0 ? (
                        <div className="space-y-1">
                          {periodGrades.map((grade, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-sm font-semibold ${
                                grade === 'S' ? 'bg-green-100 text-green-800' :
                                grade === 'AL' ? 'bg-blue-100 text-blue-800' :
                                grade === 'L' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {grade}
                              </span>
                              <span className="text-sm text-gray-600">{GradeLabels[grade]}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Sin calificaciones</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {Object.keys(groupedBySubject).length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No tienes calificaciones registradas</p>
          </div>
        )}
      </div>
    );
  }, [user, isStudent, isFamily, relatedStudent, users, grades]);

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <HiChartBar className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900">Calificaciones</h1>
          </div>
          <RefreshButton 
            onRefresh={handleRefresh}
            tooltip="Actualizar calificaciones"
            size="md"
          />
        </div>
        <p className="text-sm text-gray-500">
          {canManage 
            ? 'Registra calificaciones seleccionando curso, materia y período' 
            : 'Consulta tus calificaciones por materia y período'}
        </p>
        {isTeacherUser && user && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Materias asignadas:</span> {getAvailableSubjects(user).map(s => s.name).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Vista de Estudiante y Familia */}
      {(isStudent || isFamily) && studentView}
      
      {/* Mensaje para Familia sin hijo asignado */}
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

      {/* Vista de Staff/Docente - Formulario de Registro */}
      {canManage && (
        <>
          {!gradeLoadingEnabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">
                ⏸️ Carga de notas deshabilitada
              </h3>
              <p className="text-yellow-700">
                La carga de notas no está habilitada actualmente. Solo el administrador principal puede habilitar esta función.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-yellow-600">
                  {isConnected ? 'Conectado en tiempo real' : 'Desconectado - Los cambios pueden no reflejarse inmediatamente'}
                </span>
              </div>
            </div>
          )}

          {/* Mensaje cuando el docente no está asignado a la materia */}
          {selectedSubject && selectedCourse && !canManageSelectedSubject && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-red-800 mb-2">
                🚫 No Tienes Acceso a Esta Materia
              </h3>
              <p className="text-red-700">
                No estás asignado a esta materia en este curso. Contacta al administrador para que te asigne a esta materia.
              </p>
            </div>
          )}

          {gradeLoadingEnabled && (
            <div className="space-y-6">
          {/* Paso 1: Seleccionar Curso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Selecciona el Curso
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                const courseData = availableCourses.find(c => c.id === Number(e.target.value));
                setSelectedCourse(Number(e.target.value));
                setSelectedCourseId(courseData?.courseId || null);
                setSelectedCourseDivision(courseData?.division || null);
                setSelectedSubject('');
                setSelectedSubjectFirestoreId(null);
                setSelectedPeriod('');
                setStudentGrades({});
              }}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar curso...</option>
              {availableCourses.map((course) => (
                <option key={course.courseId} value={course.id}>
                  {course.name}{course.division ? ` - División ${course.division}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Paso 2: Seleccionar Materia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Selecciona la Materia
            </label>
            <select
              value={selectedSubjectFirestoreId || selectedSubject}
              onChange={(e) => {
                const value = e.target.value;
                // Si el valor parece ser un ID de Firestore (string largo), guardarlo
                const selectedSubj = availableSubjects.find((s: any) => {
                  const subjWithDiv = s as typeof s & { firestoreId?: string };
                  return (subjWithDiv.firestoreId || s.id.toString()) === value;
                });
                
                if (selectedSubj) {
                  const subjWithDiv = selectedSubj as typeof selectedSubj & { firestoreId?: string };
                  if (subjWithDiv.firestoreId) {
                    setSelectedSubjectFirestoreId(subjWithDiv.firestoreId);
                    setSelectedSubject(selectedSubj.id); // Mantener el enum ID para compatibilidad
                  } else {
                    setSelectedSubjectFirestoreId(null);
                    setSelectedSubject(Number(value));
                  }
                } else {
                  setSelectedSubjectFirestoreId(null);
                  setSelectedSubject(Number(value));
                }
                setSelectedPeriod('');
                setStudentGrades({});
              }}
              disabled={!selectedCourse}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccionar materia...</option>
              {availableSubjects.map((subject, index) => {
                const subjectWithDivision = subject as typeof subject & { courseDivision?: string; firestoreId?: string };
                const displayName = subjectWithDivision.courseDivision 
                  ? `${subject.name} - División ${subjectWithDivision.courseDivision}`
                  : subject.name;
                // Si hay división, usar el ID de Firestore; si no, usar el enum ID
                const optionValue = subjectWithDivision.firestoreId || subject.id.toString();
                return (
                  <option key={`${subject.id}-${selectedCourse}-${index}`} value={optionValue}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Paso 3: Seleccionar Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              3. Selecciona el Período
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value as Period);
              }}
              disabled={!selectedCourse || !selectedSubject}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccionar período...</option>
              {Object.entries(PeriodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Paso 4: Lista de Estudiantes y Calificaciones */}
          {selectedCourse && selectedSubject && selectedPeriod && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                4. Asigna Calificaciones a cada Estudiante
              </label>
              
              {!canManageSelectedSubject && isTeacherUser ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">No estás asignado a esta materia. Contacta al administrador.</p>
                </div>
              ) : studentsInCourse.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    {isTeacherUser 
                      ? 'No hay estudiantes asignados a esta materia en este curso. El administrador debe asignar estudiantes primero.'
                      : 'No hay estudiantes en este curso'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentsInCourse.map((student) => (
                    <div 
                      key={student.uid} 
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-center gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{student.name}</p>
                        {student.mail && (
                          <p className="text-sm text-gray-500">{student.mail}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {(['EP', 'L', 'AL', 'S'] as GradeValue[]).map((gradeValue) => (
                          <button
                            key={gradeValue}
                            type="button"
                            onClick={() => handleGradeChange(student.uid, gradeValue)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              studentGrades[student.uid] === gradeValue
                                ? gradeValue === 'S' ? 'bg-green-500 text-white' :
                                  gradeValue === 'AL' ? 'bg-blue-500 text-white' :
                                  gradeValue === 'L' ? 'bg-yellow-500 text-white' :
                                  'bg-orange-500 text-white'
                                : 'bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-700'
                            }`}
                          >
                            {gradeValue}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botones de Acción */}
          {selectedCourse && selectedSubject && selectedPeriod && (
            <div className="flex gap-3 justify-end border-t pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <HiCheck className="w-5 h-5" />
                Guardar Calificaciones
              </button>
            </div>
          )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

'use client';

import React, { useState, useMemo } from 'react';
import { useGrades } from '@/app/context/gradesContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { Assignments, UserCurses } from '@/app/types/user';
import { GradeLabels, PeriodLabels, GradeValue, Period } from '@/app/types/grade';
import { HiChartBar, HiCheck } from 'react-icons/hi';
import { useSettings } from '@/app/context/settingsContext';

export const Grades: React.FC = () => {
  const { grades, addMultipleGrades, getGradeForStudent } = useGrades();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();
  const { gradeLoadingEnabled, isMainAdmin } = useSettings();

  const isStaff = user?.role === 1 || user?.role === 4 || user?.role === 2;
  const isStudent = user?.role === 3;

  // Estados para el flujo de registro
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period | ''>('');
  const [studentGrades, setStudentGrades] = useState<Record<string, GradeValue>>({});

  // Estudiantes filtrados por curso seleccionado
  const studentsInCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return users.filter(u => u.role === 3 && u.level === selectedCourse);
  }, [users, selectedCourse]);

  // Cargar calificaciones existentes cuando se selecciona curso, materia y periodo
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
        grade: grade as GradeValue
      }));

    if (gradesToSave.length === 0) {
      alert('No hay calificaciones para guardar');
      return;
    }

    try {
      await addMultipleGrades(gradesToSave);
      alert('Calificaciones guardadas correctamente');
      // Resetear el formulario
      setSelectedCourse('');
      setSelectedSubject('');
      setSelectedPeriod('');
      setStudentGrades({});
    } catch (error) {
      console.error('Error al guardar calificaciones:', error);
      alert('Error al guardar las calificaciones');
    }
  };

  // Resetear formulario
  const handleReset = () => {
    setSelectedCourse('');
    setSelectedSubject('');
    setSelectedPeriod('');
    setStudentGrades({});
  };

  // Vista para estudiantes
  const studentView = useMemo(() => {
    if (!user?.uid || !isStudent) return null;

    const studentUser = users.find(u => u.uid === user.uid);
    // Solo mostrar calificaciones publicadas
    const studentCourses = grades.filter(g => g.studentUid === user.uid && g.published);

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
          const subjectName = Assignments[Number(subjectId) as keyof typeof Assignments];
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
  }, [user, isStudent, users, grades]);

  return (
    <section className="flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
      {/* Header */}
      <div className="mb-6">
        <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800 mb-2">
          <HiChartBar className="w-10 h-10" />
          <span>Calificaciones</span>
        </div>
        <p className="text-gray-600">
          {isStaff 
            ? 'Registra calificaciones seleccionando curso, materia y período' 
            : 'Consulta tus calificaciones por materia y período'}
        </p>
      </div>

      {/* Vista de Estudiante */}
      {isStudent && studentView}

      {/* Vista de Staff - Formulario de Registro */}
      {isStaff && (
        <>
          {!gradeLoadingEnabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">
                ⏸️ Carga de notas deshabilitada
              </h3>
              <p className="text-yellow-700">
                La carga de notas no está habilitada actualmente. Solo el administrador principal puede habilitar esta función.
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
                setSelectedCourse(Number(e.target.value));
                setSelectedSubject('');
                setSelectedPeriod('');
                setStudentGrades({});
              }}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar curso...</option>
              {Object.entries(UserCurses)
                .filter(([key]) => !isNaN(Number(key)))
                .map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
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
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(Number(e.target.value));
                setSelectedPeriod('');
                setStudentGrades({});
              }}
              disabled={!selectedCourse}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccionar materia...</option>
              {Object.entries(Assignments)
                .filter(([key]) => !isNaN(Number(key)))
                .map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
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
              
              {studentsInCourse.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">No hay estudiantes en este curso</p>
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

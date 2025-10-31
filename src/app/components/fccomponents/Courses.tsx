'use client';

import React, { useState, useMemo } from 'react';
import { useCourses } from '@/app/context/courseContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { UserCurses, UserRole, CourseDivision } from '@/app/types/user';
import { HiAcademicCap, HiPlus, HiTrash, HiUsers, HiUserGroup, HiCheck, HiX } from 'react-icons/hi';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export const Courses: React.FC = () => {
  const { courses, createCourse, updateCourse, deleteCourse, assignPreceptorToCourse, assignStudentToCourse, removeStudentFromCourse, assignMultipleStudentsToCourse } = useCourses();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();

  const isAdmin = user?.role === UserRole.Administrador;

  // Estados para creación
  const [selectedLevel, setSelectedLevel] = useState<number | ''>('');
  const [selectedDivision, setSelectedDivision] = useState<CourseDivision | ''>('');
  const [isCreating, setIsCreating] = useState(false);

  // Estados para asignación de estudiantes
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
  const [isSelectingStudents, setIsSelectingStudents] = useState(false);

  // Helpers
  const getCourseName = (level: number): string => {
    const course = Object.entries(UserCurses).find(([_, value]) => value === level);
    return course ? course[0] : `${level}°`;
  };

  const getCourseOptions = () => Object.entries(UserCurses)
    .filter(([_, value]) => !isNaN(Number(value)))
    .map(([label, value]) => ({ label, value: Number(value) }));

  // Filtrar usuarios por rol
  const students = useMemo(() => 
    users.filter(u => u.role === UserRole.Estudiante), 
    [users]
  );
  const preceptors = useMemo(() => 
    users.filter(u => u.role === UserRole.Staff), 
    [users]
  );

  // Manejar creación de curso
  const handleCreateCourse = async () => {
    if (!selectedLevel || !selectedDivision) {
      toast.error('Por favor selecciona nivel y división');
      return;
    }

    // Verificar si ya existe
    const existing = courses.find(c => 
      c.level === selectedLevel && 
      c.division === selectedDivision
    );

    if (existing) {
      toast.error('Ya existe un curso con este nivel y división');
      return;
    }

    const courseName = getCourseName(selectedLevel);
    const result = await Swal.fire({
      title: '¿Crear Nuevo Curso?',
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 8px;">¿Estás seguro de que deseas crear el curso <strong>${courseName} - División ${selectedDivision}</strong>?</p>
          <p style="font-size: 0.875rem; color: #6b7280;">Después podrás asignar un preceptor y estudiantes a este curso.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Crear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setIsCreating(true);
      try {
        await createCourse({
          level: selectedLevel,
          division: selectedDivision,
          studentUids: [],
          preceptorUid: '',
        });
        toast.success(`Curso ${courseName} - ${selectedDivision} creado exitosamente`);
        setSelectedLevel('');
        setSelectedDivision('');
        toast('Ahora puedes asignar un preceptor y estudiantes a este curso', { icon: 'ℹ️' });
      } catch (error: any) {
        console.error('Error al crear curso:', error);
        toast.error(error.message || 'Error al crear curso');
      } finally {
        setIsCreating(false);
      }
    }
  };

  // Manejar asignación de preceptor
  const handleAssignPreceptor = async (courseId: string, preceptorUid: string) => {
    try {
      await assignPreceptorToCourse(courseId, preceptorUid);
      toast.success('Preceptor asignado exitosamente');
    } catch (error) {
      console.error('Error al asignar preceptor:', error);
      toast.error('Error al asignar preceptor');
    }
  };

  // Manejar eliminación de curso
  const handleDeleteCourse = async (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const courseName = getCourseName(course.level);
    const result = await Swal.fire({
      title: '¿Eliminar curso?',
      text: `¿Estás seguro de que deseas eliminar el curso ${courseName} - División ${course.division}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });

    if (result.isConfirmed) {
      try {
        await deleteCourse(courseId);
        toast.success('Curso eliminado exitosamente');
      } catch (error) {
        console.error('Error al eliminar curso:', error);
        toast.error('Error al eliminar curso');
      }
    }
  };

  // Abrir selección de estudiantes
  const handleOpenStudentSelection = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    setSelectedCourseId(courseId);
    setSelectedStudentUids(new Set(course.studentUids));
    setIsSelectingStudents(true);
  };

  // Guardar selección de estudiantes
  const handleSaveStudents = async () => {
    if (!selectedCourseId) return;

    try {
      await assignMultipleStudentsToCourse(selectedCourseId, Array.from(selectedStudentUids));
      toast.success('Estudiantes asignados exitosamente');
      setIsSelectingStudents(false);
      setSelectedCourseId(null);
      setSelectedStudentUids(new Set());
    } catch (error) {
      console.error('Error al asignar estudiantes:', error);
      toast.error('Error al asignar estudiantes');
    }
  };

  // Remover estudiante
  const handleRemoveStudent = async (courseId: string, studentUid: string) => {
    const course = courses.find(c => c.id === courseId);
    const student = students.find(s => s.uid === studentUid);
    if (!course || !student) return;

    const result = await Swal.fire({
      title: '¿Remover estudiante?',
      text: `¿Estás seguro de que deseas remover a ${student.name} de este curso?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, Remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });

    if (result.isConfirmed) {
      try {
        await removeStudentFromCourse(courseId, studentUid);
        toast.success('Estudiante removido exitosamente');
      } catch (error) {
        console.error('Error al remover estudiante:', error);
        toast.error('Error al remover estudiante');
      }
    }
  };

  // Asignar todos los estudiantes del nivel y división
  const handleAssignAllStudents = async (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const studentsInLevelAndDivision = students.filter(s => 
      s.level === course.level && 
      s.division === course.division
    );

    if (studentsInLevelAndDivision.length === 0) {
      toast.error('No hay estudiantes con este nivel y división');
      return;
    }

    try {
      await assignMultipleStudentsToCourse(
        courseId, 
        studentsInLevelAndDivision.map(s => s.uid)
      );
      toast.success(`${studentsInLevelAndDivision.length} estudiante(s) asignado(s) exitosamente`);
    } catch (error) {
      console.error('Error al asignar estudiantes:', error);
      toast.error('Error al asignar estudiantes');
    }
  };

  if (!isAdmin) {
    return (
      <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
        <div className="text-center py-12">
          <HiAcademicCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">Acceso Restringido</h3>
          <p className="text-sm text-gray-400">Solo los administradores pueden acceder a esta sección.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <HiAcademicCap className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Cursos</h1>
        </div>
        <p className="text-sm text-gray-500">
          Crea y gestiona los cursos del sistema. Cada curso se compone de un nivel (1°-7°), división (A, B, C), estudiantes asignados y preceptor.
        </p>
      </div>

      {/* Panel de Creación */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Crear Nuevo Curso</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nivel</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(Number(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un nivel</option>
              {getCourseOptions().map(o => (
                <option key={`curso-${o.value}`} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">División</label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value as CourseDivision)}
              disabled={!selectedLevel}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!selectedLevel ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Selecciona división</option>
              {Object.values(CourseDivision).map(div => (
                <option key={`div-${div}`} value={div}>{div}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreateCourse}
              disabled={!selectedLevel || !selectedDivision || isCreating}
              className={`w-full px-4 py-2 rounded-md font-semibold transition-all ${
                (selectedLevel && selectedDivision && !isCreating)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCreating ? 'Creando...' : 'Crear Curso'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Cursos */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Cursos Existentes ({courses.length})</h2>
        {courses.length === 0 ? (
          <div className="text-center py-8">
            <HiAcademicCap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No hay cursos creados</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => {
              const assignedStudents = students.filter(s => course.studentUids.includes(s.uid));
              const preceptor = preceptors.find(p => p.uid === course.preceptorUid);
              const courseName = getCourseName(course.level);
              
              // Estudiantes del mismo nivel y división que aún no están asignados
              const availableStudents = students.filter(s => 
                s.level === course.level && 
                s.division === course.division &&
                !course.studentUids.includes(s.uid)
              );

              return (
                <div key={course.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-800 text-lg">
                          {courseName} - División {course.division}
                        </h4>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Resumen */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      preceptor ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {preceptor ? `Preceptor: ${preceptor.name}` : 'Sin preceptor'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      assignedStudents.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }`}>
                      Alumnos: {assignedStudents.length}
                      {availableStudents.length > 0 && ` (${availableStudents.length} disponible${availableStudents.length !== 1 ? 's' : ''})`}
                    </span>
                  </div>

                  {/* Preceptor */}
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Preceptor Asignado</h5>
                    {preceptor ? (
                      <div className="flex items-center justify-between bg-white rounded p-3 border">
                        <div>
                          <span className="font-medium">{preceptor.name}</span>
                          {preceptor.mail && (
                            <p className="text-sm text-gray-600">{preceptor.mail}</p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                          <HiCheck className="w-4 h-4 inline mr-1" />
                          Asignado
                        </span>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-sm text-yellow-700 mb-2">No hay preceptor asignado</p>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignPreceptor(course.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">Seleccionar preceptor</option>
                          {preceptors.map((p) => (
                            <option key={p.uid} value={p.uid}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Estudiantes */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium text-gray-700">
                        Estudiantes Asignados ({assignedStudents.length})
                      </h5>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenStudentSelection(course.id)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                        >
                          <HiUsers className="w-4 h-4 inline mr-1" />
                          Seleccionar
                        </button>
                        {availableStudents.length > 0 && (
                          <button
                            onClick={() => handleAssignAllStudents(course.id)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                          >
                            <HiPlus className="w-4 h-4 inline mr-1" />
                            Asignar Todos
                          </button>
                        )}
                      </div>
                    </div>
                    {assignedStudents.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-sm text-yellow-700">No hay estudiantes asignados</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {assignedStudents.map((student) => (
                          <div key={student.uid} className="flex justify-between items-center bg-white rounded p-2 border">
                            <div>
                              <span className="font-medium">{student.name}</span>
                              {student.mail && (
                                <p className="text-sm text-gray-600">{student.mail}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveStudent(course.id, student.uid)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Selección de Estudiantes */}
      {isSelectingStudents && selectedCourseId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    Seleccionar Estudiantes
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {(() => {
                      const course = courses.find(c => c.id === selectedCourseId);
                      if (!course) return '';
                      return `${getCourseName(course.level)} - División ${course.division}`;
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSelectingStudents(false);
                    setSelectedCourseId(null);
                    setSelectedStudentUids(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {students.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay estudiantes disponibles</p>
              ) : (
                <div className="space-y-2">
                  {students.map((student) => {
                    const isSelected = selectedStudentUids.has(student.uid);
                    return (
                      <div
                        key={student.uid}
                        onClick={() => {
                          const newSet = new Set(selectedStudentUids);
                          if (isSelected) {
                            newSet.delete(student.uid);
                          } else {
                            newSet.add(student.uid);
                          }
                          setSelectedStudentUids(newSet);
                        }}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{student.name}</p>
                            {student.mail && (
                              <p className="text-sm text-gray-600">{student.mail}</p>
                            )}
                            {student.level && student.division && (
                              <p className="text-xs text-gray-500">
                                {getCourseName(student.level)} - {student.division}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <HiCheck className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsSelectingStudents(false);
                  setSelectedCourseId(null);
                  setSelectedStudentUids(new Set());
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveStudents}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Guardar ({selectedStudentUids.size} estudiante{selectedStudentUids.size !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};


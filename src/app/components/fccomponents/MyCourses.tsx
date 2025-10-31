'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAttendance } from '@/app/context/attendanceContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { useSubjects } from '@/app/context/subjectContext';
import { UserCurses, CourseDivision } from '@/app/types/user';
import { AttendanceStatus } from '@/app/types/attendance';
import { HiBookOpen, HiCheck, HiXCircle, HiClock, HiCalendar, HiUserGroup } from 'react-icons/hi';
import { RefreshButton } from '../reusable/RefreshButton';
import Swal from 'sweetalert2';
import { getCourseName } from '@/app/utils/permissions';

export const MyCourses: React.FC = () => {
  const { records, addMultipleAttendances, refreshAttendance } = useAttendance();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();
  const { subjects } = useSubjects();

  const isStaff = user?.role === 2;

  // Estados para el registro diario
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Por defecto, fecha de hoy
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [selectedDivision, setSelectedDivision] = useState<CourseDivision | ''>('');
  const [studentAttendances, setStudentAttendances] = useState<Record<string, AttendanceStatus>>({});

  // Obtener todos los cursos disponibles
  const availableCourses = useMemo(() => {
    return Object.entries(UserCurses)
      .filter(([key]) => !isNaN(Number(key)))
      .map(([key, name]) => ({ id: Number(key), name: name as string }));
  }, []);

  // Obtener divisiones disponibles para el curso seleccionado
  const availableDivisions = useMemo(() => {
    if (!selectedCourse) return [];
    
    // Buscar todas las materias del curso para obtener las divisiones únicas
    const courseSubjects = subjects.filter(s => s.courseLevel === selectedCourse);
    const divisions = new Set<string>();
    
    courseSubjects.forEach(subject => {
      if (subject.courseDivision) {
        divisions.add(subject.courseDivision);
      }
    });
    
    // Si no hay divisiones en las materias, buscar en los estudiantes
    if (divisions.size === 0) {
      const courseStudents = users.filter(u => u.role === 3 && u.level === selectedCourse);
      courseStudents.forEach(student => {
        if (student.division) {
          divisions.add(student.division);
        }
      });
    }
    
    return Array.from(divisions).sort() as CourseDivision[];
  }, [selectedCourse, subjects, users]);

  // Estudiantes del curso y división seleccionados
  const studentsInCourse = useMemo(() => {
    if (!selectedCourse) return [];
    
    let filtered = users.filter(u => u.role === 3 && u.level === selectedCourse);
    
    // Filtrar por división si está seleccionada
    if (selectedDivision) {
      filtered = filtered.filter(u => u.division === selectedDivision);
    }
    
    return filtered.map(u => ({
      ...u,
      uid: u.id || u.uid,
    }));
  }, [users, selectedCourse, selectedDivision]);

  // Cargar asistencias existentes para la fecha seleccionada
  const initialAttendances = useMemo(() => {
    if (!selectedDate || !selectedCourse) {
      return {};
    }

    const normalizedDate = selectedDate.split('T')[0];
    const initial: Record<string, AttendanceStatus> = {};
    
    studentsInCourse.forEach(student => {
      const studentId = student.id || student.uid;
      const existingAttendance = records.find(r => 
        (r.studentUid === student.id || r.studentUid === student.uid) && 
        r.date === normalizedDate
      );
      if (existingAttendance) {
        initial[studentId] = existingAttendance.status;
      }
    });
    
    return initial;
  }, [selectedDate, selectedCourse, studentsInCourse, records]);

  // Actualizar studentAttendances cuando cambien las asistencias iniciales
  useEffect(() => {
    setStudentAttendances(initialAttendances);
  }, [initialAttendances]);

  // Cambiar asistencia de un estudiante
  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setStudentAttendances(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Guardar todas las asistencias
  const handleSave = async () => {
    if (!selectedDate || !selectedCourse) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor selecciona fecha y curso',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    const normalizedDate = selectedDate.split('T')[0];
    const attendancesToSave = Object.entries(studentAttendances)
      .filter(([_, status]) => status) // Solo incluir si hay una asistencia definida
      .map(([studentId, status]) => {
        // Encontrar el estudiante para obtener su uid
        const student = studentsInCourse.find(s => (s.id || s.uid) === studentId);
        return {
          studentUid: student?.uid || studentId,
          date: normalizedDate,
          status: status as AttendanceStatus,
          courseLevel: selectedCourse as number,
          createdByUid: user?.uid || '',
          createdAt: Date.now(),
        };
      });

    if (attendancesToSave.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Sin asistencias',
        text: 'No hay asistencias para guardar',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    try {
      await addMultipleAttendances(attendancesToSave);
      await Swal.fire({
        icon: 'success',
        title: 'Asistencias guardadas',
        text: `Se guardaron ${attendancesToSave.length} registro(s) de asistencia`,
        confirmButtonColor: '#2563eb',
      });
    } catch (error) {
      console.error('Error al guardar asistencias:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al guardar las asistencias',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  // Obtener icono según el estado
  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <HiCheck className="w-5 h-5 text-green-600" />;
      case 'absent':
        return <HiXCircle className="w-5 h-5 text-red-600" />;
      case 'late':
        return <HiClock className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  // Obtener etiqueta según el estado
  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'Presente';
      case 'absent':
        return 'Ausente';
      case 'late':
        return 'Tarde';
      default:
        return 'Sin registro';
    }
  };

  // Estadísticas del día
  const dayStats = useMemo(() => {
    const present = Object.values(studentAttendances).filter(s => s === 'present').length;
    const absent = Object.values(studentAttendances).filter(s => s === 'absent').length;
    const late = Object.values(studentAttendances).filter(s => s === 'late').length;
    const total = studentsInCourse.length;
    const registered = present + absent + late;
    
    return { present, absent, late, total, registered };
  }, [studentAttendances, studentsInCourse.length]);

  if (!isStaff) {
    return (
      <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
        <div className="text-center py-12">
          <p className="text-gray-500">No tienes acceso a esta sección</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <HiBookOpen className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900">Mis Cursos</h1>
          </div>
          <RefreshButton 
            onRefresh={refreshAttendance}
            tooltip="Actualizar asistencias"
            size="md"
          />
        </div>
        <p className="text-sm text-gray-500">
          Registra las asistencias diarias de los estudiantes por curso y división
        </p>
      </div>

      {/* Selectores de Fecha, Curso y División */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setStudentAttendances({});
              }}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Curso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Curso
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(Number(e.target.value));
                setSelectedDivision('');
                setStudentAttendances({});
              }}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar curso...</option>
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* División */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              División {selectedCourse ? `(${availableDivisions.length} disponible${availableDivisions.length !== 1 ? 's' : ''})` : ''}
            </label>
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value as CourseDivision || '');
                setStudentAttendances({});
              }}
              disabled={!selectedCourse}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Todas las divisiones</option>
              {availableDivisions.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas del día */}
      {selectedCourse && studentsInCourse.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <HiUserGroup className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-600">Total</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{dayStats.total}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <HiCheck className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-700">Presentes</p>
            </div>
            <p className="text-2xl font-bold text-green-800">{dayStats.present}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <HiXCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">Ausentes</p>
            </div>
            <p className="text-2xl font-bold text-red-800">{dayStats.absent}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <HiClock className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-700">Tardanzas</p>
            </div>
            <p className="text-2xl font-bold text-yellow-800">{dayStats.late}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <HiCalendar className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-700">Registrados</p>
            </div>
            <p className="text-2xl font-bold text-blue-800">{dayStats.registered}/{dayStats.total}</p>
          </div>
        </div>
      )}

      {/* Lista de estudiantes con controles de asistencia */}
      {selectedCourse && studentsInCourse.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Estudiantes {selectedDivision ? `- División ${selectedDivision}` : ''} ({studentsInCourse.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {studentsInCourse
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((student) => {
                  const studentId = student.id || student.uid;
                  const currentStatus = studentAttendances[studentId];
                  
                  return (
                    <div key={studentId} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{student.name}</p>
                          {student.mail && (
                            <p className="text-sm text-gray-500">{student.mail}</p>
                          )}
                          {student.division && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              División {student.division}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAttendanceChange(studentId, 'present')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                              currentStatus === 'present'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                            }`}
                          >
                            <HiCheck className="w-4 h-4" />
                            Presente
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(studentId, 'absent')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                              currentStatus === 'absent'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                            }`}
                          >
                            <HiXCircle className="w-4 h-4" />
                            Ausente
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(studentId, 'late')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                              currentStatus === 'late'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-yellow-100'
                            }`}
                          >
                            <HiClock className="w-4 h-4" />
                            Tarde
                          </button>
                          {currentStatus && (
                            <button
                              onClick={() => {
                                const newAttendances = { ...studentAttendances };
                                delete newAttendances[studentId];
                                setStudentAttendances(newAttendances);
                              }}
                              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                              title="Limpiar"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      {currentStatus && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          {getStatusIcon(currentStatus)}
                          <span className="text-gray-600">
                            Estado actual: <strong>{getStatusLabel(currentStatus)}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Botón de guardar */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
            >
              <HiCheck className="w-5 h-5" />
              Guardar Asistencias ({dayStats.registered})
            </button>
          </div>
        </div>
      ) : selectedCourse ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <HiUserGroup className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            {selectedDivision 
              ? `No hay estudiantes en ${getCourseName(selectedCourse)} - División ${selectedDivision}`
              : `No hay estudiantes en ${getCourseName(selectedCourse)}`}
          </p>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <HiBookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Selecciona un curso para comenzar a registrar asistencias</p>
        </div>
      )}
    </section>
  );
};


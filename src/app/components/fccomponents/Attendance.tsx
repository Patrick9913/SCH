'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAttendance } from '@/app/context/attendanceContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { UserCurses } from '@/app/types/user';
import { AttendanceStatus, AttendanceRecord } from '@/app/types/attendance';
import { HiUserGroup, HiCheck, HiXCircle, HiClock } from 'react-icons/hi';

export const Attendance: React.FC = () => {
  const { records, addMultipleAttendances, getAttendanceForStudent } = useAttendance();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();

  const isStaff = user?.role === 1 || user?.role === 4 || user?.role === 2;
  const isStudent = user?.role === 3;

  // Estados para el flujo de registro
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [studentAttendances, setStudentAttendances] = useState<Record<string, AttendanceStatus>>({});
  
  // Estado para estudiantes: mes seleccionado
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Estudiantes filtrados por curso seleccionado
  const studentsInCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return users.filter(u => u.role === 3 && u.level === selectedCourse);
  }, [users, selectedCourse]);

  // Cargar asistencias existentes cuando se selecciona fecha y curso
  const initialAttendances = useMemo(() => {
    if (!selectedDate || !selectedCourse) {
      return {};
    }

    const initial: Record<string, AttendanceStatus> = {};
    studentsInCourse.forEach(student => {
      const existingAttendance = records.find(r => r.studentUid === student.uid && r.date === selectedDate);
      if (existingAttendance) {
        initial[student.uid] = existingAttendance.status;
      }
    });
    return initial;
  }, [selectedDate, selectedCourse, studentsInCourse, records]);

  // Actualizar studentAttendances cuando cambien las asistencias iniciales
  useEffect(() => {
    setStudentAttendances(initialAttendances);
  }, [initialAttendances]);

  const handleAttendanceChange = (studentUid: string, status: AttendanceStatus) => {
    setStudentAttendances(prev => ({
      ...prev,
      [studentUid]: status
    }));
  };

  const handleSave = async () => {
    if (!selectedDate || !selectedCourse) return;

    const attendancesToSave = Object.entries(studentAttendances)
      .filter(([_, status]) => status) // Solo incluir si hay una asistencia registrada
      .map(([studentUid, status]) => ({
        studentUid,
        date: selectedDate,
        courseLevel: Number(selectedCourse),
        status: status as AttendanceStatus
      }));

    if (attendancesToSave.length === 0) {
      alert('No hay asistencias para guardar');
      return;
    }

    try {
      await addMultipleAttendances(attendancesToSave);
      alert('Asistencias guardadas correctamente');
      // Resetear el formulario
      setSelectedDate('');
      setSelectedCourse('');
      setStudentAttendances({});
    } catch (error) {
      console.error('Error al guardar asistencias:', error);
      alert('Error al guardar las asistencias');
    }
  };

  const handleReset = () => {
    setSelectedDate('');
    setSelectedCourse('');
    setStudentAttendances({});
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <HiCheck className="w-5 h-5" />;
      case 'absent':
        return <HiXCircle className="w-5 h-5" />;
      case 'late':
        return <HiClock className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'Presente';
      case 'absent':
        return 'Ausente';
      case 'late':
        return 'Tarde';
      default:
        return '';
    }
  };

  const getStatusColor = (status: AttendanceStatus, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-700';
    }
    switch (status) {
      case 'present':
        return 'bg-green-500 text-white';
      case 'absent':
        return 'bg-red-500 text-white';
      case 'late':
        return 'bg-yellow-500 text-white';
      default:
        return '';
    }
  };

  // Calcular faltas restantes para estudiantes
  const remainingAbsences = useMemo(() => {
    if (!user?.uid || !isStudent) return 30;
    const studentRecords = records.filter(r => r.studentUid === user.uid);
    const absentCount = studentRecords.filter(r => r.status === 'absent').length;
    return Math.max(0, 30 - absentCount);
  }, [user, isStudent, records]);

  // Generar lista de meses disponibles
  const availableMonths = useMemo(() => {
    if (!user?.uid || !isStudent) return [];
    const studentRecords = records.filter(r => r.studentUid === user.uid);
    const monthsSet = new Set<string>();
    
    studentRecords.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });
    
    return Array.from(monthsSet).sort().reverse();
  }, [user, isStudent, records]);

  // Obtener registros del mes seleccionado
  const monthlyRecords = useMemo(() => {
    if (!user?.uid || !isStudent || !selectedMonth) return [];
    const studentRecords = records.filter(r => r.studentUid === user.uid);
    
    return studentRecords.filter(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  }, [user, isStudent, records, selectedMonth]);

  // Vista para estudiantes
  const studentView = useMemo(() => {
    if (!user?.uid || !isStudent) return null;

    if (records.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No tienes registros de asistencia</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Selector de Mes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona un mes para ver tus asistencias
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar mes...</option>
            {availableMonths.map((monthKey) => {
              const [year, month] = monthKey.split('-');
              const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-ES', {
                month: 'long',
                year: 'numeric'
              });
              return (
                <option key={monthKey} value={monthKey}>
                  {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                </option>
              );
            })}
          </select>
        </div>

        {/* Registros del mes seleccionado */}
        {selectedMonth && monthlyRecords.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Registros del mes seleccionado
            </h3>
            
            {/* Estadísticas del mes */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <HiCheck className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Presentes</p>
                    <p className="text-xl font-bold text-green-800">
                      {monthlyRecords.filter(r => r.status === 'present').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <HiXCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Ausentes</p>
                    <p className="text-xl font-bold text-red-800">
                      {monthlyRecords.filter(r => r.status === 'absent').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <HiClock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Tardanzas</p>
                    <p className="text-xl font-bold text-yellow-800">
                      {monthlyRecords.filter(r => r.status === 'late').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {monthlyRecords
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((record) => (
                  <div key={record.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium text-gray-800">
                          {new Date(record.date).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      record.status === 'present' ? 'bg-green-100 text-green-800' :
                      record.status === 'absent' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getStatusLabel(record.status)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {selectedMonth && monthlyRecords.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No hay registros para el mes seleccionado</p>
          </div>
        )}
      </div>
    );
  }, [user, isStudent, records, selectedMonth, availableMonths, monthlyRecords]);

  return (
    <section className="flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800">
            <HiUserGroup className="w-10 h-10" />
            <span>Asistencias</span>
          </div>
          {isStudent && (
            <div className={`text-xl font-bold px-4 py-2 rounded-lg ${
              remainingAbsences >= 20 ? 'bg-green-100 text-green-800' :
              remainingAbsences >= 10 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              Faltas restantes: {remainingAbsences} / 30
            </div>
          )}
        </div>
        <p className="text-gray-600">
          {isStaff 
            ? 'Registra asistencias seleccionando el día y curso' 
            : 'Consulta tus registros de asistencia por mes'}
        </p>
      </div>

      {/* Vista para Estudiantes */}
      {isStudent && studentView}

      {isStaff && (
        <div className="space-y-6">
          {/* Paso 1: Seleccionar Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Selecciona la Fecha
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedCourse('');
                setStudentAttendances({});
              }}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Paso 2: Seleccionar Curso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Selecciona el Curso
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(Number(e.target.value));
                setStudentAttendances({});
              }}
              disabled={!selectedDate}
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

          {/* Paso 3: Lista de Estudiantes y Asistencias */}
          {selectedDate && selectedCourse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                3. Marca la asistencia de cada Estudiante
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
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex-1 mb-3">
                        <p className="font-medium text-gray-800">{student.name}</p>
                        {student.mail && (
                          <p className="text-sm text-gray-500">{student.mail}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {(['present', 'absent', 'late'] as AttendanceStatus[]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleAttendanceChange(student.uid, status)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                              getStatusColor(status, studentAttendances[student.uid] === status)
                            }`}
                          >
                            {getStatusIcon(status)}
                            <span>{getStatusLabel(status)}</span>
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
          {selectedDate && selectedCourse && (
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
                Guardar Asistencias
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vista de registros anteriores (solo para staff) */}
      {isStaff && records.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Registros Recientes</h3>
          <div className="space-y-2">
            {records.slice(0, 10).map((record) => {
              const student = users.find(u => u.uid === record.studentUid);
              return (
                <div key={record.id} className="bg-gray-50 border rounded p-3 flex justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{student?.name || record.studentUid}</p>
                    <p className="text-sm text-gray-600">{record.date}</p>
                  </div>
                  <span className={`text-sm font-medium ${
                    record.status === 'present' ? 'text-green-600' :
                    record.status === 'absent' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {getStatusLabel(record.status)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

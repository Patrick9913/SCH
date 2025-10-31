'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAttendance } from '@/app/context/attendanceContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { UserCurses } from '@/app/types/user';
import { AttendanceStatus, AttendanceRecord } from '@/app/types/attendance';
import { HiUserGroup, HiCheck, HiXCircle, HiClock } from 'react-icons/hi';
import { RefreshButton } from '../reusable/RefreshButton';
import Swal from 'sweetalert2';
import { 
  isAdmin, 
  isStaff, 
  isTeacher, 
  canManageGrades, 
  getAvailableCourses,
  getCourseName
} from '@/app/utils/permissions';

export const Attendance: React.FC = () => {
  const { records, addMultipleAttendances, getAttendanceForStudent, refreshAttendance } = useAttendance();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();

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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [studentAttendances, setStudentAttendances] = useState<Record<string, AttendanceStatus>>({});
  
  // Estado para estudiantes: mes seleccionado
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Obtener cursos disponibles según permisos
  const availableCourses = useMemo(() => {
    if (isAdminUser || isStaffUser) {
      // Admin y Staff pueden ver todos los cursos
      return Object.entries(UserCurses)
        .filter(([key]) => !isNaN(Number(key)))
        .map(([key, name]) => ({ id: Number(key), name: name as string }));
    } else if (isTeacherUser && user) {
      // Docente solo ve sus cursos asignados
      return getAvailableCourses(user);
    }
    return [];
  }, [isAdminUser, isStaffUser, isTeacherUser, user]);

  // Estudiantes filtrados por curso seleccionado
  const studentsInCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return users.filter(u => u.role === 3 && u.level === selectedCourse).map(u => ({
      ...u,
      // Asegurar que uid sea igual a id para compatibilidad
      // Usar id como identificador principal ya que es el documentId de Firestore
      uid: u.id || u.uid,
    }));
  }, [users, selectedCourse]);

  // Cargar asistencias existentes cuando se selecciona fecha y curso
  const initialAttendances = useMemo(() => {
    if (!selectedDate || !selectedCourse) {
      return {};
    }

    // Normalizar la fecha para comparación
    const normalizedDate = selectedDate.split('T')[0];

    const initial: Record<string, AttendanceStatus> = {};
    studentsInCourse.forEach(student => {
      // Usar id como identificador principal (documentId de Firestore)
      const studentId = student.id || student.uid;
      // Buscar asistencia usando el uid del estudiante y fecha normalizada
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

  const handleAttendanceChange = (studentUid: string, status: AttendanceStatus) => {
    setStudentAttendances(prev => ({
      ...prev,
      [studentUid]: status
    }));
  };

  const handleSave = async () => {
    if (!selectedDate || !selectedCourse) {
      await Swal.fire({
        icon: 'warning',
        title: 'Faltan datos',
        text: 'Por favor selecciona una fecha y un curso',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    // Normalizar la fecha a formato YYYY-MM-DD por si acaso
    const normalizedDate = selectedDate.split('T')[0];

    console.log('Intentando guardar asistencias...');
    console.log('Estudiantes en curso:', studentsInCourse);
    console.log('Asistencias seleccionadas:', studentAttendances);

    const attendancesToSave = Object.entries(studentAttendances)
      .filter(([_, status]) => status) // Solo incluir si hay una asistencia registrada
      .map(([studentUid, status]) => {
        // Verificar que el uid del estudiante existe y es válido
        const student = studentsInCourse.find(s => {
          // Buscar por id (documentId) primero, luego por uid
          const matchById = s.id === studentUid;
          const matchByUid = s.uid === studentUid;
          return matchById || matchByUid;
        });
        
        if (!student) {
          console.warn(`Estudiante no encontrado con uid/id: ${studentUid}`);
        }

        // Priorizar id sobre uid, ya que id es siempre el documentId de Firestore
        const finalStudentUid = student?.id || student?.uid || studentUid;
        
        if (!finalStudentUid || finalStudentUid.trim() === '') {
          console.error(`No se pudo obtener un UID válido para el estudiante:`, student, studentUid);
        }
        
        console.log(`Preparando asistencia para estudiante:`, {
          originalUid: studentUid,
          finalUid: finalStudentUid,
          studentName: student?.name,
          status
        });
        
        return {
          studentUid: finalStudentUid,
          date: normalizedDate,
          courseLevel: Number(selectedCourse),
          status: status as AttendanceStatus
        };
      })
      .filter(att => att.studentUid && att.studentUid.trim() !== ''); // Filtrar asistencias inválidas

    if (attendancesToSave.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Sin asistencias',
        text: 'No hay asistencias válidas para guardar. Verifica que hayas seleccionado el estado de asistencia para al menos un estudiante.',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    console.log('Asistencias a guardar:', attendancesToSave);

    try {
      await addMultipleAttendances(attendancesToSave);
      
      // Refrescar las asistencias después de guardar
      refreshAttendance();
      
      await Swal.fire({
        icon: 'success',
        title: 'Asistencias guardadas',
        text: `${attendancesToSave.length} asistencia(s) guardada(s) correctamente`,
        confirmButtonColor: '#2563eb',
      });
      // Resetear el formulario
      setSelectedDate('');
      setSelectedCourse('');
      setStudentAttendances({});
    } catch (error) {
      console.error('Error al guardar asistencias:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al guardar las asistencias';
      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: errorMessage,
        confirmButtonColor: '#dc2626',
      });
    }
  };

  const handleReset = () => {
    setSelectedDate('');
    setSelectedCourse('');
    setStudentAttendances({});
  };

  // Función para refrescar datos
  const handleRefresh = () => {
    refreshAttendance();
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

  // Obtener el estudiante objetivo (el propio estudiante o el hijo si es familia)
  const targetStudent = useMemo(() => {
    if (isStudent && user) return user;
    if (isFamily && relatedStudent) return relatedStudent;
    return null;
  }, [isStudent, isFamily, user, relatedStudent]);

  // Calcular faltas restantes para estudiantes
  const remainingAbsences = useMemo(() => {
    if (!targetStudent) return 30;
    // Usar tanto uid como id para compatibilidad, priorizando id
    const studentRecords = records.filter(r => r.studentUid === targetStudent.id || r.studentUid === targetStudent.uid);
    const absentCount = studentRecords.filter(r => r.status === 'absent').length;
    return Math.max(0, 30 - absentCount);
  }, [targetStudent, records]);

  // Generar lista de meses disponibles
  const availableMonths = useMemo(() => {
    if (!targetStudent) return [];
    // Usar tanto uid como id para compatibilidad, priorizando id
    const studentRecords = records.filter(r => r.studentUid === targetStudent.id || r.studentUid === targetStudent.uid);
    const monthsSet = new Set<string>();
    
    studentRecords.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });
    
    return Array.from(monthsSet).sort().reverse();
  }, [targetStudent, records]);

  // Obtener registros del mes seleccionado
  const monthlyRecords = useMemo(() => {
    if (!targetStudent || !selectedMonth) return [];
    // Usar tanto uid como id para compatibilidad, priorizando id
    const studentRecords = records.filter(r => r.studentUid === targetStudent.id || r.studentUid === targetStudent.uid);
    
    return studentRecords.filter(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  }, [targetStudent, records, selectedMonth]);

  // Vista para estudiantes y familia
  const studentView = useMemo(() => {
    if (!targetStudent) return null;

    // Filtrar registros del estudiante usando tanto uid como id para compatibilidad
    // Priorizar id sobre uid ya que id es siempre el documentId de Firestore
    const studentRecords = records.filter(r => {
      const matchById = r.studentUid === targetStudent.id;
      const matchByUid = r.studentUid === targetStudent.uid;
      return matchById || matchByUid;
    });

    if (studentRecords.length === 0) {
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
  }, [targetStudent, records, selectedMonth, availableMonths, monthlyRecords]);

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <HiUserGroup className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900">Asistencias</h1>
          </div>
          <div className="flex items-center gap-3">
            {(isStudent || isFamily) && targetStudent && (
              <div className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${
                remainingAbsences >= 20 ? 'bg-green-50 text-green-700 border border-green-200' :
                remainingAbsences >= 10 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {isFamily ? `${targetStudent.name}: ` : ''}Faltas: {remainingAbsences} / 30
              </div>
            )}
            <RefreshButton 
              onRefresh={handleRefresh}
              tooltip="Actualizar asistencias"
              size="md"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500">
          {canManage 
            ? 'Registra asistencias seleccionando el día y curso' 
            : 'Consulta tus registros de asistencia por mes'}
        </p>
        {isTeacherUser && user && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Cursos asignados:</span> {getAvailableCourses(user).map(c => c.name).join(', ')}
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

      {/* Vista para Staff/Docente */}
      {canManage && (
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
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
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
                  {studentsInCourse.map((student) => {
                    // Usar id como identificador principal (documentId de Firestore)
                    const studentId = student.id || student.uid;
                    return (
                      <div 
                        key={studentId} 
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
                              onClick={() => handleAttendanceChange(studentId, status)}
                              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                                getStatusColor(status, studentAttendances[studentId] === status)
                              }`}
                            >
                              {getStatusIcon(status)}
                              <span>{getStatusLabel(status)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
      {isStaffUser && records.length > 0 && (
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

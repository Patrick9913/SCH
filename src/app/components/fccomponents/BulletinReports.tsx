'use client';

import React, { useMemo, useState } from 'react';
import { useGrades } from '@/app/context/gradesContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { Assignments, UserCurses } from '@/app/types/user';
import { GradeLabels, PeriodLabels, Period } from '@/app/types/grade';
import { HiDocumentText, HiPrinter } from 'react-icons/hi';
import { HiCog } from 'react-icons/hi';
import { useSettings } from '@/app/context/settingsContext';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export const BulletinReports: React.FC = () => {
  const { grades, publishGrades } = useGrades();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();
  const { isMainAdmin, gradeLoadingEnabled, toggleGradeLoading, isConnected, lastUpdated } = useSettings();

  const isStaff = user?.role === 1 || user?.role === 4 || user?.role === 2;
  const isStudent = user?.role === 3;

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

  // Filtrar calificaciones según el usuario
  const visibleGrades = useMemo(() => {
    if (isStudent && user?.uid) {
      // Estudiantes solo ven calificaciones publicadas
      return grades.filter(g => g.studentUid === user.uid && g.published);
    }
    if (isStaff) {
      // Staff ve todas las calificaciones (publicadas y no publicadas)
      return grades;
    }
    return [];
  }, [grades, user, isStudent, isStaff]);

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

  // Para estudiantes: mostrar solo su boletín
  const studentView = useMemo(() => {
    if (!user?.uid || !isStudent) return null;

    const studentGrades = visibleGrades.filter(g => g.studentUid === user.uid);

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

    return (
      <div className="space-y-6">
         {Object.entries(groupedBySubject).map(([subjectId, periods]) => {
           const subjectName = Assignments[subjectId as unknown as keyof typeof Assignments];
           return (
             <div key={subjectId} className="bg-white rounded-lg border border-gray-200 p-4 print:border-black">
               <h3 className="text-xl font-semibold text-gray-800 mb-4">{subjectName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(PeriodLabels).map(([periodKey, periodLabel]) => {
                  const periodGrades = periods[periodKey as Period];
                  return (
                    <div key={periodKey} className="border rounded p-3 print:border-black">
                      <h4 className="font-medium text-gray-700 mb-2">{periodLabel}</h4>
                      {periodGrades.length > 0 ? (
                        <div className="space-y-1">
                          {periodGrades.map((grade, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-sm font-semibold ${
                                grade.grade === 'S' ? 'bg-green-100 text-green-800' :
                                grade.grade === 'AL' ? 'bg-blue-100 text-blue-800' :
                                grade.grade === 'L' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {grade.grade}
                              </span>
                              <span className="text-sm text-gray-600">{GradeLabels[grade.grade]}</span>
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
            <p className="text-gray-500">No tienes boletín publicado aún</p>
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
  }, [user, isStudent, visibleGrades]);

  // Para admin/staff: ver todos los boletines
  const adminView = useMemo(() => {
    if (!isStaff) return null;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Boletines de Estudiantes</h2>
          {isMainAdmin && (
            <div className="text-sm text-gray-600">
              Clic en cualquier estudiante para ver su boletín completo
            </div>
          )}
        </div>

        {Object.entries(gradesByStudent).map(([studentUid, studentGrades]) => {
          const student = users.find(u => u.uid === studentUid);
          if (!student) return null;

          const handlePrintStudent = () => {
            // Crear vista de impresión para el estudiante específico
            // Por ahora, simplemente mostrar
          };

          return (
            <div key={studentUid} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                   <h3 className="font-semibold text-gray-800">{student.name}</h3>
                   {student.level && (
                     <p className="text-sm text-gray-600">{UserCurses[student.level as unknown as keyof typeof UserCurses]}</p>
                   )}
                </div>
                {isMainAdmin && (
                  <button
                    onClick={() => {
                      // Lógica para ver/editar boletín individual
                      console.log('Ver boletín de:', student.name);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Ver Boletín
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(PeriodLabels).map(([periodKey, periodLabel]) => {
                  const periodGrades = studentGrades.filter(g => g.period === periodKey);
                  return (
                    <div key={periodKey} className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">{periodLabel}</h4>
                      {periodGrades.length > 0 ? (
                        <div className="space-y-1">
                          {periodGrades.map((grade) => {
                            const subjectName = Assignments[grade.subjectId as unknown as keyof typeof Assignments];
                            return (
                              <div key={grade.id} className="text-xs">
                                <span className="font-medium">{subjectName}: </span>
                                <span className={grade.published ? 'text-green-600' : 'text-gray-400'}>
                                  {grade.grade} {grade.published ? '✓' : '(no publicado)'}
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

        {Object.keys(gradesByStudent).length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay boletines disponibles</p>
          </div>
        )}
      </div>
    );
  }, [isStaff, gradesByStudent, users, isMainAdmin]);

  return (
    <section className="flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
      {/* Header */}
      <div className="mb-6">
        <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800 mb-2">
          <HiDocumentText className="w-10 h-10" />
          <span>Boletines</span>
        </div>
        <p className="text-gray-600">
          {isStudent 
            ? 'Consulta tu boletín de calificaciones' 
            : isMainAdmin
            ? 'Gestiona y publica los boletines de calificaciones'
            : 'Consulta los boletines de los estudiantes'}
        </p>
      </div>

      {/* Panel de Control para Administradores (role === 1) */}
      {user?.role === 1 && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
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

      {/* Vista según rol */}
      {isStudent && studentView}
      {isStaff && adminView}
    </section>
  );
};


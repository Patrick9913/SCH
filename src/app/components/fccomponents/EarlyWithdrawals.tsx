'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useWithdrawals } from '@/app/context/withdrawalContext';
import { useAuthContext } from '@/app/context/authContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { EarlyWithdrawal } from '@/app/types/withdrawal';
import { UserCurses } from '@/app/types/user';
import { useUserPermissions } from '@/app/utils/rolePermissions';
import { HiCalendar, HiClock, HiUser, HiShieldCheck, HiX, HiCheckCircle } from 'react-icons/hi';
import Swal from 'sweetalert2';
import { QRCodeSVG } from 'qrcode.react';

export const EarlyWithdrawals: React.FC = () => {
  const { createWithdrawal, withdrawals, cancelWithdrawal, refreshWithdrawals } = useWithdrawals();
  const { user } = useAuthContext();
  const { users } = useTriskaContext();
  
  // Usar el nuevo sistema de permisos
  const permissions = useUserPermissions(user?.role);

  const [pickerName, setPickerName] = useState('');
  const [pickerDni, setPickerDni] = useState('');
  const [pickerRelationship, setPickerRelationship] = useState('');
  const [withdrawalDate, setWithdrawalDate] = useState('');
  const [withdrawalTime, setWithdrawalTime] = useState('');
  const [reason, setReason] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [generatedWithdrawal, setGeneratedWithdrawal] = useState<EarlyWithdrawal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewingWithdrawal, setViewingWithdrawal] = useState<EarlyWithdrawal | null>(null);

  // Obtener estudiantes relacionados (solo para familiares)
  const relatedStudents = useMemo(() => {
    if (permissions.isFamily) {
      // Priorizar childrenIds (múltiples hijos)
      if (user.childrenIds && user.childrenIds.length > 0) {
        return users.filter(u => user.childrenIds?.includes(u.id) || user.childrenIds?.includes(u.uid));
      }
      // Fallback a childId (retrocompatibilidad)
      if (user.childId) {
        return users.filter(u => u.id === user.childId || u.uid === user.childId);
      }
    } else if (permissions.isAnyAdmin) {
      // Admin puede ver todos los estudiantes
      return users.filter(u => u.role === 3);
    }
    return [];
  }, [user, users]);

  // Validar formulario
  const isFormValid = useMemo(() => {
    return pickerName.trim() !== '' &&
           pickerDni.trim() !== '' &&
           pickerRelationship.trim() !== '' &&
           withdrawalDate !== '' &&
           withdrawalTime !== '' &&
           reason.trim() !== '' &&
           selectedStudentId !== '';
  }, [pickerName, pickerDni, pickerRelationship, withdrawalDate, withdrawalTime, reason, selectedStudentId]);

  // Obtener retiros del usuario actual
  const myWithdrawals = useMemo(() => {
    if (!user) return [];
    return withdrawals.filter(w => w.authorizerUid === user.id || w.authorizerUid === user.uid);
  }, [withdrawals, user]);

  // Función para limpiar el formulario
  const clearForm = () => {
    setPickerName('');
    setPickerDni('');
    setPickerRelationship('');
    setWithdrawalDate('');
    setWithdrawalTime('');
    setReason('');
    setSelectedStudentId('');
    setShowQrCode(false);
    setGeneratedWithdrawal(null);
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid || !user) {
      await Swal.fire({
        icon: 'warning',
        title: 'Faltan datos',
        text: 'Por favor completa todos los campos',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    setSubmitting(true);

    try {
      const selectedStudent = relatedStudents.find(s => s.id === selectedStudentId || s.uid === selectedStudentId);
      
      if (!selectedStudent) {
        throw new Error('Estudiante no encontrado');
      }

      // Obtener el curso y división del estudiante
      const getCourseName = (level?: number): string => {
        if (!level) return '';
        const courseKey = Object.keys(UserCurses).find(
          key => UserCurses[key as keyof typeof UserCurses] === level
        );
        return courseKey || '';
      };

      const withdrawal = await createWithdrawal({
        authorizerUid: user.id || user.uid,
        authorizerName: user.name,
        studentUid: selectedStudent.id || selectedStudent.uid,
        studentName: selectedStudent.name,
        studentCourse: getCourseName(selectedStudent.level),
        studentDivision: selectedStudent.division?.toString() || '',
        pickerName,
        pickerDni,
        pickerRelationship,
        withdrawalDate,
        withdrawalTime,
        reason,
      });

      if (withdrawal) {
        setGeneratedWithdrawal(withdrawal);
        setShowQrCode(true);
        refreshWithdrawals();
      }
    } catch (error) {
      console.error('Error creando retiro:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar cancelación de retiro
  const handleCancelWithdrawal = async (withdrawalId: string) => {
    const result = await Swal.fire({
      title: '¿Cancelar retiro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No',
    });

    if (result.isConfirmed) {
      await cancelWithdrawal(withdrawalId);
      refreshWithdrawals();
    }
  };

  // Función para obtener el estado visual del retiro
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">Pendiente</span>;
      case 'validated':
        return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Validado</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">Cancelado</span>;
      case 'expired':
        return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">Expirado</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">{status}</span>;
    }
  };

  // Establecer fecha mínima (hoy)
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <HiShieldCheck className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Retiros Anticipados</h1>
        </div>
        <p className="text-sm text-gray-500">
          Registra retiros anticipados para alumnos
        </p>
      </div>

      {/* Formulario de registro */}
      {!showQrCode ? (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Registrar Nuevo Retiro</h2>
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Alumno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <HiUser className="inline w-4 h-4 mr-1" />
                  Alumno
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecciona un alumno</option>
                  {relatedStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <HiCalendar className="inline w-4 h-4 mr-1" />
                  Fecha
                </label>
                <input
                  type="date"
                  value={withdrawalDate}
                  onChange={(e) => setWithdrawalDate(e.target.value)}
                  min={getTodayDate()}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Hora */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <HiClock className="inline w-4 h-4 mr-1" />
                  Hora
                </label>
                <input
                  type="time"
                  value={withdrawalTime}
                  onChange={(e) => setWithdrawalTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Persona que retira */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Persona que retira
                </label>
                <input
                  type="text"
                  value={pickerName}
                  onChange={(e) => setPickerName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* DNI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DNI
                </label>
                <input
                  type="text"
                  value={pickerDni}
                  onChange={(e) => setPickerDni(e.target.value)}
                  placeholder="Número de documento"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Parentesco */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parentesco
                </label>
                <input
                  type="text"
                  value={pickerRelationship}
                  onChange={(e) => setPickerRelationship(e.target.value)}
                  placeholder="Ej: Primo, Tío, etc."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Motivo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del retiro
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe el motivo del retiro anticipado..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Generando...' : 'Generar Código QR'}
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Vista del código QR */
        <div className="mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <HiCheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Retiro registrado exitosamente!
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Muestra este código QR en la entrada del colegio. Válido por 24 horas.
            </p>
            
            {generatedWithdrawal && (
              <div className="mb-6">
                <div className="inline-block p-4 bg-white rounded-lg border-2 border-green-300">
                  <QRCodeSVG value={generatedWithdrawal.qrCode} size={256} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-4 tracking-widest">
                  {generatedWithdrawal.qrCode}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Código de 5 caracteres
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-xs text-gray-500 mb-1">Alumno</p>
                <p className="text-sm font-medium text-gray-900">
                  {generatedWithdrawal?.studentName}
                  {generatedWithdrawal?.studentCourse && generatedWithdrawal?.studentDivision && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-bold">
                      {generatedWithdrawal.studentCourse}{generatedWithdrawal.studentDivision}
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-xs text-gray-500 mb-1">Persona que retira</p>
                <p className="text-sm font-medium text-gray-900">{generatedWithdrawal?.pickerName}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-xs text-gray-500 mb-1">Fecha y hora</p>
                <p className="text-sm font-medium text-gray-900">
                  {generatedWithdrawal?.withdrawalDate} a las {generatedWithdrawal?.withdrawalTime}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-xs text-gray-500 mb-1">Estado</p>
                <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                  Pendiente
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowQrCode(false);
                clearForm();
              }}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registrar otro retiro
            </button>
          </div>
        </div>
      )}

      {/* Historial de retiros */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Historial de Retiros</h2>
        {myWithdrawals.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-gray-200">
            No hay retiros registrados
          </div>
        ) : (
          <div className="space-y-3">
            {myWithdrawals.map(withdrawal => (
              <div
                key={withdrawal.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {withdrawal.studentName}
                        {withdrawal.studentCourse && withdrawal.studentDivision && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-bold">
                            {withdrawal.studentCourse}{withdrawal.studentDivision}
                          </span>
                        )}
                      </h3>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Persona que retira</p>
                        <p className="font-medium text-gray-900">{withdrawal.pickerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Fecha y hora</p>
                        <p className="font-medium text-gray-900">
                          {withdrawal.withdrawalDate} {withdrawal.withdrawalTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Motivo</p>
                        <p className="font-medium text-gray-900 truncate">{withdrawal.reason}</p>
                      </div>
                      {withdrawal.validatedAt && (
                        <div>
                          <p className="text-xs text-gray-500">Validado por</p>
                          <p className="font-medium text-gray-900">{withdrawal.validatedByName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {withdrawal.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setViewingWithdrawal(withdrawal)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                          title="Ver código QR"
                        >
                          Ver QR
                        </button>
                        <button
                          onClick={() => handleCancelWithdrawal(withdrawal.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                          title="Cancelar retiro"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para ver QR de un retiro existente */}
      {viewingWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Código QR de Retiro
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Muestra este código en la entrada del colegio
              </p>
              
              {/* QR Code */}
              <div className="mb-6">
                <div className="inline-block p-4 bg-white rounded-lg border-2 border-blue-300">
                  <QRCodeSVG value={viewingWithdrawal.qrCode} size={256} />
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-4 tracking-widest">
                  {viewingWithdrawal.qrCode}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Código de 5 caracteres
                </p>
              </div>

              {/* Información del retiro */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4 text-left">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Alumno</p>
                    <p className="font-semibold text-gray-900">
                      {viewingWithdrawal.studentName}
                      {viewingWithdrawal.studentCourse && viewingWithdrawal.studentDivision && (
                        <span className="ml-1 px-1.5 py-0.5 bg-blue-200 text-blue-800 text-xs rounded">
                          {viewingWithdrawal.studentCourse}{viewingWithdrawal.studentDivision}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Retira</p>
                    <p className="font-semibold text-gray-900">{viewingWithdrawal.pickerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Fecha y hora</p>
                    <p className="font-semibold text-gray-900">
                      {viewingWithdrawal.withdrawalDate} {viewingWithdrawal.withdrawalTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Estado</p>
                    <span className="px-2 py-0.5 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                      Pendiente
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setViewingWithdrawal(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    handleCancelWithdrawal(viewingWithdrawal.id);
                    setViewingWithdrawal(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancelar Retiro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};


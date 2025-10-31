'use client';

import React, { useState, useMemo } from 'react';
import { useWithdrawals } from '@/app/context/withdrawalContext';
import { useAuthContext } from '@/app/context/authContext';
import { EarlyWithdrawal } from '@/app/types/withdrawal';
import { HiQrcode, HiUser, HiCalendar, HiClock, HiCheckCircle, HiXCircle } from 'react-icons/hi';
import Swal from 'sweetalert2';

export const WithdrawalSecurity: React.FC = () => {
  const { withdrawals, validateWithdrawal, getWithdrawalByQr, refreshWithdrawals } = useWithdrawals();
  const { user } = useAuthContext();

  const [qrCodeInput, setQrCodeInput] = useState('');
  const [foundWithdrawal, setFoundWithdrawal] = useState<EarlyWithdrawal | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Obtener retiros pendientes para mostrar
  const pendingWithdrawals = useMemo(() => {
    return withdrawals.filter(w => w.status === 'pending').sort((a, b) => 
      new Date(`${b.withdrawalDate}T${b.withdrawalTime}`).getTime() - 
      new Date(`${a.withdrawalDate}T${a.withdrawalTime}`).getTime()
    );
  }, [withdrawals]);

  // Buscar retiro por código QR
  const handleSearchQr = () => {
    if (!qrCodeInput.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Código QR vacío',
        text: 'Por favor ingresa un código QR válido',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    const withdrawal = getWithdrawalByQr(qrCodeInput.trim());
    
    if (!withdrawal) {
      Swal.fire({
        icon: 'error',
        title: 'Código QR no encontrado',
        text: 'El código QR ingresado no existe en el sistema',
        confirmButtonColor: '#dc2626',
      });
      setFoundWithdrawal(null);
      return;
    }

    // Verificar si el retiro está pendiente
    if (withdrawal.status !== 'pending') {
      Swal.fire({
        icon: 'warning',
        title: 'Retiro no válido',
        text: `Este retiro ya fue ${withdrawal.status === 'validated' ? 'validado' : 'cancelado'}`,
        confirmButtonColor: '#f59e0b',
      });
      setFoundWithdrawal(null);
      return;
    }

    // Verificar si el retiro expiró
    if (withdrawal.expiresAt < Date.now()) {
      Swal.fire({
        icon: 'warning',
        title: 'Código QR expirado',
        text: 'Este código QR ya expiró. Solicita al familiar que genere uno nuevo.',
        confirmButtonColor: '#f59e0b',
      });
      setFoundWithdrawal(null);
      return;
    }

    setFoundWithdrawal(withdrawal);
  };

  // Validar el retiro
  const handleValidate = async () => {
    if (!foundWithdrawal) return;

    await validateWithdrawal(foundWithdrawal.id);
    setFoundWithdrawal(null);
    setQrCodeInput('');
    refreshWithdrawals();
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

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <HiQrcode className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Validación de Retiros</h1>
        </div>
        <p className="text-sm text-gray-500">
          Escanea o ingresa el código QR para validar retiros anticipados
        </p>
      </div>

      {/* Búsqueda de QR */}
      <div className="mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Buscar Código QR</h2>
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={qrCodeInput}
              onChange={(e) => setQrCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchQr()}
              placeholder="Ingresa el código de 5 caracteres (Ej: A3B2C)"
              maxLength={5}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest text-center font-mono text-lg"
            />
            <button
              onClick={handleSearchQr}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <HiQrcode className="w-5 h-5" />
              Buscar
            </button>
          </div>

          {/* Mostrar información del retiro encontrado */}
          {foundWithdrawal && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <HiCheckCircle className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Retiro encontrado</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">Alumno</p>
                  <p className="text-base font-semibold text-gray-900">
                    {foundWithdrawal.studentName}
                    {foundWithdrawal.studentCourse && foundWithdrawal.studentDivision && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-bold">
                        {foundWithdrawal.studentCourse}{foundWithdrawal.studentDivision}
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">Fecha y hora</p>
                  <p className="text-base font-semibold text-gray-900">
                    {foundWithdrawal.withdrawalDate} a las {foundWithdrawal.withdrawalTime}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">Persona que retira</p>
                  <p className="text-base font-semibold text-gray-900">{foundWithdrawal.pickerName}</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">Documento</p>
                  <p className="text-base font-semibold text-gray-900">{foundWithdrawal.pickerDni}</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">Parentesco</p>
                  <p className="text-base font-semibold text-gray-900">{foundWithdrawal.pickerRelationship}</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">Autorizado por</p>
                  <p className="text-base font-semibold text-gray-900">{foundWithdrawal.authorizerName}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
                <p className="text-xs text-gray-500 mb-1">Motivo del retiro</p>
                <p className="text-sm text-gray-900">{foundWithdrawal.reason}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleValidate}
                  className="flex-1 px-4 py-3 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <HiCheckCircle className="w-5 h-5" />
                  Validar y entregar alumno
                </button>
                <button
                  onClick={() => {
                    setFoundWithdrawal(null);
                    setQrCodeInput('');
                  }}
                  className="px-4 py-3 text-base font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <HiXCircle className="w-5 h-5" />
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de retiros pendientes */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Retiros Pendientes</h2>
        
        {pendingWithdrawals.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-gray-200">
            No hay retiros pendientes
          </div>
        ) : (
          <div className="space-y-3">
            {pendingWithdrawals.map(withdrawal => {
              const isExpired = withdrawal.expiresAt < Date.now();
              
              return (
                <div
                  key={withdrawal.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    isExpired
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
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
                        {isExpired && (
                          <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
                            Expirado
                          </span>
                        )}
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
                        <div>
                          <p className="text-xs text-gray-500">Código QR</p>
                          <p className="font-mono text-xs font-medium text-gray-600 truncate">
                            {withdrawal.qrCode.substring(0, 12)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};


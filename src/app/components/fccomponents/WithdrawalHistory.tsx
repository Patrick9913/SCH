'use client';

import React, { useState, useMemo } from 'react';
import { useWithdrawals } from '@/app/context/withdrawalContext';
import { useAuthContext } from '@/app/context/authContext';
import { EarlyWithdrawal } from '@/app/types/withdrawal';
import { HiClipboardList, HiFilter, HiCalendar, HiSearch, HiCheckCircle, HiXCircle, HiClock } from 'react-icons/hi';
import { RefreshButton } from '../reusable/RefreshButton';

export const WithdrawalHistory: React.FC = () => {
  const { withdrawals, refreshWithdrawals } = useWithdrawals();
  const { user } = useAuthContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<EarlyWithdrawal | null>(null);

  // Filtrar y buscar retiros
  const filteredWithdrawals = useMemo(() => {
    let filtered = [...withdrawals];

    // Filtrar por búsqueda (nombre de estudiante, persona que retira, código)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(w => 
        w.studentName.toLowerCase().includes(term) ||
        w.pickerName.toLowerCase().includes(term) ||
        w.qrCode.toLowerCase().includes(term) ||
        w.authorizerName.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(w => w.status === filterStatus);
    }

    // Filtrar por fecha
    if (filterDate !== '') {
      filtered = filtered.filter(w => w.withdrawalDate === filterDate);
    }

    // Ordenar por fecha de creación (más recientes primero)
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [withdrawals, searchTerm, filterStatus, filterDate]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = withdrawals.length;
    const pending = withdrawals.filter(w => w.status === 'pending').length;
    const validated = withdrawals.filter(w => w.status === 'validated').length;
    const cancelled = withdrawals.filter(w => w.status === 'cancelled').length;
    const expired = withdrawals.filter(w => w.status === 'expired').length;

    return { total, pending, validated, cancelled, expired };
  }, [withdrawals]);

  // Función para obtener el badge de estado
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

  // Función para obtener el icono de estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <HiClock className="w-5 h-5 text-yellow-600" />;
      case 'validated':
        return <HiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
      case 'expired':
        return <HiXCircle className="w-5 h-5 text-red-600" />;
      default:
        return <HiClock className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <HiClipboardList className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900">Historial de Retiros</h1>
          </div>
          <RefreshButton 
            onRefresh={refreshWithdrawals}
            tooltip="Actualizar historial"
            size="md"
          />
        </div>
        <p className="text-sm text-gray-500">
          Consulta todos los retiros anticipados registrados en el sistema
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-xs text-yellow-700 mb-1">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-700 mb-1">Validados</p>
          <p className="text-2xl font-bold text-green-800">{stats.validated}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-1">Cancelados</p>
          <p className="text-2xl font-bold text-gray-700">{stats.cancelled}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs text-red-700 mb-1">Expirados</p>
          <p className="text-2xl font-bold text-red-800">{stats.expired}</p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <HiFilter className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-medium text-gray-900">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <HiSearch className="inline w-4 h-4 mr-1" />
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, DNI o código..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro por estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="validated">Validados</option>
              <option value="cancelled">Cancelados</option>
              <option value="expired">Expirados</option>
            </select>
          </div>

          {/* Filtro por fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <HiCalendar className="inline w-4 h-4 mr-1" />
              Fecha
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Botón limpiar filtros */}
        {(searchTerm !== '' || filterStatus !== 'all' || filterDate !== '') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
              setFilterDate('');
            }}
            className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Lista de retiros */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Retiros ({filteredWithdrawals.length})
          </h2>
        </div>

        {filteredWithdrawals.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-lg border border-gray-200">
            {searchTerm || filterStatus !== 'all' || filterDate 
              ? 'No se encontraron retiros con los filtros aplicados'
              : 'No hay retiros registrados en el sistema'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWithdrawals.map(withdrawal => {
              const isExpired = withdrawal.expiresAt < Date.now() && withdrawal.status === 'pending';
              
              return (
                <div
                  key={withdrawal.id}
                  className={`border rounded-lg p-4 transition-all cursor-pointer ${
                    isExpired
                      ? 'bg-red-50 border-red-200 hover:border-red-300'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setSelectedWithdrawal(withdrawal)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(withdrawal.status)}
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
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Código QR</p>
                            <p className="font-mono font-bold text-gray-900">{withdrawal.qrCode}</p>
                          </div>
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
                            <p className="text-xs text-gray-500">Autorizado por</p>
                            <p className="font-medium text-gray-900">{withdrawal.authorizerName}</p>
                          </div>
                        </div>

                        {withdrawal.validatedAt && withdrawal.validatedByName && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Validado por <span className="font-medium text-green-700">{withdrawal.validatedByName}</span> el {new Date(withdrawal.validatedAt).toLocaleString('es-ES')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal con detalles completos del retiro */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Detalles del Retiro
              </h2>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <HiXCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Estado del retiro */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedWithdrawal.status)}
                  <div>
                    <p className="text-sm text-gray-500">Estado actual</p>
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Código QR</p>
                  <p className="text-2xl font-mono font-bold text-blue-600 tracking-widest">
                    {selectedWithdrawal.qrCode}
                  </p>
                </div>
              </div>

              {/* Información del alumno */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Información del Alumno
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 mb-1">Nombre completo</p>
                    <p className="text-base font-semibold text-gray-900">{selectedWithdrawal.studentName}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 mb-1">Curso</p>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedWithdrawal.studentCourse && selectedWithdrawal.studentDivision 
                        ? `${selectedWithdrawal.studentCourse} ${selectedWithdrawal.studentDivision}`
                        : 'No especificado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información del retiro */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Información del Retiro
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Fecha</p>
                    <p className="text-base font-semibold text-gray-900">{selectedWithdrawal.withdrawalDate}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Hora</p>
                    <p className="text-base font-semibold text-gray-900">{selectedWithdrawal.withdrawalTime}</p>
                  </div>
                </div>
              </div>

              {/* Persona que retira */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Persona Autorizada
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 mb-1">Nombre</p>
                    <p className="text-base font-semibold text-gray-900">{selectedWithdrawal.pickerName}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 mb-1">DNI</p>
                    <p className="text-base font-semibold text-gray-900">{selectedWithdrawal.pickerDni}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 mb-1">Parentesco</p>
                    <p className="text-base font-semibold text-gray-900">{selectedWithdrawal.pickerRelationship}</p>
                  </div>
                </div>
              </div>

              {/* Motivo */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Motivo del Retiro
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-900">{selectedWithdrawal.reason}</p>
                </div>
              </div>

              {/* Información de autorización */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Autorización y Validación
                </h3>
                <div className="space-y-3">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 mb-1">Autorizado por (Familiar)</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedWithdrawal.authorizerName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(selectedWithdrawal.createdAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                  
                  {selectedWithdrawal.validatedByName && selectedWithdrawal.validatedAt && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 mb-1">Validado por (Seguridad)</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedWithdrawal.validatedByName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(selectedWithdrawal.validatedAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                  )}

                  {!selectedWithdrawal.validatedAt && selectedWithdrawal.status === 'pending' && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-700 mb-1">Estado</p>
                      <p className="text-sm font-semibold text-gray-900">Pendiente de validación</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Expira el {new Date(selectedWithdrawal.expiresAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón cerrar */}
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};


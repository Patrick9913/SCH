'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, where, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';
import { EarlyWithdrawal, WithdrawalStatus } from '../types/withdrawal';
import { useAuthContext } from './authContext';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';

interface WithdrawalContextProps {
  withdrawals: EarlyWithdrawal[];
  createWithdrawal: (data: Omit<EarlyWithdrawal, 'id' | 'qrCode' | 'status' | 'createdAt' | 'updatedAt' | 'expiresAt'>) => Promise<EarlyWithdrawal | undefined>;
  validateWithdrawal: (withdrawalId: string) => Promise<void>;
  cancelWithdrawal: (withdrawalId: string) => Promise<void>;
  getWithdrawalByQr: (qrCode: string) => EarlyWithdrawal | undefined;
  refreshWithdrawals: () => void;
}

const WithdrawalContext = createContext<WithdrawalContextProps | null>(null);

export const useWithdrawals = () => {
  const ctx = useContext(WithdrawalContext);
  if (!ctx) throw new Error('useWithdrawals must be used within a WithdrawalProvider');
  return ctx;
};

export const WithdrawalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid, user } = useAuthContext();
  const [withdrawals, setWithdrawals] = useState<EarlyWithdrawal[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Usar useRef para mantener siempre el uid más reciente
  const currentUidRef = useRef<string | null>(null);
  const currentUserNameRef = useRef<string>('');
  
  // Actualizar el ref cada vez que cambie user o uid
  useEffect(() => {
    if (user?.id) {
      currentUidRef.current = user.id;
      currentUserNameRef.current = user.name;
    } else if (user?.uid) {
      currentUidRef.current = user.uid;
      currentUserNameRef.current = user.name;
    } else if (uid) {
      currentUidRef.current = uid;
    } else {
      currentUidRef.current = null;
      currentUserNameRef.current = '';
    }
  }, [user, uid]);

  // Cargar retiros desde Firestore
  useEffect(() => {
    const col = collection(db, 'early_withdrawals');
    const q = query(col, orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, (snap) => {
      const items: EarlyWithdrawal[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          authorizerUid: data.authorizerUid,
          authorizerName: data.authorizerName,
          studentUid: data.studentUid,
          studentName: data.studentName,
          pickerName: data.pickerName,
          pickerDni: data.pickerDni,
          pickerRelationship: data.pickerRelationship,
          withdrawalDate: data.withdrawalDate,
          withdrawalTime: data.withdrawalTime,
          reason: data.reason,
          qrCode: data.qrCode,
          status: data.status,
          validatedByUid: data.validatedByUid,
          validatedByName: data.validatedByName,
          validatedAt: data.validatedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          expiresAt: data.expiresAt,
        } as EarlyWithdrawal;
      });
      
      setWithdrawals(items);
    });
    
    return () => unsub();
  }, [refreshTrigger]);

  // Función para refrescar retiros manualmente
  const refreshWithdrawals = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Generar código QR único de 5 caracteres alfanuméricos (mayúsculas y números)
  const generateQrCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin O, I, 0, 1 para evitar confusión
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Crear un nuevo retiro anticipado
  const createWithdrawal = async (
    data: Omit<EarlyWithdrawal, 'id' | 'qrCode' | 'status' | 'createdAt' | 'updatedAt' | 'expiresAt'>
  ): Promise<EarlyWithdrawal | undefined> => {
    const latestUid = currentUidRef.current;
    const latestName = currentUserNameRef.current;
    
    if (!latestUid) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo obtener la información del usuario',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    try {
      const qrCode = generateQrCode();
      const now = Date.now();
      const expiresAt = now + (24 * 60 * 60 * 1000); // 24 horas desde la creación

      const withdrawalData: Omit<EarlyWithdrawal, 'id'> = {
        ...data,
        qrCode,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        expiresAt,
      };

      const docRef = await addDoc(collection(db, 'early_withdrawals'), withdrawalData);

      await Swal.fire({
        icon: 'success',
        title: 'Retiro registrado exitosamente',
        text: 'Se ha generado el código QR. Muéstralo en la entrada del colegio.',
        confirmButtonColor: '#10b981',
      });

      return {
        id: docRef.id,
        ...withdrawalData,
      };
    } catch (error) {
      console.error('Error creando retiro:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo crear el retiro anticipado',
        confirmButtonColor: '#dc2626',
      });
      return undefined;
    }
  };

  // Validar un retiro (usado por Seguridad)
  const validateWithdrawal = async (withdrawalId: string): Promise<void> => {
    const latestUid = currentUidRef.current;
    const latestName = currentUserNameRef.current;
    
    if (!latestUid) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo obtener la información del usuario',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    try {
      const withdrawalRef = doc(db, 'early_withdrawals', withdrawalId);
      
      // Verificar que el retiro existe y está pendiente
      const withdrawalDoc = await getDoc(withdrawalRef);
      if (!withdrawalDoc.exists()) {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'El retiro no existe',
          confirmButtonColor: '#dc2626',
        });
        return;
      }

      const withdrawalData = withdrawalDoc.data() as EarlyWithdrawal;
      
      // Verificar que el retiro está pendiente
      if (withdrawalData.status !== 'pending') {
        await Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: `Este retiro ya fue ${withdrawalData.status === 'validated' ? 'validado' : 'cancelado'}`,
          confirmButtonColor: '#f59e0b',
        });
        return;
      }

      // Verificar que no haya expirado
      if (withdrawalData.expiresAt < Date.now()) {
        await Swal.fire({
          icon: 'warning',
          title: 'Código QR expirado',
          text: 'Este código QR ya expiró. Por favor solicita uno nuevo.',
          confirmButtonColor: '#f59e0b',
        });
        return;
      }

      await updateDoc(withdrawalRef, {
        status: 'validated',
        validatedByUid: latestUid,
        validatedByName: latestName,
        validatedAt: Date.now(),
        updatedAt: Date.now(),
      });

      await Swal.fire({
        icon: 'success',
        title: 'Retiro validado',
        text: 'El alumno ha sido entregado correctamente.',
        confirmButtonColor: '#10b981',
      });
    } catch (error) {
      console.error('Error validando retiro:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo validar el retiro',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  // Cancelar un retiro (usado por familiares)
  const cancelWithdrawal = async (withdrawalId: string): Promise<void> => {
    const latestUid = currentUidRef.current;
    
    if (!latestUid) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo obtener la información del usuario',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    try {
      const withdrawalRef = doc(db, 'early_withdrawals', withdrawalId);
      
      // Verificar que el retiro existe
      const withdrawalDoc = await getDoc(withdrawalRef);
      if (!withdrawalDoc.exists()) {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'El retiro no existe',
          confirmButtonColor: '#dc2626',
        });
        return;
      }

      const withdrawalData = withdrawalDoc.data() as EarlyWithdrawal;
      
      // Verificar que el retiro esté pendiente
      if (withdrawalData.status !== 'pending') {
        await Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: 'Solo se pueden cancelar retiros pendientes',
          confirmButtonColor: '#f59e0b',
        });
        return;
      }

      await updateDoc(withdrawalRef, {
        status: 'cancelled',
        updatedAt: Date.now(),
      });

      await Swal.fire({
        icon: 'success',
        title: 'Retiro cancelado',
        text: 'El retiro anticipado ha sido cancelado.',
        confirmButtonColor: '#10b981',
      });
    } catch (error) {
      console.error('Error cancelando retiro:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cancelar el retiro',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  // Buscar un retiro por código QR
  const getWithdrawalByQr = (qrCode: string): EarlyWithdrawal | undefined => {
    return withdrawals.find(w => w.qrCode === qrCode);
  };

  // Marcar retiros expirados automáticamente
  useEffect(() => {
    const expiredWithdrawals = withdrawals.filter(w => 
      w.status === 'pending' && w.expiresAt < Date.now()
    );

    if (expiredWithdrawals.length > 0) {
      expiredWithdrawals.forEach(async (withdrawal) => {
        try {
          const withdrawalRef = doc(db, 'early_withdrawals', withdrawal.id);
          await updateDoc(withdrawalRef, {
            status: 'expired',
            updatedAt: Date.now(),
          });
        } catch (error) {
          console.error('Error marcando retiro como expirado:', error);
        }
      });
    }
  }, [withdrawals]);

  const value = useMemo(() => ({
    withdrawals,
    createWithdrawal,
    validateWithdrawal,
    cancelWithdrawal,
    getWithdrawalByQr,
    refreshWithdrawals,
  }), [withdrawals]);

  return (
    <WithdrawalContext.Provider value={value}>
      {children}
    </WithdrawalContext.Provider>
  );
};


'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, where, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config';
import { AttendanceRecord } from '../types/attendance';
import { useAuthContext } from './authContext';

interface AttendanceContextProps {
  records: AttendanceRecord[];
  markAttendance: (data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'createdByUid'>) => Promise<void>;
  addMultipleAttendances: (attendances: Omit<AttendanceRecord, 'id' | 'createdAt' | 'createdByUid'>[]) => Promise<void>;
  getAttendanceForStudent: (studentUid: string, date: string) => AttendanceRecord | undefined;
  refreshAttendance: () => void;
}

const AttendanceContext = createContext<AttendanceContextProps | null>(null);

export const useAttendance = () => {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance debe usarse dentro de AttendanceProvider');
  return ctx;
};

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid, user } = useAuthContext();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Usar useRef para mantener siempre el uid más reciente, incluso en funciones async
  const currentUidRef = useRef<string | null>(null);
  
  // Actualizar el ref cada vez que cambie user o uid
  useEffect(() => {
    if (user?.id) {
      currentUidRef.current = user.id;
    } else if (user?.uid) {
      currentUidRef.current = user.uid;
    } else if (uid) {
      currentUidRef.current = uid;
    } else {
      currentUidRef.current = null;
    }
  }, [user, uid]);

  useEffect(() => {
    const col = collection(db, 'attendance');
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: AttendanceRecord[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const createdAt = typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now());
        return {
          id: d.id,
          date: data.date,
          studentUid: data.studentUid,
          courseLevel: data.courseLevel ?? 0, // Default to 0 if not present (legacy data)
          status: data.status,
          createdByUid: data.createdByUid,
          createdAt,
        } as AttendanceRecord;
      });
      setRecords(items);
    });
    return () => unsub();
  }, [refreshTrigger]);

  // Función para refrescar asistencias manualmente
  const refreshAttendance = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const markAttendance = async (data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'createdByUid'>) => {
    const latestUid = currentUidRef.current;
    if (!latestUid) return;
    await addDoc(collection(db, 'attendance'), {
      ...data,
      createdByUid: latestUid,
      createdAt: Date.now(),
    });
  };

  const addMultipleAttendances = async (attendancesToAdd: Omit<AttendanceRecord, 'id' | 'createdAt' | 'createdByUid'>[]) => {
    // Obtener el uid más reciente del ref (siempre actualizado)
    const latestUid = currentUidRef.current;
    
    // También intentar obtener de localStorage como respaldo
    let fallbackUid: string | null = null;
    try {
      const SESSION_STORAGE_KEY = 'sch_user_session';
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData) {
        const { userId } = JSON.parse(sessionData);
        fallbackUid = userId;
      }
    } catch (e) {
      console.warn('Error al leer localStorage:', e);
    }
    
    // Usar latestUid del ref primero, sino fallbackUid
    const userIdToUse = latestUid || fallbackUid;
    
    if (!userIdToUse) {
      console.error('No hay userId disponible en addMultipleAttendances:', { latestUid, fallbackUid, uid });
      throw new Error('No hay usuario autenticado. Por favor, cierra sesión e inicia sesión nuevamente.');
    }
    
    if (attendancesToAdd.length === 0) {
      console.warn('No hay asistencias para agregar');
      return;
    }

    console.log('Guardando asistencias:', attendancesToAdd);

    try {
      // Crear un ID único basado en studentUid y date para evitar duplicados
      // Usar setDoc con merge: true para actualizar si existe o crear si no existe
      const promises = attendancesToAdd.map(async (attendance) => {
        // Crear un ID único basado en studentUid y date para evitar duplicados
        const attendanceId = `${attendance.studentUid}_${attendance.date}`;
        const attendanceRef = doc(db, 'attendance', attendanceId);
        
        // Verificar que el estudiante tenga un uid válido
        if (!attendance.studentUid || attendance.studentUid.trim() === '') {
          console.error('UID de estudiante inválido:', attendance);
          throw new Error(`UID de estudiante inválido para fecha ${attendance.date}`);
        }

        // Verificar si el documento ya existe
        const { getDoc } = await import("firebase/firestore");
        const docSnap = await getDoc(attendanceRef);
        
        if (docSnap.exists()) {
          // Si existe, solo actualizar campos permitidos por las reglas de Firestore
          await setDoc(attendanceRef, {
            status: attendance.status,
            updatedByUid: userIdToUse,
            updatedAt: Date.now(),
          }, { merge: true });
          console.log(`Asistencia actualizada para estudiante ${attendance.studentUid} en fecha ${attendance.date}`);
        } else {
          // Si no existe, crear con todos los campos
          await setDoc(attendanceRef, {
            studentUid: attendance.studentUid,
            date: attendance.date,
            courseLevel: attendance.courseLevel,
            status: attendance.status,
            createdByUid: userIdToUse,
            createdAt: Date.now(),
          });
          console.log(`Asistencia creada para estudiante ${attendance.studentUid} en fecha ${attendance.date}`);
        }
      });

      await Promise.all(promises);
      console.log('Todas las asistencias se guardaron correctamente');
    } catch (error) {
      console.error('Error al guardar asistencias:', error);
      throw error;
    }
  };

  const getAttendanceForStudent = (studentUid: string, date: string): AttendanceRecord | undefined => {
    return records.find(r => r.studentUid === studentUid && r.date === date);
  };

  const value = useMemo(() => ({ 
    records, 
    markAttendance, 
    addMultipleAttendances,
    getAttendanceForStudent,
    refreshAttendance
  }), [records]);
  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
};








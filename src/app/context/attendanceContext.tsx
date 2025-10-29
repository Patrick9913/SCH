'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
  const { uid } = useAuthContext();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    if (!uid) return;
    await addDoc(collection(db, 'attendance'), {
      ...data,
      createdByUid: uid,
      createdAt: Date.now(),
    });
  };

  const addMultipleAttendances = async (attendancesToAdd: Omit<AttendanceRecord, 'id' | 'createdAt' | 'createdByUid'>[]) => {
    if (!uid) return;
    // Firestore batch write
    const batch = attendancesToAdd.map(attendance => 
      addDoc(collection(db, 'attendance'), {
        ...attendance,
        createdByUid: uid,
        createdAt: Date.now(),
      })
    );
    await Promise.all(batch);
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








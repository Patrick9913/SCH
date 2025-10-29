'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, addDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config';
import { Schedule } from '../types/schedule';
import { useAuthContext } from './authContext';

interface ScheduleContextProps {
  schedules: Schedule[];
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt' | 'createdByUid'>) => Promise<void>;
  getSchedulesByCourse: (courseLevel: number) => Schedule[];
  getSchedulesByDay: (dayOfWeek: number) => Schedule[];
  getSchedulesBySubject: (subjectId: number, courseLevel: number) => Schedule[];
}

const ScheduleContext = createContext<ScheduleContextProps | null>(null);

export const useSchedule = () => {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule debe usarse dentro de ScheduleProvider');
  return ctx;
};

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuthContext();
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    const col = collection(db, 'schedules');
    // Usar query simple sin orderBy para evitar errores de índices, ordenar en memoria
    const q = query(col);
    let cleanup: (() => void) | null = null;
    
    const setupListener = () => {
      const unsub = onSnapshot(
        q,
        (snap) => {
          const items: Schedule[] = snap.docs.map((d) => {
            const data = d.data() as any;
            const createdAt = typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now());
            return {
              id: d.id,
              courseLevel: data.courseLevel || 0,
              subjectId: data.subjectId || 0,
              teacherUid: data.teacherUid || '',
              dayOfWeek: data.dayOfWeek ?? 0,
              startTime: data.startTime || '',
              endTime: data.endTime || '',
              classroom: data.classroom || '',
              createdAt,
              createdByUid: data.createdByUid || '',
            } as Schedule;
          });
          // Ordenar manualmente por día y hora
          items.sort((a, b) => {
            if (a.dayOfWeek !== b.dayOfWeek) {
              return a.dayOfWeek - b.dayOfWeek;
            }
            return a.startTime.localeCompare(b.startTime);
          });
          setSchedules(items);
        },
        (error) => {
          console.error('Error en scheduleContext listener:', error);
          setSchedules([]);
        }
      );
      return unsub;
    };
    
    cleanup = setupListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const addSchedule = async (scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'createdByUid'>) => {
    if (!uid) return;
    await addDoc(collection(db, 'schedules'), {
      ...scheduleData,
      createdByUid: uid,
      createdAt: Date.now(),
    });
  };

  const getSchedulesByCourse = (courseLevel: number): Schedule[] => {
    return schedules.filter(s => s.courseLevel === courseLevel);
  };

  const getSchedulesByDay = (dayOfWeek: number): Schedule[] => {
    return schedules.filter(s => s.dayOfWeek === dayOfWeek);
  };

  const getSchedulesBySubject = (subjectId: number, courseLevel: number): Schedule[] => {
    return schedules.filter(s => s.subjectId === subjectId && s.courseLevel === courseLevel)
      .sort((a, b) => {
        // Ordenar por día de la semana, luego por hora de inicio
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }
        return a.startTime.localeCompare(b.startTime);
      });
  };

  const value = useMemo(() => ({ 
    schedules, 
    addSchedule, 
    getSchedulesByCourse,
    getSchedulesByDay,
    getSchedulesBySubject 
  }), [schedules]);

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};


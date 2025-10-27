'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where, Timestamp } from 'firebase/firestore';
import { db } from '../config';
import { Grade, Period } from '../types/grade';
import { useAuthContext } from './authContext';

interface GradesContextProps {
  grades: Grade[];
  studentGrades: (studentUid: string) => Grade[];
  subjectGrades: (subjectId: number, studentUid?: string) => Grade[];
  addGrade: (data: Omit<Grade, 'id' | 'createdAt' | 'createdByUid'>) => Promise<void>;
  addMultipleGrades: (grades: Omit<Grade, 'id' | 'createdAt' | 'createdByUid'>[]) => Promise<void>;
  getGradeForStudent: (studentUid: string, subjectId: number, courseLevel: number, period: Period) => Grade | undefined;
  publishGrades: (courseLevel: number, period: Period) => Promise<void>;
}

const GradesContext = createContext<GradesContextProps | null>(null);

export const useGrades = () => {
  const ctx = useContext(GradesContext);
  if (!ctx) throw new Error('useGrades debe usarse dentro de GradesProvider');
  return ctx;
};

export const GradesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuthContext();
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    const col = collection(db, 'grades');
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: Grade[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const createdAt = typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now());
        return {
          id: d.id,
          studentUid: data.studentUid,
          subjectId: data.subjectId,
          courseLevel: data.courseLevel,
          period: data.period,
          grade: data.grade,
          published: data.published ?? false,
          createdByUid: data.createdByUid,
          createdAt,
        } as Grade;
      });
      setGrades(items);
    });
    return () => unsub();
  }, []);

  const addGrade = async (data: Omit<Grade, 'id' | 'createdAt' | 'createdByUid'>) => {
    if (!uid) return;
    await addDoc(collection(db, 'grades'), {
      ...data,
      createdByUid: uid,
      createdAt: Date.now(),
    });
  };

  const addMultipleGrades = async (gradesToAdd: Omit<Grade, 'id' | 'createdAt' | 'createdByUid'>[]) => {
    if (!uid) return;
    // Firestore batch write
    const batch = gradesToAdd.map(grade => 
      addDoc(collection(db, 'grades'), {
        ...grade,
        published: false, // Por defecto no publicadas
        createdByUid: uid,
        createdAt: Date.now(),
      })
    );
    await Promise.all(batch);
  };

  const publishGrades = async (courseLevel: number, period: Period) => {
    // Buscar todas las calificaciones del curso y período
    const q = query(
      collection(db, 'grades'),
      where('courseLevel', '==', courseLevel),
      where('period', '==', period)
    );
    
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(docSnap => 
      updateDoc(doc(db, 'grades', docSnap.id), { published: true })
    );
    
    await Promise.all(updatePromises);
  };

  const studentGrades = (studentUid: string): Grade[] => {
    return grades.filter(g => g.studentUid === studentUid);
  };

  const subjectGrades = (subjectId: number, studentUid?: string): Grade[] => {
    if (studentUid) {
      return grades.filter(g => g.subjectId === subjectId && g.studentUid === studentUid);
    }
    return grades.filter(g => g.subjectId === subjectId);
  };

  const getGradeForStudent = (studentUid: string, subjectId: number, courseLevel: number, period: Period): Grade | undefined => {
    return grades.find(g => 
      g.studentUid === studentUid && 
      g.subjectId === subjectId && 
      g.courseLevel === courseLevel &&
      g.period === period
    );
  };

  const value = useMemo(() => ({ 
    grades, 
    studentGrades, 
    subjectGrades, 
    addGrade, 
    addMultipleGrades,
    getGradeForStudent,
    publishGrades
  }), [grades]);

  return <GradesContext.Provider value={value}>{children}</GradesContext.Provider>;
};


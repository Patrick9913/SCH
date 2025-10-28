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
  publishBulletins: (courseLevel: number, period: Period) => Promise<{ success: boolean; message: string; publishedCount: number }>;
  getBulletinStatus: (courseLevel: number, period: Period) => { totalStudents: number; gradedStudents: number; publishedStudents: number; isComplete: boolean };
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

  const publishBulletins = async (courseLevel: number, period: Period): Promise<{ success: boolean; message: string; publishedCount: number }> => {
    try {
      // Buscar todas las calificaciones del curso y período que no estén publicadas
      const q = query(
        collection(db, 'grades'),
        where('courseLevel', '==', courseLevel),
        where('period', '==', period),
        where('published', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return {
          success: false,
          message: 'No hay calificaciones pendientes de publicar para este curso y período.',
          publishedCount: 0
        };
      }
      
      const updatePromises = snapshot.docs.map(docSnap => 
        updateDoc(doc(db, 'grades', docSnap.id), { published: true })
      );
      
      await Promise.all(updatePromises);
      
      return {
        success: true,
        message: `Se publicaron ${snapshot.docs.length} calificaciones exitosamente.`,
        publishedCount: snapshot.docs.length
      };
    } catch (error) {
      console.error('Error al publicar boletines:', error);
      return {
        success: false,
        message: 'Error al publicar los boletines. Inténtalo de nuevo.',
        publishedCount: 0
      };
    }
  };

  const getBulletinStatus = (courseLevel: number, period: Period): { totalStudents: number; gradedStudents: number; publishedStudents: number; isComplete: boolean } => {
    // Filtrar calificaciones por curso y período
    const courseGrades = grades.filter(g => g.courseLevel === courseLevel && g.period === period);
    
    // Obtener estudiantes únicos
    const studentUids = [...new Set(courseGrades.map(g => g.studentUid))];
    const totalStudents = studentUids.length;
    
    // Contar estudiantes con calificaciones
    const gradedStudents = studentUids.filter(studentUid => {
      const studentGrades = courseGrades.filter(g => g.studentUid === studentUid);
      return studentGrades.length > 0;
    }).length;
    
    // Contar estudiantes con calificaciones publicadas
    const publishedStudents = studentUids.filter(studentUid => {
      const studentGrades = courseGrades.filter(g => g.studentUid === studentUid);
      return studentGrades.length > 0 && studentGrades.every(g => g.published);
    }).length;
    
    return {
      totalStudents,
      gradedStudents,
      publishedStudents,
      isComplete: gradedStudents === totalStudents && totalStudents > 0
    };
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
    publishGrades,
    publishBulletins,
    getBulletinStatus
  }), [grades]);

  return <GradesContext.Provider value={value}>{children}</GradesContext.Provider>;
};


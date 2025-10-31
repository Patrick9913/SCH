'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where, Timestamp, writeBatch } from 'firebase/firestore';
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
  refreshGrades: () => void;
}

const GradesContext = createContext<GradesContextProps | null>(null);

export const useGrades = () => {
  const ctx = useContext(GradesContext);
  if (!ctx) throw new Error('useGrades debe usarse dentro de GradesProvider');
  return ctx;
};

export const GradesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid, user } = useAuthContext();
  const [grades, setGrades] = useState<Grade[]>([]);
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
  
  // También calcular currentUid para uso inmediato (no async)
  const currentUid = useMemo(() => {
    if (user?.id) return user.id;
    if (user?.uid) return user.uid;
    if (uid) return uid;
    return null;
  }, [user, uid]);

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
  }, [refreshTrigger]);

  // Función para refrescar calificaciones manualmente
  const refreshGrades = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const addGrade = async (data: Omit<Grade, 'id' | 'createdAt' | 'createdByUid'>) => {
    if (!currentUid) return;
    await addDoc(collection(db, 'grades'), {
      ...data,
      createdByUid: currentUid,
      createdAt: Date.now(),
    });
  };

  const addMultipleGrades = async (gradesToAdd: Omit<Grade, 'id' | 'createdAt' | 'createdByUid'>[]) => {
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
    
    // Log para debugging
    console.log('addMultipleGrades llamado:', {
      latestUid,
      fallbackUid,
      userIdToUse,
      currentUid,
      uid,
      userId: user?.id,
      userUid: user?.uid,
      userRole: user?.role,
      gradesCount: gradesToAdd.length
    });
    
    if (!userIdToUse) {
      console.error('No hay userId disponible:', { 
        latestUid, 
        fallbackUid, 
        currentUid, 
        uid, 
        user: user ? { id: user.id, uid: user.uid, role: user.role } : null 
      });
      throw new Error('No hay usuario autenticado. Por favor, cierra sesión e inicia sesión nuevamente.');
    }
    
    if (gradesToAdd.length === 0) {
      return; // No hay nada que guardar
    }

    try {
      // Usar batch write de Firestore (más eficiente y atómico)
      const batch = writeBatch(db);
      const gradesCollection = collection(db, 'grades');
      
      gradesToAdd.forEach(grade => {
        const gradeRef = doc(gradesCollection);
        batch.set(gradeRef, {
          ...grade,
          published: false, // Por defecto no publicadas
          createdByUid: userIdToUse,
          createdAt: Date.now(),
        });
      });
      
      console.log('Intentando guardar', gradesToAdd.length, 'calificaciones con createdByUid:', userIdToUse);
      await batch.commit();
      console.log('Calificaciones guardadas exitosamente');
    } catch (error: any) {
      console.error('Error al guardar calificaciones:', error);
      throw new Error(`Error al guardar calificaciones: ${error.message || 'Error desconocido'}`);
    }
  };

  const publishGrades = async (courseLevel: number, period: Period) => {
    if (!currentUid) {
      throw new Error('No hay usuario autenticado');
    }
    // Buscar todas las calificaciones del curso y período
    const q = query(
      collection(db, 'grades'),
      where('courseLevel', '==', courseLevel),
      where('period', '==', period)
    );
    
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(docSnap => 
      updateDoc(doc(db, 'grades', docSnap.id), { 
        published: true,
        updatedByUid: currentUid 
      })
    );
    
    await Promise.all(updatePromises);
  };

  const publishBulletins = async (courseLevel: number, period: Period): Promise<{ success: boolean; message: string; publishedCount: number }> => {
    if (!currentUid) {
      return {
        success: false,
        message: 'No hay usuario autenticado',
        publishedCount: 0
      };
    }
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
        updateDoc(doc(db, 'grades', docSnap.id), { 
          published: true,
          updatedByUid: currentUid 
        })
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
    getBulletinStatus,
    refreshGrades
  }), [grades]);

  return <GradesContext.Provider value={value}>{children}</GradesContext.Provider>;
};


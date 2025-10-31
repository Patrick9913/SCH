'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import { Course, CourseInput, CourseUpdate } from '../types/course';
import { UserCurses, User, UserRole } from '../types/user';
import { useAuthContext } from './authContext';

interface CourseContextProps {
  courses: Course[];
  
  // CRUD Operations
  createCourse: (data: CourseInput) => Promise<void>;
  updateCourse: (courseId: string, data: CourseUpdate) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  
  // Assignment Operations
  assignPreceptorToCourse: (courseId: string, preceptorUid: string) => Promise<void>;
  assignStudentToCourse: (courseId: string, studentUid: string) => Promise<void>;
  removeStudentFromCourse: (courseId: string, studentUid: string) => Promise<void>;
  assignMultipleStudentsToCourse: (courseId: string, studentUids: string[]) => Promise<void>;
  
  // Query Functions
  getCourseByLevelAndDivision: (level: number, division: string) => Course | undefined;
  getCoursesByPreceptor: (preceptorUid: string) => Course[];
  getCoursesByLevel: (level: number) => Course[];
  getStudentsInCourse: (courseId: string) => string[];
  getPreceptorOfCourse: (courseId: string) => string | undefined;
}

const CourseContext = createContext<CourseContextProps | null>(null);

export const useCourses = () => {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return ctx;
};

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuthContext();
  const [courses, setCourses] = useState<Course[]>([]);

  // Listen to courses
  useEffect(() => {
    if (!uid) {
      setCourses([]);
      return;
    }
    
    const col = collection(db, 'courses');
    const q = query(col);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Course[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const createdAt = typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now());
          const updatedAt = data.updatedAt ? (typeof data.updatedAt === 'number' ? data.updatedAt : (data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now())) : undefined;
          
          return {
            id: d.id,
            level: data.level || 0,
            division: data.division || '',
            studentUids: Array.isArray(data.studentUids) ? data.studentUids : [],
            preceptorUid: data.preceptorUid || '',
            createdAt,
            createdByUid: data.createdByUid || '',
            updatedAt,
          } as Course;
        });
        // Ordenar por nivel y luego por división
        items.sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          return (a.division || '').localeCompare(b.division || '');
        });
        setCourses(items);
      },
      (error) => {
        console.error('Error en courseContext listener:', error);
        setCourses([]);
      }
    );
    return () => unsub();
  }, [uid]);

  // CRUD Operations
  const createCourse = async (data: CourseInput) => {
    if (!uid) return;
    
    // Verificar si ya existe un curso con el mismo nivel y división
    const existing = courses.find(c => 
      c.level === data.level && 
      c.division === data.division
    );
    
    if (existing) {
      throw new Error('Ya existe un curso con este nivel y división');
    }
    
    await addDoc(collection(db, 'courses'), {
      ...data,
      studentUids: data.studentUids || [],
      preceptorUid: data.preceptorUid || '',
      createdByUid: uid,
      createdAt: Date.now(),
    });
  };

  const updateCourse = async (courseId: string, data: CourseUpdate) => {
    await updateDoc(doc(db, 'courses', courseId), {
      ...data,
      updatedAt: Date.now(),
    });
  };

  const deleteCourse = async (courseId: string) => {
    await deleteDoc(doc(db, 'courses', courseId));
  };

  // Assignment Operations
  const assignPreceptorToCourse = async (courseId: string, preceptorUid: string) => {
    await updateCourse(courseId, { preceptorUid });
  };

  const assignStudentToCourse = async (courseId: string, studentUid: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    if (!course.studentUids.includes(studentUid)) {
      await updateCourse(courseId, {
        studentUids: [...course.studentUids, studentUid]
      });
    }
  };

  const removeStudentFromCourse = async (courseId: string, studentUid: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    await updateCourse(courseId, {
      studentUids: course.studentUids.filter(uid => uid !== studentUid)
    });
  };

  const assignMultipleStudentsToCourse = async (courseId: string, studentUids: string[]) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    // Combinar estudiantes existentes con los nuevos, sin duplicados
    const allStudentUids = Array.from(new Set([...course.studentUids, ...studentUids]));
    await updateCourse(courseId, { studentUids: allStudentUids });
  };

  // Query Functions
  const getCourseByLevelAndDivision = (level: number, division: string): Course | undefined => {
    return courses.find(c => c.level === level && c.division === division);
  };

  const getCoursesByPreceptor = (preceptorUid: string): Course[] => {
    return courses.filter(c => c.preceptorUid === preceptorUid);
  };

  const getCoursesByLevel = (level: number): Course[] => {
    return courses.filter(c => c.level === level);
  };

  const getStudentsInCourse = (courseId: string): string[] => {
    const course = courses.find(c => c.id === courseId);
    return course?.studentUids || [];
  };

  const getPreceptorOfCourse = (courseId: string): string | undefined => {
    const course = courses.find(c => c.id === courseId);
    return course?.preceptorUid;
  };

  return (
    <CourseContext.Provider value={{
      courses,
      createCourse,
      updateCourse,
      deleteCourse,
      assignPreceptorToCourse,
      assignStudentToCourse,
      removeStudentFromCourse,
      assignMultipleStudentsToCourse,
      getCourseByLevelAndDivision,
      getCoursesByPreceptor,
      getCoursesByLevel,
      getStudentsInCourse,
      getPreceptorOfCourse,
    }}>
      {children}
    </CourseContext.Provider>
  );
};


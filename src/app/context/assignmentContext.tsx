'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import { SubjectAssignment, TeacherAssignment, AssignmentInput, TeacherAssignmentInput, StudentAssignmentInput, AssignmentSummary, StudentAssignmentStatus, TeacherAssignmentStatus } from '../types/assignment';
import { Assignments, UserCurses } from '../types/user';
import { useAuthContext } from './authContext';

interface AssignmentContextProps {
  // Subject Assignments (estudiantes asignados a materias)
  subjectAssignments: SubjectAssignment[];
  addSubjectAssignment: (data: StudentAssignmentInput) => Promise<void>;
  addMultipleSubjectAssignments: (assignments: StudentAssignmentInput[]) => Promise<void>;
  removeSubjectAssignment: (assignmentId: string) => Promise<void>;
  getStudentSubjects: (studentUid: string, courseLevel: number) => number[];
  getStudentsInSubject: (subjectId: number, courseLevel: number) => string[];
  
  // Teacher Assignments (docentes asignados a materias/cursos)
  teacherAssignments: TeacherAssignment[];
  addTeacherAssignment: (data: TeacherAssignmentInput) => Promise<void>;
  addMultipleTeacherAssignments: (assignments: TeacherAssignmentInput[]) => Promise<void>;
  removeTeacherAssignment: (assignmentId: string) => Promise<void>;
  getTeacherSubjects: (teacherUid: string) => Array<{subjectId: number, courseLevel: number}>;
  getTeachersForSubject: (subjectId: number, courseLevel: number) => string[];
  
  // Utility functions
  getAssignmentSummary: () => AssignmentSummary[];
  getStudentAssignmentStatus: (studentUid: string) => StudentAssignmentStatus | null;
  getTeacherAssignmentStatus: (teacherUid: string) => TeacherAssignmentStatus | null;
  isStudentAssignedToSubject: (studentUid: string, subjectId: number, courseLevel: number) => boolean;
  isTeacherAssignedToSubject: (teacherUid: string, subjectId: number, courseLevel: number) => boolean;
}

const AssignmentContext = createContext<AssignmentContextProps | null>(null);

export const useAssignments = () => {
  const ctx = useContext(AssignmentContext);
  if (!ctx) {
    throw new Error('useAssignments must be used within an AssignmentProvider');
  }
  return ctx;
};

export const AssignmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuthContext();
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

  // Solo inicializar las suscripciones si hay un usuario autenticado

  // Listen to subject assignments
  useEffect(() => {
    if (!uid) {
      setSubjectAssignments([]);
      return;
    }
    
    const col = collection(db, 'subjectAssignments');
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: SubjectAssignment[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const createdAt = typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now());
        return {
          id: d.id,
          studentUid: data.studentUid,
          subjectId: data.subjectId,
          courseLevel: data.courseLevel,
          createdAt,
          createdByUid: data.createdByUid,
        } as SubjectAssignment;
      });
      setSubjectAssignments(items);
    });
    return () => unsub();
  }, [uid]);

  // Listen to teacher assignments
  useEffect(() => {
    if (!uid) {
      setTeacherAssignments([]);
      return;
    }
    
    const col = collection(db, 'teacherAssignments');
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: TeacherAssignment[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const createdAt = typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now());
        return {
          id: d.id,
          teacherUid: data.teacherUid,
          subjectId: data.subjectId,
          courseLevel: data.courseLevel,
          createdAt,
          createdByUid: data.createdByUid,
        } as TeacherAssignment;
      });
      setTeacherAssignments(items);
    });
    return () => unsub();
  }, [uid]);

  // Subject Assignment functions
  const addSubjectAssignment = async (data: StudentAssignmentInput) => {
    if (!uid) return;
    
    // Check if assignment already exists
    const existing = subjectAssignments.find(a => 
      a.studentUid === data.studentUid && 
      a.subjectId === data.subjectId && 
      a.courseLevel === data.courseLevel
    );
    
    if (existing) {
      throw new Error('El estudiante ya está asignado a esta materia en este curso');
    }
    
    await addDoc(collection(db, 'subjectAssignments'), {
      ...data,
      createdByUid: uid,
      createdAt: Date.now(),
    });
  };

  const addMultipleSubjectAssignments = async (assignments: StudentAssignmentInput[]) => {
    if (!uid) return;
    
    const batch = assignments.map(assignment => 
      addDoc(collection(db, 'subjectAssignments'), {
        ...assignment,
        createdByUid: uid,
        createdAt: Date.now(),
      })
    );
    
    await Promise.all(batch);
  };

  const removeSubjectAssignment = async (assignmentId: string) => {
    await deleteDoc(doc(db, 'subjectAssignments', assignmentId));
  };

  const getStudentSubjects = (studentUid: string, courseLevel: number): number[] => {
    return subjectAssignments
      .filter(a => a.studentUid === studentUid && a.courseLevel === courseLevel)
      .map(a => a.subjectId);
  };

  const getStudentsInSubject = (subjectId: number, courseLevel: number): string[] => {
    const result = subjectAssignments
      .filter(a => a.subjectId === subjectId && a.courseLevel === courseLevel)
      .map(a => a.studentUid);
    
    console.log('getStudentsInSubject:', {
      subjectId,
      courseLevel,
      totalAssignments: subjectAssignments.length,
      matchingAssignments: subjectAssignments.filter(a => a.subjectId === subjectId && a.courseLevel === courseLevel),
      result
    });
    
    return result;
  };

  // Teacher Assignment functions
  const addTeacherAssignment = async (data: TeacherAssignmentInput) => {
    if (!uid) return;
    
    // Check if assignment already exists
    const existing = teacherAssignments.find(a => 
      a.teacherUid === data.teacherUid && 
      a.subjectId === data.subjectId && 
      a.courseLevel === data.courseLevel
    );
    
    if (existing) {
      throw new Error('El docente ya está asignado a esta materia en este curso');
    }
    
    await addDoc(collection(db, 'teacherAssignments'), {
      ...data,
      createdByUid: uid,
      createdAt: Date.now(),
    });
  };

  const addMultipleTeacherAssignments = async (assignments: TeacherAssignmentInput[]) => {
    if (!uid) return;
    
    const batch = assignments.map(assignment => 
      addDoc(collection(db, 'teacherAssignments'), {
        ...assignment,
        createdByUid: uid,
        createdAt: Date.now(),
      })
    );
    
    await Promise.all(batch);
  };

  const removeTeacherAssignment = async (assignmentId: string) => {
    await deleteDoc(doc(db, 'teacherAssignments', assignmentId));
  };

  const getTeacherSubjects = (teacherUid: string): Array<{subjectId: number, courseLevel: number}> => {
    return teacherAssignments
      .filter(a => a.teacherUid === teacherUid)
      .map(a => ({ subjectId: a.subjectId, courseLevel: a.courseLevel }));
  };

  const getTeachersForSubject = (subjectId: number, courseLevel: number): string[] => {
    return teacherAssignments
      .filter(a => a.subjectId === subjectId && a.courseLevel === courseLevel)
      .map(a => a.teacherUid);
  };

  // Utility functions
  const getAssignmentSummary = (): AssignmentSummary[] => {
    const summary: AssignmentSummary[] = [];
    
    Object.entries(Assignments).forEach(([key, subjectName]) => {
      if (isNaN(Number(key))) return;
      const subjectId = Number(key);
      
      Object.entries(UserCurses).forEach(([courseKey, courseName]) => {
        if (isNaN(Number(courseKey))) return;
        const courseLevel = Number(courseKey);
        
        const assignedStudents = subjectAssignments.filter(a => 
          a.subjectId === subjectId && a.courseLevel === courseLevel
        ).length;
        
        const assignedTeachers = teacherAssignments.filter(a => 
          a.subjectId === subjectId && a.courseLevel === courseLevel
        ).length;
        
        summary.push({
          subjectId,
          courseLevel,
          subjectName: subjectName as string,
          courseName: courseName as string,
          assignedStudents,
          assignedTeachers,
          totalStudentsInCourse: 0, // This would need to be calculated from users
        });
      });
    });
    
    return summary;
  };

  const getStudentAssignmentStatus = (studentUid: string): StudentAssignmentStatus | null => {
    const studentAssignments = subjectAssignments.filter(a => a.studentUid === studentUid);
    if (studentAssignments.length === 0) return null;
    
    const courseLevel = studentAssignments[0].courseLevel;
    const assignedSubjects = studentAssignments.map(a => a.subjectId);
    
    return {
      studentUid,
      studentName: '', // This would need to be fetched from users
      courseLevel,
      assignedSubjects,
      availableSubjects: Object.keys(Assignments)
        .filter(key => !isNaN(Number(key)))
        .map(key => Number(key))
        .filter(subjectId => !assignedSubjects.includes(subjectId))
    };
  };

  const getTeacherAssignmentStatus = (teacherUid: string): TeacherAssignmentStatus | null => {
    const teacherAssignmentsList = teacherAssignments.filter(a => a.teacherUid === teacherUid);
    if (teacherAssignmentsList.length === 0) return null;
    
    const assignedSubjects = teacherAssignmentsList.map(a => ({
      subjectId: a.subjectId,
      courseLevel: a.courseLevel,
      subjectName: Assignments[a.subjectId as keyof typeof Assignments] as string,
      courseName: UserCurses[a.courseLevel as keyof typeof UserCurses] as string,
    }));
    
    return {
      teacherUid,
      teacherName: '', // This would need to be fetched from users
      assignedSubjects,
    };
  };

  const isStudentAssignedToSubject = (studentUid: string, subjectId: number, courseLevel: number): boolean => {
    return subjectAssignments.some(a => 
      a.studentUid === studentUid && 
      a.subjectId === subjectId && 
      a.courseLevel === courseLevel
    );
  };

  const isTeacherAssignedToSubject = (teacherUid: string, subjectId: number, courseLevel: number): boolean => {
    return teacherAssignments.some(a => 
      a.teacherUid === teacherUid && 
      a.subjectId === subjectId && 
      a.courseLevel === courseLevel
    );
  };

  const value = useMemo(() => ({ 
    subjectAssignments,
    addSubjectAssignment,
    addMultipleSubjectAssignments,
    removeSubjectAssignment,
    getStudentSubjects,
    getStudentsInSubject,
    teacherAssignments,
    addTeacherAssignment,
    addMultipleTeacherAssignments,
    removeTeacherAssignment,
    getTeacherSubjects,
    getTeachersForSubject,
    getAssignmentSummary,
    getStudentAssignmentStatus,
    getTeacherAssignmentStatus,
    isStudentAssignedToSubject,
    isTeacherAssignedToSubject,
  }), [subjectAssignments, teacherAssignments]);

  return <AssignmentContext.Provider value={value}>{children}</AssignmentContext.Provider>;
};

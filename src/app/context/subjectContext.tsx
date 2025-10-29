'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import { Subject, SubjectInput, SubjectUpdate, SubjectSummary, TeacherSubjectInfo, StudentSubjectInfo } from '../types/subject';
import { Assignments, UserCurses, User } from '../types/user';
import { useAuthContext } from './authContext';

interface SubjectContextProps {
  subjects: Subject[];
  
  // CRUD Operations
  createSubject: (data: SubjectInput) => Promise<void>;
  updateSubject: (subjectId: string, data: SubjectUpdate) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  
  // Assignment Operations
  assignTeacherToSubject: (subjectId: string, teacherUid: string) => Promise<void>;
  assignStudentToSubject: (subjectId: string, studentUid: string) => Promise<void>;
  removeStudentFromSubject: (subjectId: string, studentUid: string) => Promise<void>;
  assignMultipleStudentsToSubject: (subjectId: string, studentUids: string[]) => Promise<void>;
  
  // Query Functions
  getSubjectsByTeacher: (teacherUid: string) => Subject[];
  getSubjectsByStudent: (studentUid: string) => Subject[];
  getSubjectByCourseAndSubject: (courseLevel: number, subjectId: number) => Subject | undefined;
  getStudentsInSubject: (subjectId: string) => string[];
  getTeacherOfSubject: (subjectId: string) => string | undefined;
  getStudentsByTeacher: (teacherUid: string) => User[];
  
  // Utility Functions
  getSubjectSummary: () => SubjectSummary[];
  getTeacherSubjectInfo: (teacherUid: string) => TeacherSubjectInfo | null;
  getStudentSubjectInfo: (studentUid: string) => StudentSubjectInfo | null;
  isStudentAssignedToSubject: (studentUid: string, subjectId: string) => boolean;
  isTeacherAssignedToSubject: (teacherUid: string, subjectId: string) => boolean;
}

const SubjectContext = createContext<SubjectContextProps | null>(null);

export const useSubjects = () => {
  const ctx = useContext(SubjectContext);
  if (!ctx) {
    throw new Error('useSubjects must be used within a SubjectProvider');
  }
  return ctx;
};

export const SubjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuthContext();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Listen to users
  useEffect(() => {
    if (!uid) {
      setUsers([]);
      return;
    }
    
    const userRef = collection(db, 'users');
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        const usersData: User[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            ...data,
            id: d.id,
          } as User;
        });
        setUsers(usersData);
      },
      (error) => {
        console.error('Error en user listener en subjectContext:', error);
        setUsers([]);
      }
    );
    return () => unsub();
  }, [uid]);

  // Listen to subjects
  useEffect(() => {
    if (!uid) {
      setSubjects([]);
      return;
    }
    
    const col = collection(db, 'subjects');
    // Usar query simple sin orderBy para evitar errores de índices, ordenar en memoria
    const q = query(col);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Subject[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const createdAt = typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now());
          const updatedAt = data.updatedAt ? (typeof data.updatedAt === 'number' ? data.updatedAt : (data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now())) : undefined;
          
          return {
            id: d.id,
            name: data.name || '',
            subjectId: data.subjectId || 0,
            courseLevel: data.courseLevel || 0,
            teacherUid: data.teacherUid || '',
            studentUids: Array.isArray(data.studentUids) ? data.studentUids : [],
            catedrasHours: data.catedrasHours || 0,
            plannedSchedules: Array.isArray(data.plannedSchedules) ? data.plannedSchedules : [],
            createdAt,
            createdByUid: data.createdByUid || '',
            updatedAt,
          } as Subject;
        });
        // Ordenar manualmente por fecha (más reciente primero)
        items.sort((a, b) => b.createdAt - a.createdAt);
        setSubjects(items);
      },
      (error) => {
        console.error('Error en subjectContext listener:', error);
        setSubjects([]);
      }
    );
    return () => unsub();
  }, [uid]);

  // CRUD Operations
  const createSubject = async (data: SubjectInput) => {
    if (!uid) return;
    
    // Check if subject already exists for this course and subjectId
    const existing = subjects.find(s => 
      s.subjectId === data.subjectId && 
      s.courseLevel === data.courseLevel
    );
    
    if (existing) {
      throw new Error('Ya existe una materia con este nombre para este curso');
    }
    
    await addDoc(collection(db, 'subjects'), {
      ...data,
      studentUids: data.studentUids || [],
      createdByUid: uid,
      createdAt: Date.now(),
    });
  };

  const updateSubject = async (subjectId: string, data: SubjectUpdate) => {
    await updateDoc(doc(db, 'subjects', subjectId), {
      ...data,
      updatedAt: Date.now(),
    });
  };

  const deleteSubject = async (subjectId: string) => {
    await deleteDoc(doc(db, 'subjects', subjectId));
  };

  // Assignment Operations
  const assignTeacherToSubject = async (subjectId: string, teacherUid: string) => {
    await updateSubject(subjectId, { teacherUid });
  };

  const assignStudentToSubject = async (subjectId: string, studentUid: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    if (!subject.studentUids.includes(studentUid)) {
      const newStudentUids = [...subject.studentUids, studentUid];
      await updateSubject(subjectId, { studentUids: newStudentUids });
    }
  };

  const removeStudentFromSubject = async (subjectId: string, studentUid: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    const newStudentUids = subject.studentUids.filter(uid => uid !== studentUid);
    await updateSubject(subjectId, { studentUids: newStudentUids });
  };

  const assignMultipleStudentsToSubject = async (subjectId: string, studentUids: string[]) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    // Merge with existing students, avoiding duplicates
    const existingUids = subject.studentUids;
    const newStudentUids = [...new Set([...existingUids, ...studentUids])];
    
    await updateSubject(subjectId, { studentUids: newStudentUids });
  };

  // Query Functions
  const getSubjectsByTeacher = (teacherUid: string): Subject[] => {
    return subjects.filter(s => s.teacherUid === teacherUid);
  };

  const getSubjectsByStudent = (studentUid: string): Subject[] => {
    return subjects.filter(s => s.studentUids.includes(studentUid));
  };

  const getSubjectByCourseAndSubject = (courseLevel: number, subjectId: number): Subject | undefined => {
    return subjects.find(s => s.courseLevel === courseLevel && s.subjectId === subjectId);
  };

  const getStudentsInSubject = (subjectId: string): string[] => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.studentUids : [];
  };

  const getTeacherOfSubject = (subjectId: string): string | undefined => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.teacherUid : undefined;
  };

  const getStudentsByTeacher = (teacherUid: string): User[] => {
    // Verificar que tenemos datos disponibles
    if (!users.length || !subjects.length) {
      return [];
    }
    
    // Obtener las materias del docente
    const teacherSubjects = getSubjectsByTeacher(teacherUid);
    
    // Obtener todos los UIDs de estudiantes de las materias del docente
    const studentUidsInTeacherSubjects = new Set<string>();
    teacherSubjects.forEach(subject => {
      subject.studentUids.forEach(studentUid => {
        studentUidsInTeacherSubjects.add(studentUid);
      });
    });
    
    // Filtrar solo estudiantes que están en las materias del docente
    return users.filter(u => {
      return u.role === 3 && studentUidsInTeacherSubjects.has(u.uid);
    });
  };

  // Utility Functions
  const getSubjectSummary = (): SubjectSummary[] => {
    return subjects.map(subject => {
      // Buscar el docente en la lista de usuarios
      const teacher = users.find(u => u.uid === subject.teacherUid);
      
      return {
        subjectId: subject.subjectId,
        courseLevel: subject.courseLevel,
        subjectName: subject.name,
        courseName: Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === subject.courseLevel) || 'Curso desconocido',
        teacherName: teacher?.name || 'Sin asignar',
        teacherUid: subject.teacherUid,
        assignedStudents: subject.studentUids.length,
        totalStudentsInCourse: users.filter(u => u.role === 3 && u.level === subject.courseLevel).length,
      };
    });
  };

  const getTeacherSubjectInfo = (teacherUid: string): TeacherSubjectInfo | null => {
    const teacherSubjects = getSubjectsByTeacher(teacherUid);
    if (teacherSubjects.length === 0) return null;
    
    return {
      teacherUid,
      teacherName: '', // This would need to be fetched from users
      subjects: teacherSubjects.map(subject => ({
        subjectId: subject.subjectId,
        courseLevel: subject.courseLevel,
        subjectName: subject.name,
        courseName: Object.keys(UserCurses).find(key => UserCurses[key as keyof typeof UserCurses] === subject.courseLevel) || 'Curso desconocido',
        studentCount: subject.studentUids.length,
      })),
    };
  };

  const getStudentSubjectInfo = (studentUid: string): StudentSubjectInfo | null => {
    const studentSubjects = getSubjectsByStudent(studentUid);
    if (studentSubjects.length === 0) return null;
    
    return {
      studentUid,
      studentName: '', // This would need to be fetched from users
      courseLevel: studentSubjects[0]?.courseLevel || 0,
      subjects: studentSubjects.map(subject => ({
        subjectId: subject.subjectId,
        subjectName: subject.name,
        teacherName: '', // This would need to be fetched from users
      })),
    };
  };

  const isStudentAssignedToSubject = (studentUid: string, subjectId: string): boolean => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.studentUids.includes(studentUid) : false;
  };

  const isTeacherAssignedToSubject = (teacherUid: string, subjectId: string): boolean => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.teacherUid === teacherUid : false;
  };

  const value = useMemo(() => ({ 
    subjects,
    createSubject,
    updateSubject,
    deleteSubject,
    assignTeacherToSubject,
    assignStudentToSubject,
    removeStudentFromSubject,
    assignMultipleStudentsToSubject,
    getSubjectsByTeacher,
    getSubjectsByStudent,
    getSubjectByCourseAndSubject,
    getStudentsInSubject,
    getTeacherOfSubject,
    getStudentsByTeacher,
    getSubjectSummary,
    getTeacherSubjectInfo,
    getStudentSubjectInfo,
    isStudentAssignedToSubject,
    isTeacherAssignedToSubject,
  }), [subjects, users]);

  return <SubjectContext.Provider value={value}>{children}</SubjectContext.Provider>;
};

'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, addDoc, query, where, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config';
import { Task, TaskSubmission } from '../types/tasks';
import { useAuthContext } from './authContext';

interface TasksContextProps {
  tasks: Task[];
  submissions: TaskSubmission[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'createdByUid' | 'status'>) => Promise<void>;
  submitTask: (submission: Omit<TaskSubmission, 'id' | 'status'>) => Promise<void>;
  gradeSubmission: (submissionId: string, grade: number) => Promise<void>;
  getTasksForStudent: (studentUid: string) => Task[];
  getTaskSubmissions: (taskId: string) => TaskSubmission[];
}

const TasksContext = createContext<TasksContextProps | null>(null);

export const useTasks = () => {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks debe usarse dentro de TasksProvider');
  return ctx;
};

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuthContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);

  // Observar tareas
  useEffect(() => {
    const col = collection(db, 'tasks');
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: Task[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const createdAt = typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now());
        return {
          id: d.id,
          title: data.title,
          description: data.description,
          subjectId: data.subjectId,
          courseLevel: data.courseLevel,
          assignedByUid: data.assignedByUid,
          dueDate: data.dueDate,
          status: data.status,
          createdAt,
          createdByUid: data.createdByUid,
        } as Task;
      });
      setTasks(items);
    });
    return () => unsub();
  }, []);

  // Observar entregas
  useEffect(() => {
    const col = collection(db, 'taskSubmissions');
    const q = query(col);
    const unsub = onSnapshot(q, (snap) => {
      const items: TaskSubmission[] = snap.docs
        .map((d) => {
          const data = d.data() as any;
          const submittedAt = data.submittedAt ? (typeof data.submittedAt === 'number' ? data.submittedAt : data.submittedAt.toMillis()) : undefined;
          const gradedAt = data.gradedAt ? (typeof data.gradedAt === 'number' ? data.gradedAt : data.gradedAt.toMillis()) : undefined;
          return {
            id: d.id,
            taskId: data.taskId,
            studentUid: data.studentUid,
            content: data.content,
            grade: data.grade,
            submittedAt,
            gradedAt,
            gradedByUid: data.gradedByUid,
            status: data.status,
          } as TaskSubmission;
        })
        .sort((a, b) => {
          const timeA = a.submittedAt || 0;
          const timeB = b.submittedAt || 0;
          return timeB - timeA;
        });
      setSubmissions(items);
    });
    return () => unsub();
  }, []);

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'createdByUid' | 'status'>) => {
    if (!uid) return;
    await addDoc(collection(db, 'tasks'), {
      ...taskData,
      status: 'active',
      createdByUid: uid,
      createdAt: Date.now(),
    });
  };

  const submitTask = async (submissionData: Omit<TaskSubmission, 'id' | 'status'>) => {
    if (!uid) return;
    
    // Determinar si está tarde
    const task = tasks.find(t => t.id === submissionData.taskId);
    const isLate = task && new Date() > new Date(task.dueDate);
    
    await addDoc(collection(db, 'taskSubmissions'), {
      ...submissionData,
      status: isLate ? 'late' : 'submitted',
      submittedAt: Date.now(),
    });
  };

  const gradeSubmission = async (submissionId: string, grade: number) => {
    if (!uid) return;
    
    const submissionRef = doc(db, 'taskSubmissions', submissionId);
    await updateDoc(submissionRef, {
      grade,
      gradedAt: Date.now(),
      gradedByUid: uid,
      status: 'graded',
    });
  };

  const getTasksForStudent = (studentUid: string): Task[] => {
    return tasks;
  };

  const getTaskSubmissions = (taskId: string): TaskSubmission[] => {
    return submissions.filter(s => s.taskId === taskId);
  };

  const value = useMemo(() => ({ 
    tasks, 
    submissions,
    addTask, 
    submitTask,
    gradeSubmission,
    getTasksForStudent,
    getTaskSubmissions
  }), [tasks, submissions]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
};


import { CourseDivision } from './user';

export interface Course {
  id: string; // Firestore document ID
  level: number; // 1-7 (años/grados)
  division: CourseDivision | string; // A, B, C
  studentUids: string[]; // Array de UIDs de estudiantes asignados
  preceptorUid: string; // UID del preceptor (Staff) asignado
  createdAt: number;
  createdByUid: string;
  updatedAt?: number;
}

export interface CourseInput {
  level: number;
  division: CourseDivision | string;
  studentUids?: string[];
  preceptorUid?: string;
}

export interface CourseUpdate {
  studentUids?: string[];
  preceptorUid?: string;
  division?: CourseDivision | string;
}


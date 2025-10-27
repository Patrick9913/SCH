export type GradeValue = 'EP' | 'L' | 'AL' | 'S';
export type Period = 'primer_cuatrimestre' | 'segundo_cuatrimestre' | 'tercer_cuatrimestre';

export interface Grade {
  id: string;
  studentUid: string;
  subjectId: number; // Reference to Assignments enum
  courseLevel: number; // Reference to UserCurses enum (1°, 2°, 3°, 4°, 5°)
  period: Period;
  grade: GradeValue; // EP, L, AL, S
  published: boolean; // Solo visible para estudiantes si es true
  createdAt: number;
  createdByUid: string;
}

export interface GradeInput {
  studentUid: string;
  subjectId: number;
  courseLevel: number;
  period: Period;
  grade: GradeValue;
  published?: boolean; // Por defecto false cuando se crea
}

export const GradeLabels: Record<GradeValue, string> = {
  'EP': 'En Proceso',
  'L': 'Logrado',
  'AL': 'Altamente Logrado',
  'S': 'Superado'
};

export const PeriodLabels: Record<Period, string> = {
  'primer_cuatrimestre': 'Primer Cuatrimestre',
  'segundo_cuatrimestre': 'Segundo Cuatrimestre',
  'tercer_cuatrimestre': 'Tercer Cuatrimestre'
};

export interface GradeSummary {
  studentUid: string;
  subjectId: number;
  period: Period;
  courseLevel: number;
  grade: GradeValue;
}


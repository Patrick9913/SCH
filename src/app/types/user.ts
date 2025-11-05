export enum UserRole {
  Administrador = 1,
  Staff = 2,
  Estudiante = 3,
  Docente = 4,
  Familia  = 5,
  Seguridad = 6,
  SuperAdmin = 7,
}

export enum UserCurses {
  "1°" = 1,
  "2°" = 2,
  "3°" = 3,
  "4°" = 4,
  "5°" = 5,
  "6°" = 6,
  "7°" = 7
}

export enum CourseDivision {
  A = 'A',
  B = 'B',
  C = 'C'
}

export enum Assignments {
  Matematica = 1,
  Lengua = 2,
  Historia = 3,
  Geografia = 4,
  Biologia = 5,
  Fisica = 6,
  Quimica = 7,
  Ingles = 8,
  EducacionFisica = 9,
  Arte = 10,
  Tecnologia = 11,
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  uid: string;
  mail?: string;
  level?: UserCurses; // Mantener para retrocompatibilidad, pero derivar de courseId
  division?: CourseDivision | string; // Mantener para retrocompatibilidad, pero derivar de courseId
  courseId?: string; // ID del curso asignado (referencia al documento Course en Firestore)
  childId?: string; // Mantener para retrocompatibilidad (un solo hijo)
  childrenIds?: string[]; // Múltiples hijos (array de UIDs de estudiantes)
  dni?: number;
  asig?: number;
  password?: string; // Para usuarios pendientes
  createdAt?: Date;
  status?: 'pending' | 'active' | 'suspended' | 'egresado'; // Estado del usuario
  egresadoDate?: number; // Timestamp cuando se egresó
  egresadoYear?: number; // Año de egreso (ej: 2025)
}

export interface PersonalView {
  src?: string,
  name: string,
  role: string,
  level?: string
}

export type NewUserData = {
  firstName: string;
  mail: string;
  dni: number;
  role: number; // Cambiado de string a number
  password: string;
};
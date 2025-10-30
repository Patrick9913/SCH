export enum UserRole {
  Administrador = 1,
  Staff = 2,
  Estudiante = 3,
  Docente = 4,
  Familia  = 5,
}

export enum UserCurses {
  "1°" = 1,
  "2°" = 2,
  "3°" = 3,
  "4°" = 4,
  "5°" = 5
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
  level?: UserCurses;
  division?: CourseDivision | string; // División del curso (A, B, C)
  childId?: string;
  dni?: number;
  asig?: number;
  password?: string; // Para usuarios pendientes
  createdAt?: Date;
  status?: 'pending' | 'active' | 'suspended'; // Estado del usuario
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
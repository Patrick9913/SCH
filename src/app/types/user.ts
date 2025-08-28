export enum UserRole {
  Administrador = 1,
  Staff = 2,
  Estudiante = 3,
  Docente = 4,
  Familia  = 5,
}

export enum UserCurses {
  "1 °" = 1,
  "2 °" = 2,
  "3 °" = 3,
  "4 °" = 4,
  "5 °" = 5
}


export interface User {
  id: string;
  name: string;
  role: UserRole;
  uid: string;
  mail?: string;
  level?: UserCurses;
  childId?: string;
}
export enum UserRole {
  Student = 0,
  Teacher = 1,
  Admin   = 2,
  Parent  = 3,
  Staff   = 4, 
}

export interface User {
    id: string;
    name: string;
    role: UserRole;
    uid: string;
}
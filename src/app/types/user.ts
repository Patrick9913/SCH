export enum UserRole {
  Admin   = 1,
  Staff   = 2,
  Student = 3,
  Teacher = 4,
  Parent  = 5,
}


export interface User {
  id: string;
  name: string;
  role: UserRole;
  uid: string;
  childId?: string;
}
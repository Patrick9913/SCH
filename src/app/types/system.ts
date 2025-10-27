export interface GradeSettings {
  id: string;
  gradesLoadingEnabled: boolean;
  enabledBy: string; // uid del administrador
  enabledAt: number;
  disabledAt?: number;
}

export const ADMIN_EMAIL = 'patrickyoel13@gmail.com';


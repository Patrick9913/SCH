export type WithdrawalStatus = 'pending' | 'validated' | 'cancelled' | 'expired';

export interface EarlyWithdrawal {
  id: string;
  // Datos del familiar que autoriza
  authorizerUid: string;
  authorizerName: string;
  
  // Datos del alumno que será retirado
  studentUid: string;
  studentName: string;
  studentCourse?: string; // Ej: "5°"
  studentDivision?: string; // Ej: "A"
  
  // Datos de la persona que retira
  pickerName: string;
  pickerDni: string;
  pickerRelationship: string;
  
  // Fecha y hora del retiro
  withdrawalDate: string; // YYYY-MM-DD
  withdrawalTime: string; // HH:mm
  
  // Motivo del retiro
  reason: string;
  
  // Código QR único
  qrCode: string;
  
  // Estado del retiro
  status: WithdrawalStatus;
  
  // Información de validación
  validatedByUid?: string;
  validatedByName?: string;
  validatedAt?: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  
  // Fecha de expiración del QR (24 horas desde la creación)
  expiresAt: number;
}


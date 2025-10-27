export interface Schedule {
  id: string;
  courseLevel: number; // 1-5 (años)
  subjectId: number; // Referencia a Assignments
  teacherUid: string;
  dayOfWeek: number; // 0 = Lunes, 1 = Martes, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  classroom: string; // Sala/Aula
  createdAt: number;
  createdByUid: string;
}

export interface ScheduleInput {
  courseLevel: number;
  subjectId: number;
  teacherUid: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroom: string;
}

export const DayLabels = {
  0: 'Lunes',
  1: 'Martes',
  2: 'Miércoles',
  3: 'Jueves',
  4: 'Viernes',
  5: 'Sábado',
  6: 'Domingo'
} as const;

export const DayLabelsShort = {
  0: 'Lun',
  1: 'Mar',
  2: 'Mié',
  3: 'Jue',
  4: 'Vie',
  5: 'Sáb',
  6: 'Dom'
} as const;


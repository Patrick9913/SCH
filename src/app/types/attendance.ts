export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentUid: string;
  courseLevel: number; // Reference to UserCurses enum
  status: AttendanceStatus;
  createdByUid: string;
  createdAt: number;
}













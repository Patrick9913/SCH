export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentUid: string;
  subjectId?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  createdByUid: string;
  createdAt: number;
}













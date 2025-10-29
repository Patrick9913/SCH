export interface PlannedSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroom: string;
}

export interface Subject {
  id: string;
  name: string; // Nombre de la materia (ej: "Lengua", "Matemática")
  subjectId: number; // ID del enum Assignments
  courseLevel: number; // Curso (1°, 2°, 3°, etc.)
  teacherUid: string; // UID del docente asignado
  studentUids: string[]; // Array de UIDs de estudiantes asignados
  catedrasHours: number; // Horas cátedras semanales
  plannedSchedules: PlannedSchedule[]; // Horarios planificados al crear la materia
  createdAt: number;
  createdByUid: string;
  updatedAt?: number;
}

export interface SubjectInput {
  name: string;
  subjectId: number;
  courseLevel: number;
  teacherUid: string;
  studentUids?: string[];
  catedrasHours: number;
  plannedSchedules: PlannedSchedule[];
}

export interface SubjectUpdate {
  teacherUid?: string;
  studentUids?: string[];
}

// Tipos para el panel de administración
export interface SubjectSummary {
  subjectId: number;
  courseLevel: number;
  subjectName: string;
  courseName: string;
  teacherName: string;
  teacherUid: string;
  assignedStudents: number;
  totalStudentsInCourse: number;
}

export interface TeacherSubjectInfo {
  teacherUid: string;
  teacherName: string;
  subjects: Array<{
    subjectId: number;
    courseLevel: number;
    subjectName: string;
    courseName: string;
    studentCount: number;
  }>;
}

export interface StudentSubjectInfo {
  studentUid: string;
  studentName: string;
  courseLevel: number;
  subjects: Array<{
    subjectId: number;
    subjectName: string;
    teacherName: string;
  }>;
}

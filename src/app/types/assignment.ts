export interface SubjectAssignment {
  id: string;
  studentUid: string;
  subjectId: number; // Reference to Assignments enum
  courseLevel: number; // Reference to UserCurses enum (1°, 2°, 3°, 4°, 5°)
  createdAt: number;
  createdByUid: string;
}

export interface TeacherAssignment {
  id: string;
  teacherUid: string;
  subjectId: number; // Reference to Assignments enum
  courseLevel: number; // Reference to UserCurses enum (1°, 2°, 3°, 4°, 5°)
  createdAt: number;
  createdByUid: string;
}

export interface AssignmentInput {
  studentUid?: string;
  teacherUid?: string;
  subjectId: number;
  courseLevel: number;
}

export interface TeacherAssignmentInput {
  teacherUid: string;
  subjectId: number;
  courseLevel: number;
}

export interface StudentAssignmentInput {
  studentUid: string;
  subjectId: number;
  courseLevel: number;
}

// Tipos para el panel de administración
export interface AssignmentSummary {
  subjectId: number;
  courseLevel: number;
  subjectName: string;
  courseName: string;
  assignedStudents: number;
  assignedTeachers: number;
  totalStudentsInCourse: number;
}

export interface StudentAssignmentStatus {
  studentUid: string;
  studentName: string;
  courseLevel: number;
  assignedSubjects: number[];
  availableSubjects: number[];
}

export interface TeacherAssignmentStatus {
  teacherUid: string;
  teacherName: string;
  assignedSubjects: Array<{
    subjectId: number;
    courseLevel: number;
    subjectName: string;
    courseName: string;
  }>;
}

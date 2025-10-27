export interface Task {
  id: string;
  title: string;
  description: string;
  subjectId: number; // Referencia a Assignments
  courseLevel: number; // Referencia a UserCurses
  assignedByUid: string; // Profesor
  dueDate: string; // YYYY-MM-DD
  createdAt: number;
  createdByUid: string;
  status: 'active' | 'completed' | 'overdue'; // Estado general
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  studentUid: string;
  submittedAt?: number;
  content: string;
  grade?: number;
  gradedAt?: number;
  gradedByUid?: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'createdByUid' | 'status'>;
export type TaskSubmissionInput = Omit<TaskSubmission, 'id' | 'status'>;


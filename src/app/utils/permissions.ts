import { User, Assignments, UserCurses } from '@/app/types/user';

/**
 * Utilidades para manejar permisos de docentes y staff
 */

export interface TeacherPermissions {
  subjects: number[];
  courses: number[];
}

/**
 * Obtiene las materias asignadas a un docente
 */
export const getTeacherSubjects = (teacher: User): number[] => {
  if (!teacher || teacher.role !== 4) return [];
  
  // Si el docente tiene una asignatura específica asignada
  if (teacher.asig) {
    return [teacher.asig];
  }
  
  // Por defecto, si no tiene asignatura específica, puede ver todas
  return Object.keys(Assignments)
    .filter(key => !isNaN(Number(key)))
    .map(key => Number(key));
};

/**
 * Obtiene los cursos asignados a un docente
 */
export const getTeacherCourses = (teacher: User): number[] => {
  if (!teacher || teacher.role !== 4) return [];
  
  // Si el docente tiene cursos específicos asignados (esto se puede expandir)
  // Por ahora, todos los docentes pueden ver todos los cursos
  // En el futuro se puede agregar un campo 'courses' al usuario
  return Object.keys(UserCurses)
    .filter(key => !isNaN(Number(key)))
    .map(key => Number(key));
};

/**
 * Obtiene los permisos completos de un docente
 */
export const getTeacherPermissions = (teacher: User): TeacherPermissions => {
  return {
    subjects: getTeacherSubjects(teacher),
    courses: getTeacherCourses(teacher)
  };
};

/**
 * Verifica si un docente puede acceder a una materia específica
 */
export const canAccessSubject = (teacher: User, subjectId: number): boolean => {
  if (!teacher || teacher.role !== 4) return false;
  
  const permissions = getTeacherPermissions(teacher);
  return permissions.subjects.includes(subjectId);
};

/**
 * Verifica si un docente puede acceder a un curso específico
 */
export const canAccessCourse = (teacher: User, courseId: number): boolean => {
  if (!teacher || teacher.role !== 4) return false;
  
  const permissions = getTeacherPermissions(teacher);
  return permissions.courses.includes(courseId);
};

/**
 * Filtra las materias disponibles para un docente
 */
export const getAvailableSubjects = (teacher: User): Array<{id: number, name: string}> => {
  const permissions = getTeacherPermissions(teacher);
  
  return Object.entries(Assignments)
    .filter(([key]) => !isNaN(Number(key)))
    .filter(([key]) => permissions.subjects.includes(Number(key)))
    .map(([key, name]) => ({
      id: Number(key),
      name: name as string
    }));
};

/**
 * Filtra los cursos disponibles para un docente
 */
export const getAvailableCourses = (teacher: User): Array<{id: number, name: string}> => {
  const permissions = getTeacherPermissions(teacher);
  
  return Object.entries(UserCurses)
    .filter(([key]) => !isNaN(Number(key)))
    .filter(([key]) => permissions.courses.includes(Number(key)))
    .map(([key, name]) => ({
      id: Number(key),
      name: name as string
    }));
};

/**
 * Verifica si un usuario es administrador (puede ver todo)
 */
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 1;
};

/**
 * Verifica si un usuario es staff (puede ver todo)
 */
export const isStaff = (user: User | null): boolean => {
  return user?.role === 2;
};

/**
 * Verifica si un usuario es docente
 */
export const isTeacher = (user: User | null): boolean => {
  return user?.role === 4;
};

/**
 * Verifica si un usuario puede gestionar calificaciones/asistencias
 */
export const canManageGrades = (user: User | null): boolean => {
  return isAdmin(user) || isStaff(user) || isTeacher(user);
};

/**
 * Obtiene el nombre de la materia por ID
 */
export const getSubjectName = (subjectId: number): string => {
  return Assignments[subjectId as keyof typeof Assignments] || 'Materia desconocida';
};

/**
 * Obtiene el nombre del curso por ID
 */
export const getCourseName = (courseId: number): string => {
  return UserCurses[courseId as keyof typeof UserCurses] || 'Curso desconocido';
};

import { UserRole } from '@/app/types/user';

/**
 * Sistema Centralizado de Permisos por Rol
 * 
 * Este archivo define TODOS los permisos de cada rol en un solo lugar.
 * Para agregar un nuevo permiso o modificar uno existente, solo edita este archivo.
 * 
 * ROLES:
 * - SuperAdmin (7): Control absoluto, puede gestionar admins y hacer pase de año
 * - Administrador (1): Control total excepto gestionar otros admins
 * - Staff (2): Gestión de asistencias y cursos
 * - Estudiante (3): Solo lectura de sus datos
 * - Docente (4): Gestión de calificaciones y asistencias
 * - Familia (5): Lectura de datos de hijos, retiros anticipados
 * - Seguridad (6): Validación de retiros
 */

// ============================================
// DEFINICIÓN DE PERMISOS
// ============================================

export const RolePermissions = {
  // Permisos de lectura
  canViewAllUsers: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff],
  canViewStudents: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff, UserRole.Docente],
  canViewTeachers: [UserRole.SuperAdmin, UserRole.Administrador],
  canViewStatistics: [UserRole.SuperAdmin, UserRole.Administrador],
  
  // Permisos de gestión de usuarios
  canCreateUsers: [UserRole.SuperAdmin, UserRole.Administrador],
  canEditUsers: [UserRole.SuperAdmin, UserRole.Administrador],
  canDeleteUsers: [UserRole.SuperAdmin, UserRole.Administrador],
  canSuspendUsers: [UserRole.SuperAdmin, UserRole.Administrador],
  canActivateUsers: [UserRole.SuperAdmin, UserRole.Administrador],
  
  // Permisos especiales de SuperAdmin sobre Admins
  canManageAdmins: [UserRole.SuperAdmin], // Solo SuperAdmin puede gestionar otros admins
  canManageSuperAdmins: [UserRole.SuperAdmin],
  
  // Permisos de asistencias
  canViewAllAttendance: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff, UserRole.Docente],
  canCreateAttendance: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff, UserRole.Docente],
  canUpdateAttendance: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff, UserRole.Docente],
  canDeleteAttendance: [], // Nadie puede eliminar asistencias
  
  // Permisos de calificaciones
  canViewAllGrades: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Docente],
  canCreateGrades: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Docente],
  canUpdateGrades: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Docente],
  canPublishBulletins: [UserRole.SuperAdmin, UserRole.Administrador], // Solo admins pueden publicar
  canDeleteGrades: [], // Nadie puede eliminar calificaciones
  
  // Permisos de materias
  canViewSubjects: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff, UserRole.Docente, UserRole.Estudiante, UserRole.Familia],
  canCreateSubjects: [UserRole.SuperAdmin, UserRole.Administrador],
  canUpdateSubjects: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Docente],
  canDeleteSubjects: [UserRole.SuperAdmin, UserRole.Administrador],
  
  // Permisos de cursos
  canViewCourses: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff, UserRole.Docente, UserRole.Estudiante, UserRole.Familia],
  canCreateCourses: [UserRole.SuperAdmin, UserRole.Administrador],
  canUpdateCourses: [UserRole.SuperAdmin, UserRole.Administrador],
  canDeleteCourses: [UserRole.SuperAdmin, UserRole.Administrador],
  
  // Permisos de horarios
  canViewSchedules: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff, UserRole.Docente, UserRole.Estudiante, UserRole.Familia],
  canCreateSchedules: [UserRole.SuperAdmin, UserRole.Administrador],
  canUpdateSchedules: [UserRole.SuperAdmin, UserRole.Administrador],
  canDeleteSchedules: [UserRole.SuperAdmin, UserRole.Administrador],
  
  // Permisos de avisos/anuncios
  canViewAnnouncements: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff, UserRole.Docente, UserRole.Estudiante, UserRole.Familia, UserRole.Seguridad],
  canCreateAnnouncements: [UserRole.SuperAdmin, UserRole.Administrador],
  canDeleteAnnouncements: [UserRole.SuperAdmin, UserRole.Administrador],
  
  // Permisos de retiros anticipados
  canViewAllWithdrawals: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Seguridad],
  canCreateWithdrawals: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Familia],
  canValidateWithdrawals: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Seguridad],
  canCancelWithdrawals: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Familia],
  
  // Permisos de mensajería
  canSendMessages: [UserRole.SuperAdmin, UserRole.Administrador, UserRole.Staff, UserRole.Docente, UserRole.Familia, UserRole.Seguridad],
  
  // Permisos especiales
  canPerformYearTransition: [UserRole.SuperAdmin], // Solo SuperAdmin puede hacer pase de año
  canAccessAdminPanel: [UserRole.SuperAdmin, UserRole.Administrador],
  canManageSettings: [UserRole.SuperAdmin, UserRole.Administrador],
} as const;

// ============================================
// FUNCIONES HELPER PARA VERIFICAR PERMISOS
// ============================================

type PermissionKey = keyof typeof RolePermissions;

/**
 * Verifica si un usuario tiene un permiso específico
 * @param userRole - El rol del usuario (número)
 * @param permission - La clave del permiso a verificar
 * @returns true si el usuario tiene el permiso, false en caso contrario
 * 
 * @example
 * hasPermission(user.role, 'canCreateUsers') // true si es SuperAdmin o Admin
 */
export function hasPermission(userRole: number | undefined | null, permission: PermissionKey): boolean {
  if (!userRole) return false;
  const allowedRoles = RolePermissions[permission] as readonly UserRole[];
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * Verifica si un usuario puede gestionar a otro usuario
 * (crear, editar, suspender, eliminar)
 */
export function canManageUser(currentUserRole: number | undefined | null, targetUserRole: number): boolean {
  if (!currentUserRole) return false;
  
  // SuperAdmin puede gestionar a TODOS sin restricción
  if (currentUserRole === UserRole.SuperAdmin) return true;
  
  // Admin regular puede gestionar a todos EXCEPTO SuperAdmins y otros Admins
  if (currentUserRole === UserRole.Administrador) {
    // Puede gestionar: Staff (2), Estudiante (3), Docente (4), Familia (5), Seguridad (6)
    return targetUserRole !== UserRole.SuperAdmin && targetUserRole !== UserRole.Administrador;
  }
  
  // Otros roles no pueden gestionar usuarios
  return false;
}

/**
 * Verifica si un usuario es admin (cualquier tipo)
 */
export function isAnyAdmin(userRole: number | undefined | null): boolean {
  if (!userRole) return false;
  return userRole === UserRole.SuperAdmin || userRole === UserRole.Administrador;
}

/**
 * Verifica si un usuario es SuperAdmin
 */
export function isSuperAdmin(userRole: number | undefined | null): boolean {
  return userRole === UserRole.SuperAdmin;
}

/**
 * Verifica si un usuario es Admin regular
 */
export function isAdmin(userRole: number | undefined | null): boolean {
  return userRole === UserRole.Administrador;
}

/**
 * Verifica si un usuario es Staff
 */
export function isStaff(userRole: number | undefined | null): boolean {
  return userRole === UserRole.Staff;
}

/**
 * Verifica si un usuario es Docente
 */
export function isTeacher(userRole: number | undefined | null): boolean {
  return userRole === UserRole.Docente;
}

/**
 * Verifica si un usuario es Estudiante
 */
export function isStudent(userRole: number | undefined | null): boolean {
  return userRole === UserRole.Estudiante;
}

/**
 * Verifica si un usuario es Familia
 */
export function isFamily(userRole: number | undefined | null): boolean {
  return userRole === UserRole.Familia;
}

/**
 * Verifica si un usuario es Seguridad
 */
export function isSecurity(userRole: number | undefined | null): boolean {
  return userRole === UserRole.Seguridad;
}

/**
 * Obtiene el nombre del rol en español
 */
export function getRoleName(role: number): string {
  const roleNames: Record<number, string> = {
    [UserRole.Administrador]: 'Administrador',
    [UserRole.Staff]: 'Staff',
    [UserRole.Estudiante]: 'Estudiante',
    [UserRole.Docente]: 'Docente',
    [UserRole.Familia]: 'Familia',
    [UserRole.Seguridad]: 'Seguridad',
    [UserRole.SuperAdmin]: 'Super Administrador',
  };
  
  return roleNames[role] || 'Desconocido';
}

/**
 * Obtiene el nombre del curso por ID
 */
export function getCourseName(courseId: number): string {
  const courseNames: Record<number, string> = {
    1: '1°',
    2: '2°',
    3: '3°',
    4: '4°',
    5: '5°',
    6: '6°',
    7: '7°',
  };
  return courseNames[courseId] || `${courseId}°`;
}

/**
 * Obtiene el nombre de la materia por ID
 */
export function getSubjectName(subjectId: number): string {
  const subjectNames: Record<number, string> = {
    1: 'Matemática',
    2: 'Lengua',
    3: 'Historia',
    4: 'Geografía',
    5: 'Biología',
    6: 'Física',
    7: 'Química',
    8: 'Inglés',
    9: 'Educación Física',
    10: 'Arte',
    11: 'Tecnología',
  };
  return subjectNames[subjectId] || 'Materia desconocida';
}

// ============================================
// HOOKS PARA REACT COMPONENTS
// ============================================

/**
 * Hook para obtener los permisos del usuario actual
 * Usa el contexto de autenticación automáticamente
 */
export function useUserPermissions(userRole: number | undefined | null) {
  return {
    // Permisos básicos
    canViewAllUsers: hasPermission(userRole, 'canViewAllUsers'),
    canViewStatistics: hasPermission(userRole, 'canViewStatistics'),
    canCreateUsers: hasPermission(userRole, 'canCreateUsers'),
    canEditUsers: hasPermission(userRole, 'canEditUsers'),
    canDeleteUsers: hasPermission(userRole, 'canDeleteUsers'),
    canSuspendUsers: hasPermission(userRole, 'canSuspendUsers'),
    
    // Permisos de asistencias
    canViewAllAttendance: hasPermission(userRole, 'canViewAllAttendance'),
    canCreateAttendance: hasPermission(userRole, 'canCreateAttendance'),
    canUpdateAttendance: hasPermission(userRole, 'canUpdateAttendance'),
    
    // Permisos de calificaciones
    canViewAllGrades: hasPermission(userRole, 'canViewAllGrades'),
    canCreateGrades: hasPermission(userRole, 'canCreateGrades'),
    canPublishBulletins: hasPermission(userRole, 'canPublishBulletins'),
    
    // Permisos de materias y cursos
    canCreateSubjects: hasPermission(userRole, 'canCreateSubjects'),
    canUpdateSubjects: hasPermission(userRole, 'canUpdateSubjects'),
    canCreateCourses: hasPermission(userRole, 'canCreateCourses'),
    
    // Permisos de avisos
    canCreateAnnouncements: hasPermission(userRole, 'canCreateAnnouncements'),
    canDeleteAnnouncements: hasPermission(userRole, 'canDeleteAnnouncements'),
    
    // Permisos especiales
    canPerformYearTransition: hasPermission(userRole, 'canPerformYearTransition'),
    canAccessAdminPanel: hasPermission(userRole, 'canAccessAdminPanel'),
    canManageAdmins: hasPermission(userRole, 'canManageAdmins'),
    
    // Permisos de mensajería
    canSendMessages: hasPermission(userRole, 'canSendMessages'),
    
    // Verificadores de rol
    isSuperAdmin: isSuperAdmin(userRole),
    isAdmin: isAdmin(userRole),
    isAnyAdmin: isAnyAdmin(userRole),
    isStaff: isStaff(userRole),
    isTeacher: isTeacher(userRole),
    isStudent: isStudent(userRole),
    isFamily: isFamily(userRole),
    isSecurity: isSecurity(userRole),
    
    // Función para verificar cualquier permiso
    hasPermission: (permission: PermissionKey) => hasPermission(userRole, permission),
    
    // Función para verificar si puede gestionar a otro usuario
    canManageUser: (targetUserRole: number) => canManageUser(userRole, targetUserRole),
  };
}

// ============================================
// EJEMPLO DE USO
// ============================================

/**
 * ANTES (código disperso y difícil de mantener):
 * 
 * if (user?.role === 1 || user?.role === 7) {
 *   // hacer algo
 * }
 * 
 * DESPUÉS (centralizado y claro):
 * 
 * if (hasPermission(user?.role, 'canCreateUsers')) {
 *   // hacer algo
 * }
 * 
 * O usando el hook:
 * 
 * const permissions = useUserPermissions(user?.role);
 * if (permissions.canCreateUsers) {
 *   // hacer algo
 * }
 */


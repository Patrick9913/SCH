# Sistema Centralizado de Permisos

## 📋 Resumen

Este documento explica el nuevo sistema centralizado de permisos implementado en `src/app/utils/rolePermissions.ts`.

## ⚠️ Problema Anterior

Antes, los permisos estaban dispersos en múltiples archivos:

```typescript
// En Home.tsx
if (user?.role === 1 || user?.role === 7) { ... }

// En BulletinReports.tsx
if (user?.role === 1 || user?.role === 7) { ... }

// En Personal.tsx
const isAdmin = currentUser?.role === 1;
```

**Problemas:**
- Difícil de mantener
- Propenso a errores
- Cada cambio requiere editar múltiples archivos
- No hay una fuente única de verdad

## ✅ Solución: Sistema Centralizado

Todo está definido en **UN SOLO ARCHIVO**: `src/app/utils/rolePermissions.ts`

## 🎯 Cómo Usar

### Opción 1: Función `hasPermission()`

```typescript
import { hasPermission } from '@/app/utils/rolePermissions';

// Verificar si puede crear usuarios
if (hasPermission(user?.role, 'canCreateUsers')) {
  // Mostrar botón de crear usuario
}

// Verificar si puede publicar boletines
if (hasPermission(user?.role, 'canPublishBulletins')) {
  // Mostrar botón de publicar
}
```

### Opción 2: Hook `useUserPermissions()`

```typescript
import { useUserPermissions } from '@/app/utils/rolePermissions';
import { useAuthContext } from '@/app/context/authContext';

function MiComponente() {
  const { user } = useAuthContext();
  const permissions = useUserPermissions(user?.role);
  
  return (
    <div>
      {permissions.canCreateUsers && (
        <button>Crear Usuario</button>
      )}
      
      {permissions.canPublishBulletins && (
        <button>Publicar Boletín</button>
      )}
      
      {permissions.isSuperAdmin && (
        <button>Pase de Año</button>
      )}
    </div>
  );
}
```

### Opción 3: Funciones Helper Específicas

```typescript
import { 
  isSuperAdmin, 
  isAnyAdmin, 
  canManageUser 
} from '@/app/utils/rolePermissions';

// Verificar si es SuperAdmin
if (isSuperAdmin(user?.role)) {
  // Solo SuperAdmin
}

// Verificar si es cualquier tipo de admin
if (isAnyAdmin(user?.role)) {
  // SuperAdmin o Admin regular
}

// Verificar si puede gestionar a otro usuario
if (canManageUser(currentUser?.role, targetUser.role)) {
  // Mostrar botones de editar/eliminar
}
```

## 📝 Permisos Disponibles

### Gestión de Usuarios
- `canViewAllUsers`
- `canCreateUsers`
- `canEditUsers`
- `canDeleteUsers`
- `canSuspendUsers`
- `canActivateUsers`
- `canManageAdmins` (solo SuperAdmin)
- `canManageSuperAdmins` (solo SuperAdmin)

### Asistencias
- `canViewAllAttendance`
- `canCreateAttendance`
- `canUpdateAttendance`

### Calificaciones
- `canViewAllGrades`
- `canCreateGrades`
- `canUpdateGrades`
- `canPublishBulletins` (solo Admins)

### Materias y Cursos
- `canCreateSubjects`
- `canUpdateSubjects`
- `canDeleteSubjects`
- `canCreateCourses`
- `canUpdateCourses`
- `canDeleteCourses`

### Otros
- `canCreateAnnouncements`
- `canDeleteAnnouncements`
- `canPerformYearTransition` (solo SuperAdmin)
- `canAccessAdminPanel`
- `canManageSettings`

## 🔄 Cómo Migrar Código Existente

### ANTES ❌
```typescript
if (user?.role === 1 || user?.role === 7) {
  // hacer algo
}

const isAdmin = currentUser?.role === 1;
const isSuperAdmin = currentUser?.role === 7;
```

### DESPUÉS ✅
```typescript
import { hasPermission, useUserPermissions } from '@/app/utils/rolePermissions';

if (hasPermission(user?.role, 'canCreateUsers')) {
  // hacer algo
}

// O usando el hook
const permissions = useUserPermissions(user?.role);
if (permissions.canCreateUsers) {
  // hacer algo
}
```

## 🎨 Ejemplos Completos

### Ejemplo 1: Botón condicional

```typescript
import { useUserPermissions } from '@/app/utils/rolePermissions';
import { useAuthContext } from '@/app/context/authContext';

function UserList() {
  const { user } = useAuthContext();
  const permissions = useUserPermissions(user?.role);
  
  return (
    <div>
      <h1>Usuarios</h1>
      
      {permissions.canCreateUsers && (
        <button onClick={handleCreateUser}>
          Crear Nuevo Usuario
        </button>
      )}
      
      {users.map(u => (
        <UserCard 
          key={u.id}
          user={u}
          canEdit={permissions.canManageUser(u.role)}
          canDelete={permissions.canManageUser(u.role)}
        />
      ))}
    </div>
  );
}
```

### Ejemplo 2: Restricción de acceso

```typescript
import { hasPermission } from '@/app/utils/rolePermissions';
import { useAuthContext } from '@/app/context/authContext';

function AdminPanel() {
  const { user } = useAuthContext();
  
  if (!hasPermission(user?.role, 'canAccessAdminPanel')) {
    return (
      <div>
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder al panel de administración.</p>
      </div>
    );
  }
  
  return (
    <div>
      {/* Panel de administración */}
    </div>
  );
}
```

### Ejemplo 3: Gestión de usuarios

```typescript
import { canManageUser, hasPermission } from '@/app/utils/rolePermissions';
import { useAuthContext } from '@/app/context/authContext';

function PersonalView({ targetUser }) {
  const { user: currentUser } = useAuthContext();
  
  const canEdit = canManageUser(currentUser?.role, targetUser.role);
  const canDelete = canManageUser(currentUser?.role, targetUser.role);
  const canSuspend = hasPermission(currentUser?.role, 'canSuspendUsers') && 
                     canManageUser(currentUser?.role, targetUser.role);
  
  return (
    <div>
      <h3>{targetUser.name}</h3>
      
      {canEdit && (
        <button onClick={handleEdit}>Editar</button>
      )}
      
      {canDelete && targetUser.id !== currentUser?.id && (
        <button onClick={handleDelete}>Eliminar</button>
      )}
      
      {canSuspend && targetUser.id !== currentUser?.id && (
        <button onClick={handleSuspend}>Suspender</button>
      )}
    </div>
  );
}
```

## 🔧 Cómo Agregar un Nuevo Permiso

1. Abre `src/app/utils/rolePermissions.ts`
2. Agrega el nuevo permiso en `RolePermissions`:

```typescript
export const RolePermissions = {
  // ... permisos existentes
  
  // Nuevo permiso
  canExportReports: [UserRole.SuperAdmin, UserRole.Administrador],
} as const;
```

3. Úsalo en tus componentes:

```typescript
if (hasPermission(user?.role, 'canExportReports')) {
  // Mostrar botón de exportar
}
```

## 📊 Matriz de Permisos Visualizada

| Permiso | SuperAdmin | Admin | Staff | Docente | Estudiante | Familia | Seguridad |
|---------|------------|-------|-------|---------|------------|---------|-----------|
| Crear Usuarios | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestionar Admins | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pase de Año | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear Asistencias | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publicar Boletines | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear Materias | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 🎯 Ventajas de este Sistema

✅ **Un solo lugar** para definir todos los permisos
✅ **Fácil de mantener** - cambios en un solo archivo
✅ **Menos errores** - no olvidar actualizar algún archivo
✅ **Autodocumentado** - los permisos son claros y legibles
✅ **Type-safe** - TypeScript verifica que uses permisos válidos
✅ **Testeable** - puedes hacer tests unitarios fácilmente

## 🚀 Próximos Pasos

1. **Migrar componentes existentes** para usar este sistema
2. **Eliminar código duplicado** de verificaciones de roles
3. **Agregar tests** para las funciones de permisos
4. **Documentar roles nuevos** cuando se agreguen

## 📞 Soporte

Si necesitas agregar un nuevo permiso o tienes dudas sobre cómo usar el sistema, consulta este documento o revisa el archivo `src/app/utils/rolePermissions.ts` que tiene ejemplos completos.


# Reglas de Firestore - Documentación Definitiva

## 📋 Resumen de Cambios

Las reglas de seguridad de Firestore han sido actualizadas con comentarios detallados que especifican exactamente qué rol puede hacer qué en cada colección.

## ✅ Validación por Rol

### Funciones Helper Definidas

```javascript
getUserRole(userId)           // Obtiene el rol del usuario
isAdmin(userId)              // Verifica si es Admin (role = 1)
isSuperAdmin(userId)         // Verifica si es Super Admin (role = 7)
isAnyAdmin(userId)           // Verifica si es Admin o Super Admin (roles 1, 7)
isStaffOnly(userId)          // Verifica si es Staff (role = 2)
canManageAttendance(userId)  // SuperAdmin, Admin, Staff o Docente (roles 1, 2, 4, 7)
isStudent(userId)            // Verifica si es Estudiante (role = 3)
isTeacher(userId)            // Verifica si es Docente (role = 4)
isFamily(userId)             // Verifica si es Familia (role = 5)
isSecurity(userId)           // Verifica si es Seguridad (role = 6)
canCreateGrade(userId)       // SuperAdmin, Admin siempre, Docente si gradesLoadingEnabled
```

## 🔐 Permisos por Colección

### 1. USERS (Usuarios)
- **Lectura**: Todos (filtrado en cliente según contexto)
- **Crear**: SuperAdmin (7) y Admin (1)
  - SuperAdmin puede crear cualquier rol incluyendo otros SuperAdmins
  - Admin puede crear roles 1-6 pero no SuperAdmins
- **Actualizar**: SuperAdmin (7) y Admin (1)
  - SuperAdmin puede editar/suspender otros Admins y SuperAdmins
  - Admin NO puede modificar SuperAdmins
- **Eliminar**: SuperAdmin (7) y Admin (1)
  - SuperAdmin puede eliminar cualquier usuario
  - Admin NO puede eliminar SuperAdmins

### 2. ATTENDANCE (Asistencias)
- **Lectura**: Todos (filtrado en cliente)
- **Crear**: SuperAdmin (7), Admin (1), Staff (2), Docente (4)
  - Usa: `canManageAttendance()` - incluye roles [1, 2, 4, 7]
- **Actualizar**: SuperAdmin (7), Admin (1), Staff (2), Docente (4)
  - Solo campos: status, updatedAt, updatedByUid
  - Usa: `canManageAttendance()`
- **Eliminar**: Deshabilitado

### 3. GRADES (Calificaciones)
- **Lectura**: Todos (filtrado en cliente)
  - Estudiantes y Familias solo ven published=true
- **Crear**: 
  - SuperAdmin (7) y Admin (1): Siempre
  - Docente (4): Solo si `gradesLoadingEnabled=true`
  - Usa: `canCreateGrade()`
- **Actualizar**: SuperAdmin (7) y Admin (1)
  - Solo puede cambiar: published, updatedByUid
  - **Docentes NO pueden publicar boletines**
- **Eliminar**: Deshabilitado

### 4. SUBJECTS (Materias)
- **Lectura**: Todos
- **Crear**: SuperAdmin (7) y Admin (1) - validación en cliente
- **Actualizar**: SuperAdmin (7), Admin (1) y Docente (4) - validación en cliente
- **Eliminar**: SuperAdmin (7) y Admin (1) - validación en cliente

### 5. COURSES (Cursos)
- **Lectura**: Todos
- **Crear**: SuperAdmin (7) y Admin (1)
  - Requiere verificación de usuario existente
- **Actualizar**: SuperAdmin (7) y Admin (1)
  - Puede cambiar: studentUids, preceptorUid, division, **level** (para pase de año)
- **Eliminar**: SuperAdmin (7) y Admin (1) - validación en cliente

### 6. ANNOUNCEMENTS (Anuncios)
- **Lectura**: Todos (filtrado por audience en cliente)
- **Crear**: SuperAdmin (7) y Admin (1) - validación en cliente
- **Actualizar**: Deshabilitado (no se editan)
- **Eliminar**: SuperAdmin (7) y Admin (1) - validación en cliente

### 7. EARLY_WITHDRAWALS (Retiros Anticipados)
- **Lectura**: Todos (filtrado en cliente)
  - Seguridad ve todos para validar
  - Familia ve solo los de sus hijos
- **Crear**: SuperAdmin (7), Admin (1) y Familia (5)
- **Actualizar**: 
  - SuperAdmin (7) y Admin (1): Todo
  - Seguridad (6): Puede cambiar status (validar)
  - Familia (5): Puede cancelar propios - validación en cliente
- **Eliminar**: Deshabilitado

### 8. SCHEDULES (Horarios)
- **Lectura**: Todos
- **Crear**: Validación en cliente (SuperAdmin y Admin)
- **Actualizar**: Validación en cliente (SuperAdmin y Admin)
- **Eliminar**: Deshabilitado

### 9. SYSTEM/SETTINGS (Configuración)
- **Lectura**: Todos
- **Crear/Actualizar**: Validación en cliente (SuperAdmin y Admin)

### 10. YEAR_TRANSITION (Pase de Año)
- **Operación exclusiva del SuperAdmin (role = 7)**
- Permite promover masivamente a estudiantes al siguiente nivel
- Incluye manejo de egresados (estudiantes de 5to año)
- Permite exclusión de estudiantes específicos (repetidores)

## 🚨 Puntos Críticos

### Super Administrador
✅ **NUEVO ROL (7)**: Control absoluto sobre la aplicación
- Único rol que puede gestionar otros Administradores
- Único rol que puede ejecutar el pase de año
- Admin regular (role 1) NO puede modificar o eliminar SuperAdmins
- La jerarquía es: SuperAdmin > Admin > resto de roles

### Asistencias
✅ **CORRECTO**: SuperAdmin (7), Admin (1), Staff (2), Docente (4) pueden crear y actualizar
- Usa `canManageAttendance()` que valida roles [1, 2, 4, 7]

### Calificaciones
✅ **CORRECTO**: 
- SuperAdmin y Admin siempre pueden crear
- Docente puede crear solo si `gradesLoadingEnabled=true`
- Solo SuperAdmin y Admin pueden publicar boletines (cambiar `published`)

### Validaciones en Cliente
⚠️ La mayoría de validaciones de permisos se hacen en el cliente porque:
1. Firestore Rules no tienen sistema de autenticación personalizado
2. El sistema valida roles desde el frontend
3. Las reglas validan estructura de datos y roles cuando es posible

## 📝 Notas Importantes

1. **Lectura permisiva**: La mayoría de colecciones permiten lectura a todos porque el filtrado se hace en el cliente según el rol del usuario.

2. **Validación híbrida**: 
   - **Firestore**: Valida estructura de datos y algunos roles
   - **Cliente**: Valida permisos específicos basados en lógica de negocio

3. **Campo `updatedByUid`**: Se permite actualizar junto con otros campos para mantener el rastro de quién modificó el registro.

4. **Eliminación**: La mayoría de eliminaciones están habilitadas con validación en cliente, excepto:
   - Asistencias: Deshabilitadas
   - Calificaciones: Deshabilitadas
   - Retiros: Deshabilitados
   - Anuncios: Solo Admin

## 🔄 Deployment

Para desplegar estas reglas a Firebase:

```bash
firebase deploy --only firestore:rules
```

O desplegar todo:

```bash
firebase deploy
```

## ✅ Checklist de Verificación

- [x] Todas las funciones helper documentadas incluyendo SuperAdmin
- [x] Todos los roles documentados (1-7)
- [x] SuperAdmin agregado con permisos extendidos
- [x] Cada colección tiene comentarios claros
- [x] Matriz de permisos actualizada con SuperAdmin
- [x] `canManageAttendance()` incluye SuperAdmin, Admin, Staff y Docente
- [x] Calificaciones: SuperAdmin y Admin pueden publicar
- [x] Retiros: Familia, SuperAdmin y Admin pueden crear, Seguridad puede validar
- [x] Cursos: Campo `level` actualizable para pase de año
- [x] SuperAdmin puede gestionar otros Admins (crear, editar, suspender, eliminar)


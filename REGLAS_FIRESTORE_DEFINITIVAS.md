# Reglas de Firestore - Documentación Definitiva

## 📋 Resumen de Cambios

Las reglas de seguridad de Firestore han sido actualizadas con comentarios detallados que especifican exactamente qué rol puede hacer qué en cada colección.

## ✅ Validación por Rol

### Funciones Helper Definidas

```javascript
getUserRole(userId)           // Obtiene el rol del usuario
isAdmin(userId)              // Verifica si es Admin (role = 1)
isStaffOnly(userId)          // Verifica si es Staff (role = 2)
canManageAttendance(userId)  // Admin, Staff o Docente (roles 1, 2, 4)
isStudent(userId)            // Verifica si es Estudiante (role = 3)
isTeacher(userId)            // Verifica si es Docente (role = 4)
isFamily(userId)             // Verifica si es Familia (role = 5)
isSecurity(userId)           // Verifica si es Seguridad (role = 6)
```

## 🔐 Permisos por Colección

### 1. USERS (Usuarios)
- **Lectura**: Todos (filtrado en cliente según contexto)
- **Crear**: Solo Admin (validación en cliente)
- **Actualizar**: Solo Admin (validación en cliente)
- **Eliminar**: Solo Admin (validación en cliente)

### 2. ATTENDANCE (Asistencias)
- **Lectura**: Todos (filtrado en cliente)
- **Crear**: Admin (1), Staff (2), Docente (4)
  - Usa: `canManageAttendance()`
- **Actualizar**: Admin (1), Staff (2), Docente (4)
  - Solo campos: status, updatedAt, updatedByUid
  - Usa: `canManageAttendance()`
- **Eliminar**: Deshabilitado

### 3. GRADES (Calificaciones)
- **Lectura**: Todos (filtrado en cliente)
  - Estudiantes y Familias solo ven published=true
- **Crear**: 
  - Admin (1): Siempre
  - Docente (4): Solo si `gradesLoadingEnabled=true`
- **Actualizar**: Solo Admin (1)
  - Solo puede cambiar: published, updatedByUid
  - **Docentes NO pueden publicar boletines**
- **Eliminar**: Deshabilitado

### 4. SUBJECTS (Materias)
- **Lectura**: Todos
- **Crear**: Solo Admin (1) - validación en cliente
- **Actualizar**: Admin (1) y Docente (4) - validación en cliente
- **Eliminar**: Solo Admin (1) - validación en cliente

### 5. COURSES (Cursos)
- **Lectura**: Todos
- **Crear**: Solo Admin (1)
  - Requiere verificación de usuario existente
- **Actualizar**: Solo Admin (1)
  - Puede cambiar: studentUids, preceptorUid, division
- **Eliminar**: Solo Admin (1) - validación en cliente

### 6. ANNOUNCEMENTS (Anuncios)
- **Lectura**: Todos (filtrado por audience en cliente)
- **Crear**: Solo Admin (1) - validación en cliente
- **Actualizar**: Deshabilitado (no se editan)
- **Eliminar**: Solo Admin (1) - validación en cliente

### 7. EARLY_WITHDRAWALS (Retiros Anticipados)
- **Lectura**: Todos (filtrado en cliente)
  - Seguridad ve todos para validar
  - Familia ve solo los de sus hijos
- **Crear**: Admin (1) y Familia (5)
- **Actualizar**: 
  - Admin (1): Todo
  - Seguridad (6): Puede cambiar status (validar)
  - Familia (5): Puede cancelar propios - validación en cliente
- **Eliminar**: Deshabilitado

### 8. SCHEDULES (Horarios)
- **Lectura**: Todos
- **Crear**: Validación en cliente
- **Actualizar**: Validación en cliente
- **Eliminar**: Deshabilitado

### 9. SYSTEM/SETTINGS (Configuración)
- **Lectura**: Todos
- **Crear/Actualizar**: Validación en cliente (solo Admin)

## 🚨 Puntos Críticos

### Asistencias
✅ **CORRECTO**: Admin (1), Staff (2), Docente (4) pueden crear y actualizar
- Usa `canManageAttendance()` que valida roles [1, 2, 4]

### Calificaciones
✅ **CORRECTO**: 
- Admin siempre puede crear
- Docente puede crear solo si `gradesLoadingEnabled=true`
- Solo Admin puede publicar boletines (cambiar `published`)

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

- [x] Todas las funciones helper documentadas
- [x] Todos los roles documentados (1-6)
- [x] Cada colección tiene comentarios claros
- [x] Matriz de permisos está actualizada
- [x] `canManageAttendance()` incluye Admin, Staff y Docente
- [x] Calificaciones: Solo Admin puede publicar
- [x] Retiros: Familia y Admin pueden crear, Seguridad puede validar


# 🚨 Guía de Desarrollo - Reglas Críticas

## ⚠️ POLÍTICA DE SEGURIDAD - FIRESTORE RULES

### 🔒 Regla de Oro

**TODA nueva funcionalidad DEBE adaptarse a las reglas de Firestore existentes.**

Las reglas de `firestore.rules` están completamente definidas y NO deben modificarse excepto en casos extraordinarios. Esto garantiza:
- ✅ Seguridad consistente
- ✅ Sin regresiones de seguridad
- ✅ Mantenibilidad del código
- ✅ Evita vulnerabilidades

### 📖 Documentación de Referencia

Antes de implementar cualquier funcionalidad, consulta:

1. **`ROLES_Y_PERMISOS.md`** - Matriz completa de permisos por rol
2. **`REGLAS_FIRESTORE_DEFINITIVAS.md`** - Guía detallada de las reglas
3. **`firestore.rules`** - Reglas de seguridad (con comentarios inline)

## 🎯 Checklist Pre-Desarrollo

Antes de agregar una nueva funcionalidad:

- [ ] ¿Qué roles deben tener acceso?
- [ ] ¿Qué operación necesito? (Create/Read/Update/Delete)
- [ ] ¿Las reglas actuales lo permiten?
- [ ] Si NO: ¿Es realmente necesario o puedo adaptar la funcionalidad?
- [ ] Si SÍ es necesario: Documentar por qué y solicitar aprobación

## 📋 Permisos Rápidos por Rol

### Asistencias (ATTENDANCE)
```
Crear/Actualizar: Admin (1), Staff (2), Docente (4)
Leer: Todos (filtrado en cliente)
Eliminar: Nadie
```

### Calificaciones (GRADES)
```
Crear: Admin (1) siempre, Docente (4) si gradesLoadingEnabled=true
Actualizar (publicar): Solo Admin (1)
Leer: Todos (estudiantes/familias solo published=true)
Eliminar: Nadie
```

### Usuarios (USERS)
```
Crear/Actualizar/Eliminar: Solo Admin (1)
Leer: Todos (filtrado en cliente)
```

### Cursos/Materias (COURSES/SUBJECTS)
```
Crear/Actualizar/Eliminar: Solo Admin (1)
Leer: Todos
```

### Retiros (EARLY_WITHDRAWALS)
```
Crear: Admin (1), Familia (5)
Actualizar: Admin (1), Seguridad (6) para validar
Leer: Todos (filtrado en cliente)
Eliminar: Nadie
```

## 🛠️ Implementación Correcta

### ✅ CORRECTO - Adaptar al código

```typescript
// Si las reglas permiten Admin, Staff y Docente para asistencias
if (user.role === 1 || user.role === 2 || user.role === 4) {
  // Permitir crear/editar asistencias
}
```

### ❌ INCORRECTO - NO hagas esto

```typescript
// No agregues nuevos roles sin actualizar reglas primero
if (user.role === 1 || user.role === 2 || user.role === 4 || user.role === 5) {
  // ❌ Familia NO puede gestionar asistencias según las reglas
  await createAttendance(); // Esto fallará en Firestore
}
```

## 🔄 Proceso para Casos Extraordinarios

Si REALMENTE necesitas modificar las reglas:

1. **Documentar**: ¿Por qué es necesario el cambio?
2. **Justificar**: ¿No hay otra forma de implementarlo?
3. **Actualizar**:
   - `firestore.rules` con comentarios claros
   - `ROLES_Y_PERMISOS.md` con la nueva matriz
   - `REGLAS_FIRESTORE_DEFINITIVAS.md` con el cambio
4. **Desplegar**: Usar `deploy-rules.bat`
5. **Validar**: Probar en todos los roles afectados

## 🚀 Deployment de Reglas

Cuando se modifiquen las reglas (casos extraordinarios):

```bash
# Windows
.\deploy-rules.bat

# O manualmente (si tienes permisos)
firebase deploy --only firestore:rules
```

## 📝 Recordatorios

- Las validaciones de permisos se hacen **en el cliente** (frontend)
- Firestore valida **estructura de datos** y **algunos roles**
- El campo `createdByUid` / `updatedByUid` rastrea quién hizo la operación
- El campo `uid` siempre debe coincidir con el documentId

## ⚡ Funciones Helper Disponibles

En `firestore.rules`:
```javascript
isAdmin(userId)              // role === 1
isStaffOnly(userId)          // role === 2
isTeacher(userId)            // role === 4
isStudent(userId)            // role === 3
isFamily(userId)             // role === 5
isSecurity(userId)           // role === 6
canManageAttendance(userId)  // roles 1, 2, 4
canCreateGrade(userId)       // Admin o Docente con flag
```

---

**Última actualización**: Noviembre 2025
**Responsable**: Equipo de Desarrollo
**Versión de Reglas**: 2.0 (Definitiva)


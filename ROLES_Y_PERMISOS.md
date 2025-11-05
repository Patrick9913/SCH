# Roles y Permisos del Sistema

## Roles Definidos

### 1. Administrador (role = 1)
**Permisos:**
- ✅ Crear, editar, suspender, eliminar usuarios
- ✅ Gestionar asistencias (todas)
- ✅ Gestionar calificaciones (todas)
- ✅ Publicar boletines
- ✅ Crear y gestionar cursos
- ✅ Crear y gestionar materias
- ✅ Crear y gestionar horarios
- ✅ Crear avisos/anuncios
- ✅ Control total del sistema

### 2. Staff/Preceptor (role = 2)
**Permisos:**
- ✅ Gestionar asistencias de sus cursos asignados
- ✅ Ver estudiantes
- ❌ NO gestiona calificaciones
- ❌ NO crea materias
- ❌ NO gestiona usuarios

### 3. Estudiante (role = 3)
**Permisos:**
- ✅ Ver sus propias asistencias
- ✅ Ver sus propias calificaciones (si están publicadas)
- ✅ Ver sus boletines
- ✅ Ver sus materias
- ❌ Solo lectura, NO puede modificar nada

### 4. Docente (role = 4)
**Permisos:**
- ✅ Gestionar asistencias
- ✅ Gestionar calificaciones (cuando gradesLoadingEnabled = true)
- ✅ Ver sus materias asignadas
- ✅ Ver estudiantes de sus materias
- ❌ NO crea usuarios
- ❌ NO crea cursos
- ❌ NO publica boletines (solo Admin)

### 5. Familia (role = 5)
**Permisos:**
- ✅ Ver asistencias de sus hijos
- ✅ Ver calificaciones de sus hijos (publicadas)
- ✅ Ver boletines de sus hijos
- ✅ Crear solicitudes de retiro anticipado
- ❌ Solo lectura de datos de hijos, NO modifica

### 6. Seguridad (role = 6)
**Permisos:**
- ✅ Validar retiros anticipados (cambiar estado a validated/completed/cancelled)
- ✅ Ver historial de retiros
- ❌ NO accede a otros módulos del sistema

### 7. Super Administrador (role = 7)
**Permisos:**
- ✅ **Control absoluto sobre TODA la aplicación**
- ✅ Todos los permisos del Administrador regular
- ✅ **Crear, editar, suspender y eliminar otros Administradores**
- ✅ **Realizar el pase de año de todos los estudiantes**
- ✅ Gestionar usuarios de cualquier rol
- ✅ Control total sobre asistencias, calificaciones, cursos, materias
- ✅ Publicar boletines
- ✅ Crear avisos/anuncios
- ⚡ **Único rol con capacidad de gestión de Administradores y pase de año**

---

## Matriz de Permisos por Colección

| Colección | SuperAdmin | Admin | Staff | Estudiante | Docente | Familia | Seguridad |
|-----------|------------|-------|-------|------------|---------|---------|-----------|
| users | CRUD+ | CRUD | R | R (propio) | R | R (hijos) | R (propio) |
| attendance | CRUD | CRUD | CRU | R (propio) | CRU | R (hijos) | - |
| grades | CRU | CRU | R | R (propio+pub) | CRU* | R (hijos+pub) | - |
| subjects | CRUD | CRUD | R | R | RU | R | - |
| courses | CRUD | CRUD | R | R | R | R | - |
| schedules | CRUD | CRUD | R | R | R | R | - |
| announcements | CRD | CRD | R | R | R | R | - |
| early_withdrawals | CRUD | R | R | R | R | CR | RU |
| year_transition | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Leyenda:**
- C = Create (Crear)
- R = Read (Leer)
- U = Update (Actualizar)
- D = Delete (Eliminar)
- * = Con condiciones (ej: gradesLoadingEnabled)
- CRUD+ = Permisos extendidos (puede gestionar también a otros admins)
- ✅ = Acceso exclusivo
- ❌ = Sin acceso

**Notas importantes:**
- **SuperAdmin (role 7)** es el único rol que puede gestionar otros Administradores
- **SuperAdmin** es el único que puede ejecutar el pase de año
- **Admin (role 1)** NO puede editar, suspender o eliminar a un SuperAdmin
- El pase de año es una operación crítica exclusiva del SuperAdmin


# Guía para Insertar Usuarios de Prueba en Firebase

## 📋 Resumen de Usuarios a Crear
- **10 Docentes** con asignaturas específicas
- **20 Estudiantes** distribuidos en los 5 cursos
- **5 Staff** (personal administrativo)

## 🔑 Contraseña para Todos los Usuarios
```
Test1234
```

## 📝 Datos de los Usuarios

### 👨‍🏫 Docentes (10)

| Nombre | Email | DNI | Asignatura |
|--------|-------|-----|------------|
| Prof. María García | maria.garcia@escuela.com | 30123456 | Matemática (1) |
| Prof. Juan Pérez | juan.perez@escuela.com | 30123457 | Lengua (2) |
| Prof. Ana López | ana.lopez@escuela.com | 30123458 | Historia (3) |
| Prof. Carlos Rodríguez | carlos.rodriguez@escuela.com | 30123459 | Geografía (4) |
| Prof. Laura Martínez | laura.martinez@escuela.com | 30123460 | Biología (5) |
| Prof. Roberto Fernández | roberto.fernandez@escuela.com | 30123461 | Física (6) |
| Prof. Carmen Sánchez | carmen.sanchez@escuela.com | 30123462 | Química (7) |
| Prof. Diego Morales | diego.morales@escuela.com | 30123463 | Inglés (8) |
| Prof. Gabriela Torres | gabriela.torres@escuela.com | 30123464 | Educación Física (9) |
| Prof. Pablo Romero | pablo.romero@escuela.com | 30123465 | Arte (10) |

### 📚 Estudiantes (20)

| Nombre | Email | DNI | Curso |
|--------|-------|-----|------|
| Estudiante 1 | estudiante1@escuela.com | 41123456 | 1° |
| Estudiante 2 | estudiante2@escuela.com | 41123457 | 1° |
| Estudiante 3 | estudiante3@escuela.com | 41123458 | 1° |
| Estudiante 4 | estudiante4@escuela.com | 41123459 | 1° |
| Estudiante 5 | estudiante5@escuela.com | 41123460 | 2° |
| Estudiante 6 | estudiante6@escuela.com | 41123461 | 2° |
| Estudiante 7 | estudiante7@escuela.com | 41123462 | 2° |
| Estudiante 8 | estudiante8@escuela.com | 41123463 | 2° |
| Estudiante 9 | estudiante9@escuela.com | 41123464 | 3° |
| Estudiante 10 | estudiante10@escuela.com | 41123465 | 3° |
| Estudiante 11 | estudiante11@escuela.com | 41123466 | 3° |
| Estudiante 12 | estudiante12@escuela.com | 41123467 | 3° |
| Estudiante 13 | estudiante13@escuela.com | 41123468 | 4° |
| Estudiante 14 | estudiante14@escuela.com | 41123469 | 4° |
| Estudiante 15 | estudiante15@escuela.com | 41123470 | 4° |
| Estudiante 16 | estudiante16@escuela.com | 41123471 | 4° |
| Estudiante 17 | estudiante17@escuela.com | 41123472 | 5° |
| Estudiante 18 | estudiante18@escuela.com | 41123473 | 5° |
| Estudiante 19 | estudiante19@escuela.com | 41123474 | 5° |
| Estudiante 20 | estudiante20@escuela.com | 41123475 | 5° |

### 👥 Staff (5)

| Nombre | Email | DNI |
|--------|-------|-----|
| Staff María González | staff1@escuela.com | 50123456 |
| Staff Juan Morales | staff2@escuela.com | 50123457 |
| Staff Laura Fernández | staff3@escuela.com | 50123458 |
| Staff Carlos Silva | staff4@escuela.com | 50123459 |
| Staff Patricia López | staff5@escuela.com | 50123460 |

## 🚀 Método Recomendado: Usar la Interfaz de Administración

La forma más sencilla es usar la interfaz de administración de la aplicación:

1. Inicia sesión como administrador
2. Ve a la sección "Personal"
3. Agrega cada usuario manualmente usando el formulario

### Para Docentes:
- Nombre: (nombre del docente)
- Email: (email del docente)
- DNI: (dni del docente)
- Rol: Docente (4)
- Contraseña: Test1234
- Asignatura: (seleccionar la asignatura correspondiente)

### Para Estudiantes:
- Nombre: (nombre del estudiante)
- Email: (email del estudiante)
- DNI: (dni del estudiante)
- Rol: Estudiante (3)
- Contraseña: Test1234
- Curso: (seleccionar el curso correspondiente: 1°, 2°, 3°, 4° o 5°)

### Para Staff:
- Nombre: (nombre del staff)
- Email: (email del staff)
- DNI: (dni del staff)
- Rol: Staff (2)
- Contraseña: Test1234

## 📊 Enumeraciones de Referencia

### Roles (UserRole)
- Administrador: 1
- Staff: 2
- Estudiante: 3
- Docente: 4
- Familia: 5

### Asignaturas (Assignments)
- Matemática: 1
- Lengua: 2
- Historia: 3
- Geografía: 4
- Biología: 5
- Física: 6
- Química: 7
- Inglés: 8
- Educación Física: 9
- Arte: 10
- Tecnología: 11

### Cursos (UserCurses)
- 1°: 1
- 2°: 2
- 3°: 3
- 4°: 4
- 5°: 5


# Sistema de Calificaciones

## Descripción

Sistema de gestión de calificaciones por curso, materia y período. Permite a profesores y administradores registrar calificaciones de todos los estudiantes de un curso de una vez, mientras que los estudiantes pueden consultar sus calificaciones organizadas por materia y período.

## Características Principales

### 🎯 Funcionalidades Implementadas

1. **Registro Masivo de Calificaciones**
   - Flujo simplificado: Curso → Materia → Período → Estudiantes
   - Registro masivo para todos los estudiantes del curso seleccionado
   - Sistema de calificaciones con 4 niveles: EP, L, AL, S

2. **Sistema de Calificaciones por Categorías**
   - **EP** - En Proceso
   - **L** - Logrado
   - **AL** - Altamente Logrado
   - **S** - Superado

3. **Períodos Académicos**
   - Primer Cuatrimestre
   - Segundo Cuatrimestre
   - Tercer Cuatrimestre

4. **Visualización para Estudiantes**
   - Calificaciones organizadas por materia
   - Vista por período cuatrimestral
   - Código de colores por nivel de logro
   - Interfaz intuitiva y fácil de entender

5. **Guardado en Lote**
   - Al finalizar, se guardan todas las calificaciones de una vez
   - Carga automática de calificaciones existentes
   - Confirmación visual de calificaciones asignadas

## Estructura de Archivos

### Archivos Creados

```
src/app/
├── types/
│   └── grade.ts                    # Tipos de datos para calificaciones
├── context/
│   └── gradesContext.tsx           # Contexto para gestión de calificaciones
└── components/fccomponents/
    └── Grades.tsx                  # Componente principal de calificaciones
```

### Archivos Modificados

```
src/app/
├── layout.tsx                      # Agregado GradesProvider
├── components/main/
│   ├── Main.tsx                   # Agregado menu == 6 para Grades
│   └── Navbar.tsx                 # Agregado opción de Calificaciones
```

## Estructura de Base de Datos

### Colección `grades`

```javascript
{
  id: "grade_id",
  studentUid: "uid_del_estudiante",
  subjectId: 1,  // Reference to Assignments enum
  courseLevel: 1,  // Reference to UserCurses enum (1°, 2°, 3°, 4°, 5°)
  period: "primer_cuatrimestre",  // 'primer_cuatrimestre' | 'segundo_cuatrimestre' | 'tercer_cuatrimestre'
  grade: "AL",  // 'EP' | 'L' | 'AL' | 'S'
  createdByUid: "uid_del_profesor",
  createdAt: timestamp
}
```

## Tipos de Calificación

El sistema utiliza 4 categorías de logro:

1. **EP - En Proceso**: El estudiante está en proceso de aprendizaje
2. **L - Logrado**: El estudiante ha logrado los objetivos
3. **AL - Altamente Logrado**: El estudiante ha superado los objetivos
4. **S - Superado**: El estudiante ha alcanzado un nivel excepcional

## Períodos Académicos

1. **Primer Cuatrimestre**
2. **Segundo Cuatrimestre**
3. **Tercer Cuatrimestre**

## Uso del Sistema

### Para Profesores y Administradores

1. **Registrar Calificaciones - Flujo Paso a Paso**
   
   **Paso 1: Seleccionar el Curso**
   - Abre "Calificaciones" en el menú lateral
   - Selecciona el curso (1°, 2°, 3°, 4°, 5°)
   
   **Paso 2: Seleccionar la Materia**
   - Selecciona la materia del menú desplegable
   - Ejemplos: Matemática, Lengua, Historia, etc.
   
   **Paso 3: Seleccionar el Período**
   - Selecciona el período: Primer, Segundo o Tercer Cuatrimestre
   
   **Paso 4: Asignar Calificaciones**
   - Aparecerá una lista con todos los estudiantes del curso
   - Para cada estudiante, selecciona una calificación:
     - **EP** - En Proceso (botón naranja)
     - **L** - Logrado (botón amarillo)
     - **AL** - Altamente Logrado (botón azul)
     - **S** - Superado (botón verde)
   - La calificación seleccionada se resaltará en color
   
   **Paso 5: Guardar**
   - Haz clic en "Guardar Calificaciones"
   - Todas las calificaciones se guardarán de una vez
   - Aparecerá un mensaje de confirmación

2. **Calificaciones Existentes**
   - Si ya existen calificaciones para el curso/materia/período seleccionado
   - Se cargarán automáticamente al seleccionar el período
   - Podrás modificarlas y guardar los cambios

### Para Estudiantes

1. **Ver Calificaciones por Materia**
   - Al abrir "Calificaciones" verás tus calificaciones organizadas por materia
   - Cada materia muestra:
     - Calificaciones por período (Primer, Segundo, Tercer Cuatrimestre)
     - Código de colores por nivel de logro:
       - 🟢 **S** (Verde) - Superado
       - 🔵 **AL** (Azul) - Altamente Logrado
       - 🟡 **L** (Amarillo) - Logrado
       - 🟠 **EP** (Naranja) - En Proceso
     - Descripción del nivel (En Proceso, Logrado, etc.)

2. **Navegación**
   - Las calificaciones se muestran en cards por materia
   - Cada período tiene su propio recuadro
   - Si no hay calificaciones en un período, se muestra "Sin calificaciones"

## Configuración de Firebase

### Reglas de Seguridad

Necesitas agregar reglas en Firestore para la colección `grades`:

```javascript
match /grades/{gradeId} {
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.createdByUid ||
    request.auth.uid == resource.data.studentUid ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in [1, 4]
  );
  allow create: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in [1, 4];
  allow update, delete: if request.auth != null && (
    request.auth.uid == resource.data.createdByUid ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 1
  );
}
```

### Despliegue de Reglas

```bash
firebase deploy --only firestore:rules
```

## Características Técnicas

### Tiempo Real
- Utiliza `onSnapshot` de Firestore para actualizaciones en tiempo real
- Las calificaciones se actualizan automáticamente sin refrescar la página
- Sincronización automática entre dispositivos

### Gestión de Estado
- Context API para estado global de calificaciones
- Función `calculateAverage` para promedios dinámicos
- Memoización con `useMemo` para optimización de rendimiento

### Cálculo de Promedios
- Los promedios se calculan en tiempo real
- Sistema flexible que soporta diferentes escalas de calificación
- Conversión automática a porcentaje para comparación

## Integración con Asignaturas

El sistema está integrado con el enum `Assignments` existente:

- Matemática
- Lengua
- Historia
- Geografía
- Biología
- Física
- Química
- Inglés
- Educación Física
- Arte
- Tecnología

Al registrar una calificación, simplemente selecciona la materia del menú desplegable.

## Permisos y Roles

### Administrador (role === 1)
- Ver todas las calificaciones
- Registrar calificaciones
- Editar calificaciones (en Firestore rules)
- Acceder a estadísticas administrativas

### Profesor (role === 4)
- Registrar calificaciones
- Ver calificaciones de sus estudiantes
- Editar sus propias calificaciones (en Firestore rules)

### Estudiante (role === 3)
- Ver solo sus propias calificaciones
- Ver estadísticas personales
- Consultar promedios por materia

## Próximas Mejoras Sugeridas

1. **Reportes**
   - Exportar calificaciones a PDF/Excel
   - Boletas de calificaciones
   - Gráficos de rendimiento

2. **Notificaciones**
   - Alertas cuando se publica nueva calificación
   - Notificaciones de promedio bajo

3. **Funcionalidades Avanzadas**
   - Pesos por tipo de evaluación
   - Cálculo de ponderados
   - Histórico por trimestre/semestre
   - Comparación de rendimiento

4. **Filtros y Búsqueda**
   - Filtrar por materia
   - Filtrar por tipo de evaluación
   - Buscar estudiante específico

5. **Peticiones de Revisión**
   - Los estudiantes pueden solicitar revisión de calificaciones
   - Comentarios en calificaciones

## Solución de Problemas

### Problemas Comunes

1. **Las calificaciones no aparecen**
   - Verificar conexión a Firebase
   - Revisar reglas de seguridad
   - Comprobar autenticación del usuario

2. **No puedo registrar calificaciones**
   - Verificar que el usuario sea profesor o administrador
   - Comprobar permisos en Firestore rules
   - Revisar logs de la consola

3. **Los promedios no se calculan correctamente**
   - Verificar que las calificaciones tengan `maxGrade` correcto
   - Revisar la lógica de cálculo en `gradesContext.tsx`

## Logs de Debug

El sistema incluye logs en la consola para facilitar el debugging:
- Registro de calificaciones
- Cálculo de promedios
- Actualizaciones de estado
- Errores de Firebase

## Integración con el Sistema Existente

El sistema de calificaciones se integra perfectamente con:
- ✅ Sistema de usuarios y roles
- ✅ Sistema de asignaturas (Assignments enum)
- ✅ Context providers existentes
- ✅ Navegación y rutas
- ✅ Firestore y autenticación

## Ejemplo de Uso

### Como Profesor

```typescript
import { useGrades } from '@/app/context/gradesContext';
import { GradeValue, Period } from '@/app/types/grade';

const MyComponent = () => {
  const { addMultipleGrades, getGradeForStudent } = useGrades();
  
  // Registrar calificaciones para un curso completo
  const handleSaveGrades = async () => {
    const gradesToSave = [
      {
        studentUid: 'student1_uid',
        subjectId: 1, // Matemática
        courseLevel: 1, // 1°
        period: 'primer_cuatrimestre' as Period,
        grade: 'AL' as GradeValue
      },
      {
        studentUid: 'student2_uid',
        subjectId: 1, // Matemática
        courseLevel: 1, // 1°
        period: 'primer_cuatrimestre' as Period,
        grade: 'S' as GradeValue
      },
      // ... más estudiantes
    ];
    
    await addMultipleGrades(gradesToSave);
  };
  
  // Consultar calificación existente
  const existingGrade = getGradeForStudent(
    'student_uid',
    1, // Matemática
    1, // 1°
    'primer_cuatrimestre'
  );
  
  console.log('Calificación:', existingGrade?.grade); // 'AL', 'S', 'L', o 'EP'
};
```

## Notas Finales

El sistema de calificaciones está completamente funcional y listo para usar. Está diseñado para ser:
- Fácil de usar para profesores
- Informativo para estudiantes
- Escalable para futuras mejoras
- Seguro y robusto con Firestore


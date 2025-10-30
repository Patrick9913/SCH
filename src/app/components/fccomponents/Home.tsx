import { useAuthContext } from "@/app/context/authContext";
import { useTriskaContext } from "@/app/context/triskaContext";
import { useAnnouncements } from "@/app/context/announcementsContext";
import { useSchedule } from "@/app/context/scheduleContext";
import { useSubjects } from "@/app/context/subjectContext";
import { Assignments, UserCurses} from "@/app/types/user";
import { DayLabels, DayLabelsShort } from "@/app/types/schedule";
import { HiHome, HiClock, HiUser, HiBookOpen } from "react-icons/hi";

import React, { useMemo, useCallback } from "react";

export const Home: React.FC = () => {

    const { user} = useAuthContext()
    const { users, setMenu } = useTriskaContext()
    const { announcements, createAnnouncement, deleteAnnouncement } = useAnnouncements()
    const { schedules, getSchedulesByCourse } = useSchedule()
    const { getSubjectsByStudent, getSubjectsByTeacher, subjects } = useSubjects()

    const students = users.filter( s => s.role === 3)
    const teachers = users.filter( t => t.role === 4)

    // Filtrar avisos por audiencia
    const filteredAnnouncements = React.useMemo(() => {
        if (!user) return [];
        
        return announcements.filter(a => {
            // Si el aviso es para todos, todos lo ven
            if (a.audience === 'all') return true;
            
            // Si el usuario es admin, ve todos los avisos
            if (user.role === 1) return true;
            
            // Filtrar según el rol del usuario
            switch (a.audience) {
                case 'students':
                    return user.role === 3; // Estudiante
                case 'teachers':
                    return user.role === 4; // Docente
                case 'staff':
                    return user.role === 2; // Staff
                case 'families':
                    return user.role === 5; // Familia
                default:
                    return true;
            }
        });
    }, [announcements, user]);

    // Obtener nombre de la materia
    const getSubjectName = (subjectId: number) => {
        const assignmentKey = Object.keys(Assignments).find(
            key => Assignments[key as keyof typeof Assignments] === subjectId
        ) as keyof typeof Assignments | undefined;
        return assignmentKey || 'Sin materia';
    };

    // Obtener nombre del curso
    const getCourseName = (courseLevel: number) => {
        const courseKey = Object.keys(UserCurses).find(
            key => UserCurses[key as keyof typeof UserCurses] === courseLevel
        ) as keyof typeof UserCurses | undefined;
        return courseKey || 'Sin curso';
    };

    // Obtener materias asignadas al estudiante
    const studentSubjects = useMemo(() => {
        if (!user || user.role !== 3 || !user.uid) return [];
        return getSubjectsByStudent(user.uid);
    }, [user, getSubjectsByStudent]);

    // Crear un mapa de subjectId para verificación rápida
    const studentSubjectIds = useMemo(() => {
        return new Set(studentSubjects.map(s => s.subjectId));
    }, [studentSubjects]);

    // Para estudiantes: obtener solo los profesores asignados a sus materias
    const availableTeachers = useMemo(() => {
        if (!user || user.role !== 3) {
            // Si no es estudiante, devolver todos los usuarios (para admins, etc.)
            return users;
        }
        
        // Extraer todos los teacherUids de las materias asignadas al estudiante
        const teacherUids = new Set<string>();
        studentSubjects.forEach(subject => {
            if (subject.teacherUid) {
                teacherUids.add(subject.teacherUid);
            }
        });
        
        // Filtrar usuarios para incluir solo:
        // 1. El mismo estudiante (su propio perfil)
        // 2. Los profesores asignados a sus materias
        return users.filter(u => 
            u.uid === user.uid || // Su propio perfil
            (teacherUids.has(u.uid) && u.role === 4) // Profesores asignados
        );
    }, [user, users, studentSubjects]);

    // Generar bloques de tiempo (7:45 a 16:30 en bloques de 40 minutos)
    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        slots.push('07:45');
        
        let currentHour = 7;
        let currentMinute = 45;
        
        while (true) {
            currentMinute += 40;
            if (currentMinute >= 60) {
                currentMinute -= 60;
                currentHour += 1;
            }
            
            const hourStr = currentHour.toString().padStart(2, '0');
            const minuteStr = currentMinute.toString().padStart(2, '0');
            const timeStr = `${hourStr}:${minuteStr}`;
            
            if (currentHour > 16 || (currentHour === 16 && currentMinute > 30)) {
                break;
            }
            
            slots.push(timeStr);
        }
        
        return slots;
    }, []);

    // Horarios semanal para estudiantes - usando plannedSchedules de las materias asignadas
    const studentWeeklySchedule = useMemo(() => {
        if (!user || user.role !== 3 || !user.uid) return null;
        
        // Crear array de horarios desde las materias asignadas
        const allSchedules: Array<{
            id: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            classroom: string;
            subjectId: number;
            subjectName: string;
            teacherUid: string;
        }> = [];
        
        // Iterar sobre todas las materias asignadas al estudiante
        studentSubjects.forEach(subject => {
            // Usar los plannedSchedules de la materia
            if (subject.plannedSchedules && subject.plannedSchedules.length > 0) {
                subject.plannedSchedules.forEach((planned, index) => {
                    allSchedules.push({
                        id: `${subject.id}-${index}`, // ID único para el horario
                        dayOfWeek: planned.dayOfWeek,
                        startTime: planned.startTime,
                        endTime: planned.endTime,
                        classroom: planned.classroom || '',
                        subjectId: subject.subjectId,
                        subjectName: subject.name,
                        teacherUid: subject.teacherUid
                    });
                });
            }
        });
        
        // Organizar por día
        const scheduleByDay: Record<number, typeof allSchedules> = {};
        allSchedules.forEach(schedule => {
            if (!scheduleByDay[schedule.dayOfWeek]) {
                scheduleByDay[schedule.dayOfWeek] = [];
            }
            scheduleByDay[schedule.dayOfWeek].push(schedule);
        });
        
        // Ordenar cada día por hora de inicio
        Object.keys(scheduleByDay).forEach(day => {
            scheduleByDay[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
        
        return scheduleByDay;
    }, [user, user?.uid, studentSubjects]);

    // Función auxiliar para convertir tiempo a minutos
    const timeToMinutes = useCallback((time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }, []);

    // Función auxiliar para convertir bloque de tiempo a minutos
    const timeSlotToMinutes = useCallback((timeSlot: string): number => {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        return hours * 60 + minutes;
    }, []);

    // Función para obtener todas las materias que ocupan un bloque de tiempo
    const getOccupiedSchedules = useCallback((day: number, timeSlot: string): Array<{
        schedule: { id: string; dayOfWeek: number; startTime: string; endTime: string; classroom: string; subjectId: number; subjectName: string; teacherUid: string; };
        color: string;
    }> => {
        if (!studentWeeklySchedule || !studentWeeklySchedule[day]) return [];
        
        const slotMinutes = timeSlotToMinutes(timeSlot);
        const slotEndMinutes = slotMinutes + 40; // Fin del bloque de 40 minutos
        
        const occupied: Array<{
            schedule: { id: string; dayOfWeek: number; startTime: string; endTime: string; classroom: string; subjectId: number; subjectName: string; teacherUid: string; };
            color: string;
        }> = [];
        
        for (const schedule of studentWeeklySchedule[day]) {
            const startMinutes = timeToMinutes(schedule.startTime);
            const endMinutes = timeToMinutes(schedule.endTime);
            
            // El bloque está ocupado si hay intersección entre el slot y el horario
            // Incluye el bloque final: si el horario termina exactamente en el inicio del bloque, también se marca
            // El horario empieza antes de que termine el bloque Y termina después o justo cuando empieza el bloque
            if (startMinutes < slotEndMinutes && endMinutes >= slotMinutes) {
                // Usar azul como color principal
                occupied.push({ 
                    schedule, 
                    color: 'bg-blue-500' 
                });
            }
        }
        
        return occupied;
    }, [studentWeeklySchedule, timeSlotToMinutes, timeToMinutes]);

    // Función para calcular grupos de horarios por día
    const scheduleGroups = useMemo(() => {
        const groupsByDay: Record<number, Array<{ 
            schedule: { id: string; dayOfWeek: number; startTime: string; endTime: string; classroom: string; subjectId: number; subjectName: string; teacherUid: string; }; 
            startSlot: number; 
            endSlot: number;
        }>> = {};
        
        if (!studentWeeklySchedule) return groupsByDay;
        
        [0, 1, 2, 3, 4].forEach(day => {
            const daySchedules = studentWeeklySchedule[day] || [];
            const groups: Array<{ 
                schedule: typeof daySchedules[0]; 
                startSlot: number; 
                endSlot: number;
            }> = [];
            
            daySchedules.forEach(schedule => {
                const startMinutes = timeToMinutes(schedule.startTime);
                const endMinutes = timeToMinutes(schedule.endTime);
                
                // Encontrar los slots que ocupa este horario
                let startSlotIndex = -1;
                let endSlotIndex = -1;
                
                timeSlots.forEach((slot, idx) => {
                    const slotMinutes = timeSlotToMinutes(slot);
                    const slotEndMinutes = slotMinutes + 40;
                    
                    // El slot está ocupado si el horario cruza con el bloque
                    // Incluir el bloque final: endMinutes >= slotMinutes para incluir cuando termina exactamente en el inicio del bloque
                    if (startMinutes < slotEndMinutes && endMinutes >= slotMinutes) {
                        if (startSlotIndex === -1) startSlotIndex = idx;
                        endSlotIndex = idx;
                    }
                });
                
                if (startSlotIndex !== -1 && endSlotIndex !== -1) {
                    groups.push({
                        schedule,
                        startSlot: startSlotIndex,
                        endSlot: endSlotIndex
                    });
                }
            });
            
            groupsByDay[day] = groups;
        });
        
        return groupsByDay;
    }, [studentWeeklySchedule, timeSlots, timeToMinutes, timeSlotToMinutes]);

    return (
            <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <HiHome className="w-6 h-6 text-gray-700" />
                        <h1 className="text-2xl font-semibold text-gray-900">Campus Virtual</h1>
                    </div>
                    <p className="text-sm text-gray-500">
                        Panel principal del sistema de gestión escolar.
                    </p>
                </div>
                {/* Avisos dinámicos */}
                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Avisos</h2>
                    {user?.role === 1 && (
                        <form
                            className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.currentTarget as HTMLFormElement & {
                                    title: { value: string };
                                    body: { value: string };
                                    audience: { value: any };
                                };
                                const title = form.title.value;
                                const body = form.body.value;
                                const audience = form.audience.value as any;
                                if (!title.trim()) return;
                                await createAnnouncement({ title, body, audience });
                                form.title.value = '';
                                form.body.value = '';
                                form.audience.value = 'all';
                            }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                <input 
                                    name="title" 
                                    placeholder="Título" 
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                />
                                <input 
                                    name="body" 
                                    placeholder="Descripción" 
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-2" 
                                />
                                <select 
                                    name="audience" 
                                    defaultValue="all" 
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    <option value="all">Todos</option>
                                    <option value="students">Estudiantes</option>
                                    <option value="teachers">Docentes</option>
                                    <option value="staff">Staff</option>
                                    <option value="families">Familias</option>
                                </select>
                            </div>
                            <button 
                                type="submit" 
                                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Publicar
                            </button>
                        </form>
                    )}
                    <div className="space-y-2">
                        {filteredAnnouncements.map((a) => (
                            <div key={a.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900 mb-1">{a.title}</h3>
                                        {a.body && <p className="text-sm text-gray-600 mb-2">{a.body}</p>}
                                        <p className="text-xs text-gray-400">Para: {a.audience} • {new Date(a.createdAt).toLocaleString()}</p>
                                    </div>
                                    {user?.role === 1 && (
                                        <button
                                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                                            onClick={() => deleteAnnouncement(a.id)}
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {filteredAnnouncements.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                Sin avisos por ahora
                            </div>
                        )}
                    </div>
                </div>
                {/* Resumen rápido */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {
                        user?.role == 1 && (
                            <>
                                <button onClick={() => setMenu(3)} className="text-left p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Alumnos</h3>
                                    <p className="text-3xl font-semibold text-gray-900 mb-1">{students.length}</p>
                                    <p className="text-xs text-gray-500">Ir a gestión de personal</p>
                                </button>
                                <button onClick={() => setMenu(3)} className="text-left p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Profesores</h3>
                                    <p className="text-3xl font-semibold text-gray-900 mb-1">{teachers.length}</p>
                                    <p className="text-xs text-gray-500">Ir a gestión de personal</p>
                                </button>
                                <button onClick={() => setMenu(2)} className="text-left p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Materias</h3>
                                    <p className="text-3xl font-semibold text-gray-900 mb-1">{subjects.length}</p>
                                    <p className="text-xs text-gray-500">Ir a gestión de materias</p>
                                </button>
                            </>
                        )
                    }
                </div>
                {/* Vista docente: materias y horarios asignados */}
                {user?.role === 4 && user?.uid && (
                    <div className="mb-8">
                        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <HiBookOpen className="w-5 h-5 text-gray-700" />
                            Mis Materias y Horarios
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {getSubjectsByTeacher(user.uid).map((subj) => (
                                <div key={subj.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{subj.name}</h3>
                                            <p className="text-sm text-gray-500">{getCourseName(subj.courseLevel)}</p>
                                        </div>
                                    </div>
                                    {subj.plannedSchedules && subj.plannedSchedules.length > 0 ? (
                                        <div className="space-y-2">
                                            {subj.plannedSchedules.map((ps, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm">
                                                    <span className="font-medium text-gray-700">{DayLabels[ps.dayOfWeek as keyof typeof DayLabels]}</span>
                                                    <span className="text-gray-700">{ps.startTime} - {ps.endTime}</span>
                                                    {ps.classroom && <span className="text-gray-500">Aula: {ps.classroom}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400">Sin horarios planificados</div>
                                    )}
                                </div>
                            ))}
                            {getSubjectsByTeacher(user.uid).length === 0 && (
                                <div className="col-span-full text-sm text-gray-500">No tienes materias asignadas</div>
                            )}
                        </div>
                    </div>
                )}
                {/* Horarios semanal para estudiantes - Vista tipo cuadrícula */}
                {user?.role === 3 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <HiClock className="w-5 h-5 text-gray-700" />
                            Mi Horario Semanal
                        </h2>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                            <div className="min-w-full">
                                {/* Encabezado con horas */}
                                <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                                    <div className="w-24 flex-shrink-0 p-2 text-xs font-medium text-gray-700 border-r border-gray-200"></div>
                                    {timeSlots.map((time, idx) => (
                                        <div 
                                            key={`head-${time}`} 
                                            className={`flex-1 min-w-[80px] p-2 text-center text-xs font-medium text-gray-700 border-r border-gray-200 last:border-r-0 ${
                                                idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                            }`}
                                        >
                                            {time}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Filas para cada día */}
                                {[0, 1, 2, 3, 4].map((day) => {
                                    const daySchedules = studentWeeklySchedule?.[day] || [];
                                    const dayScheduleGroups = scheduleGroups[day] || [];
                                    
                                    // Altura fija para cada bloque azul
                                    const BLOCK_HEIGHT = 60; // Altura fija en píxeles
                                    
                                    return (
                                        <div key={day} className="flex border-b border-gray-200 last:border-b-0">
                                            <div className="w-24 flex-shrink-0 p-3 text-sm font-medium text-gray-900 border-r border-gray-200 bg-gray-50">
                                                {DayLabelsShort[day as keyof typeof DayLabelsShort]}
                                            </div>
                                            <div className="flex-1 relative">
                                                {daySchedules.length === 0 ? (
                                                    /* Mensaje si no hay clases */
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-gray-400 text-xs">Sin clases</span>
                                                    </div>
                                                ) : (() => {
                                                        // Primero calcular cuántas filas hay para saber la altura total
                                                        const sortedGroups = [...dayScheduleGroups].sort((a, b) => a.startSlot - b.startSlot);
                                                        const tempRows: Array<Array<[number, number]>> = [];
                                                        const tempGroupRowMap = new Map<string, number>();
                                                        
                                                        sortedGroups.forEach(group => {
                                                            let assignedRow = -1;
                                                            for (let rowIndex = 0; rowIndex < tempRows.length; rowIndex++) {
                                                                const rowRanges = tempRows[rowIndex];
                                                                const canFit = rowRanges.every(([start, end]) => {
                                                                    return group.endSlot < start || group.startSlot > end;
                                                                });
                                                                if (canFit) {
                                                                    assignedRow = rowIndex;
                                                                    break;
                                                                }
                                                            }
                                                            if (assignedRow === -1) {
                                                                assignedRow = tempRows.length;
                                                                tempRows.push([]);
                                                            }
                                                            tempGroupRowMap.set(group.schedule.id, assignedRow);
                                                            tempRows[assignedRow].push([group.startSlot, group.endSlot]);
                                                            tempRows[assignedRow].sort((a, b) => a[0] - b[0]);
                                                        });
                                                        
                                                        const calculatedRowHeight = tempRows.length * BLOCK_HEIGHT + (tempRows.length > 1 ? (tempRows.length - 1) * 4 : 0);
                                                        
                                                        return (
                                                            <div className="flex relative" style={{ height: `${calculatedRowHeight}px`, minHeight: `${BLOCK_HEIGHT}px` }}>
                                                                {/* Slots de tiempo como fondo/referencia */}
                                                                {timeSlots.map((timeSlot, slotIndex) => (
                                                                    <div
                                                                        key={`bg-${day}-${slotIndex}`}
                                                                        className="flex-1 min-w-[80px] border-r border-gray-200 last:border-r-0 bg-white hover:bg-gray-50 transition-colors"
                                                                        style={{ height: `${calculatedRowHeight}px` }}
                                                                    />
                                                                ))}
                                                        
                                                        {(() => {
                                                            // Algoritmo de asignación inteligente: asignar cada materia a la primera fila disponible
                                                            // Ordenar grupos por hora de inicio
                                                            const sortedGroups = [...dayScheduleGroups].sort((a, b) => a.startSlot - b.startSlot);
                                                            
                                                            // Representar cada fila como un array de rangos ocupados [startSlot, endSlot]
                                                            const rows: Array<Array<[number, number]>> = [];
                                                            
                                                            // Asignar cada grupo a una fila
                                                            const groupRowMap = new Map<string, number>(); // group.schedule.id -> rowIndex
                                                            
                                                            sortedGroups.forEach(group => {
                                                                // Buscar la primera fila donde hay espacio disponible
                                                                let assignedRow = -1;
                                                                
                                                                for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                                                                    const rowRanges = rows[rowIndex];
                                                                    // Verificar si este grupo puede caber en esta fila sin solaparse
                                                                    const canFit = rowRanges.every(([start, end]) => {
                                                                        // No hay solapamiento si el grupo termina antes de que empiece otro
                                                                        // o empieza después de que termine otro
                                                                        return group.endSlot < start || group.startSlot > end;
                                                                    });
                                                                    
                                                                    if (canFit) {
                                                                        assignedRow = rowIndex;
                                                                        break;
                                                                    }
                                                                }
                                                                
                                                                // Si no hay fila disponible, crear una nueva
                                                                if (assignedRow === -1) {
                                                                    assignedRow = rows.length;
                                                                    rows.push([]);
                                                                }
                                                                
                                                                // Asignar el grupo a la fila
                                                                groupRowMap.set(group.schedule.id, assignedRow);
                                                                rows[assignedRow].push([group.startSlot, group.endSlot]);
                                                                
                                                                // Ordenar los rangos de la fila
                                                                rows[assignedRow].sort((a, b) => a[0] - b[0]);
                                                            });
                                                            
                                                            // Agrupar materias por fila asignada
                                                            const groupsByRow: Array<typeof dayScheduleGroups> = [];
                                                            for (let i = 0; i < rows.length; i++) {
                                                                groupsByRow.push([]);
                                                            }
                                                            
                                                            dayScheduleGroups.forEach(group => {
                                                                const rowIndex = groupRowMap.get(group.schedule.id);
                                                                if (rowIndex !== undefined) {
                                                                    groupsByRow[rowIndex].push(group);
                                                                }
                                                            });
                                                            
                                                            // Calcular altura total de la fila: altura fija por bloque * cantidad de filas
                                                            const totalRowHeight = rows.length * BLOCK_HEIGHT + (rows.length > 1 ? (rows.length - 1) * 4 : 0); // 4px de separación entre bloques
                                                            
                                                            return (
                                                                <>
                                                                    {groupsByRow.map((rowGroups, rowIndex) => {
                                                                        const topPosition = rowIndex * (BLOCK_HEIGHT + 4); // 4px de separación entre filas
                                                                        
                                                                        return rowGroups.map((group) => {
                                                                            const slotCount = group.endSlot - group.startSlot + 1;
                                                                            const leftPercent = (group.startSlot / timeSlots.length) * 100;
                                                                            const widthPercent = (slotCount / timeSlots.length) * 100;
                                                                            
                                                                            return (
                                                                                <div
                                                                                    key={`${group.schedule.id}-row-${rowIndex}`}
                                                                                    className="absolute bg-blue-500 text-white border border-blue-600 rounded"
                                                                                    style={{
                                                                                        left: `${leftPercent}%`,
                                                                                        width: `${widthPercent}%`,
                                                                                        height: `${BLOCK_HEIGHT}px`,
                                                                                        top: `${topPosition}px`,
                                                                                        zIndex: rowIndex + 1
                                                                                    }}
                                                                                >
                                                                                    {(() => {
                                                                                        const teacher = group.schedule.teacherUid 
                                                                                            ? availableTeachers.find(u => u.uid === group.schedule.teacherUid)
                                                                                            : null;
                                                                                        return (
                                                                                            <div className="px-2 py-0.5 flex flex-col justify-center h-full pointer-events-none">
                                                                                                <div className="text-xs font-semibold mb-0.5 truncate">
                                                                                                    {group.schedule.subjectName || getSubjectName(group.schedule.subjectId)}
                                                                                                </div>
                                                                                                <div className="text-xs opacity-90 truncate mb-0.5">
                                                                                                    {teacher ? teacher.name : 'Sin profesor asignado'}
                                                                                                </div>
                                                                                                {group.schedule.classroom && (
                                                                                                    <div className="text-xs opacity-75 truncate">
                                                                                                        Aula: {group.schedule.classroom}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            );
                                                                        });
                                                                    })}
                                                                </>
                                                            );
                                                        })()}
                                                            </div>
                                                        );
                                                    })()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
                    {
                        user?.role == 1 && (
                            <>
                                {/* Tabla de profesores */}
                                <div className="mb-8">
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Lista de Profesores</h2>
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        {
                                            teachers.map( s => (
                                                <div key={s.id} className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                                                    <span className="text-sm font-medium text-gray-900 min-w-[150px]">{s.name}</span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <a className="text-sm text-gray-600 hover:text-gray-900" href={`mailto:${s.mail}`}>{s.mail}</a>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-sm text-gray-600">{s.dni}</span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-sm text-gray-600">{s.asig ? getSubjectName(s.asig) : 'Sin materia'}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                                {/* Tabla de alumnos */}
                                <div className="mb-8">
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Lista de Alumnos</h2>
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        {
                                            students.map( s => (
                                                <div key={s.id} className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                                                    <span className="text-sm font-medium text-gray-900 min-w-[150px]">{s.name}</span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <a className="text-sm text-gray-600 hover:text-gray-900" href={`mailto:${s.mail}`}>{s.mail}</a>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-sm text-gray-600">{s.dni}</span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-sm font-medium text-gray-700">{s.level ? getCourseName(s.level) : 'Sin curso'}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </>
                        )
                    }
            </section>
    )
}
'use client';

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { HiCog, HiUsers, HiBookOpen, HiPlus, HiTrash, HiCheck, HiAcademicCap, HiClock, HiX } from "react-icons/hi";
import { useAuthContext } from '@/app/context/authContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useSubjects } from '@/app/context/subjectContext';
import { useSchedule } from '@/app/context/scheduleContext';
import { Assignments, UserCurses, UserRole } from '@/app/types/user';
import { SubjectInput } from '@/app/types/subject';
import { DayLabels } from '@/app/types/schedule';
import { useUserPermissions } from '@/app/utils/rolePermissions';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
    const { user } = useAuthContext();
    const { users } = useTriskaContext();
    const { 
        subjects,
        createSubject,
        updateSubject,
        deleteSubject,
        assignTeacherToSubject,
        assignStudentToSubject,
        removeStudentFromSubject,
        assignMultipleStudentsToSubject,
        getSubjectSummary
    } = useSubjects();
    const { addSchedule, getSchedulesBySubject } = useSchedule();

    // Usar el nuevo sistema de permisos
    const permissions = useUserPermissions(user?.role);
    const isAdmin = permissions.isAnyAdmin;

    // Estados para el panel de materias
    const [activeTab, setActiveTab] = useState<'subjects' | 'assignments'>('subjects');
    const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
    const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
    const [catedrasHours, setCatedrasHours] = useState<number | ''>('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSelectingStudents, setIsSelectingStudents] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
    const [filterCourse, setFilterCourse] = useState<number | ''>('');
    
    // Estados para horarios al crear materia
    const [subjectSchedules, setSubjectSchedules] = useState<Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        classroom: string;
    }>>([]);
    
    // Estado para el selector visual de horarios
    const [selectedTimeSlots, setSelectedTimeSlots] = useState<Map<string, string>>(new Map()); // Map<"day-time", "aula">
    const [selectionStart, setSelectionStart] = useState<{ day: number; time: string } | null>(null);
    const [currentHover, setCurrentHover] = useState<{ day: number; time: string } | null>(null);

    // Filtrar usuarios por rol
    const students = useMemo(() => 
        users.filter(u => u.role === UserRole.Estudiante), 
        [users]
    );
    
    const teachers = useMemo(() => 
        users.filter(u => u.role === UserRole.Docente), 
        [users]
    );

    // Obtener estudiantes del curso seleccionado
    const studentsInCourse = useMemo(() => {
        if (!selectedCourse) return [];
        return students.filter(s => s.level === selectedCourse);
    }, [students, selectedCourse]);

    // Helper functions para mapear enums correctamente
    const getSubjectName = (subjectId: number): string => {
        const subject = Object.entries(Assignments).find(([key, value]) => value === subjectId);
        return subject ? subject[0] : 'Materia desconocida';
    };

    const getCourseName = (courseId: number): string => {
        const course = Object.entries(UserCurses).find(([key, value]) => value === courseId);
        return course ? course[0] : 'Curso desconocido';
    };

    const getSubjectOptions = () => {
        return Object.entries(Assignments)
            .filter(([key, value]) => !isNaN(Number(value)))
            .map(([key, value]) => ({
                label: key,
                value: Number(value)
            }));
    };

    const getCourseOptions = () => {
        return Object.entries(UserCurses)
            .filter(([key, value]) => !isNaN(Number(value)))
            .map(([key, value]) => ({
                label: key,
                value: Number(value)
            }));
    };

    // Obtener resumen de materias
    const subjectSummary = useMemo(() => getSubjectSummary(), [getSubjectSummary]);

    // Validar que los horarios estén completos
    const areSchedulesValid = () => {
        if (selectedTimeSlots.size === 0) return false;
        if (subjectSchedules.length === 0) return false;
        return subjectSchedules.every(schedule => 
            schedule.dayOfWeek >= 0 && 
            schedule.startTime && 
            schedule.endTime && 
            schedule.startTime < schedule.endTime
        );
    };

    // Función para crear una nueva materia
    const handleCreateSubject = async () => {
        if (!selectedCourse || !selectedSubject) {
            toast.error('Por favor selecciona un curso y una materia');
            return;
        }

        if (selectedTimeSlots.size === 0) {
            toast.error('Debes seleccionar al menos un bloque de horario');
            return;
        }

        if (!areSchedulesValid()) {
            toast.error('Por favor completa todos los horarios (día, hora inicio y hora fin)');
            return;
        }

        if (!catedrasHours || Number(catedrasHours) <= 0) {
            toast.error('Por favor ingresa las horas cátedras');
            return;
        }

        const courseName = getCourseName(selectedCourse);
        const subjectName = getSubjectName(selectedSubject);

        const result = await Swal.fire({
            title: '¿Crear Nueva Materia?',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 8px;">¿Estás seguro de que deseas crear la materia <strong>${subjectName}</strong> para <strong>${courseName}</strong>?</p>
                    <p style="margin-bottom: 8px;">Horas cátedras: <strong>${catedrasHours}</strong></p>
                    <p style="margin-bottom: 8px;">Horarios: <strong>${subjectSchedules.length}</strong></p>
                    <p style="font-size: 0.875rem; color: #6b7280;">Después podrás asignar un docente y estudiantes a esta materia.</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Crear',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280',
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            setIsCreating(true);
            try {
                await createSubject({
                    name: subjectName,
                    subjectId: selectedSubject,
                    courseLevel: selectedCourse,
                    teacherUid: '', // Se asignará después
                    studentUids: [],
                    catedrasHours: Number(catedrasHours),
                    plannedSchedules: subjectSchedules
                });
                
                toast.success(`Materia ${subjectName} creada para ${courseName}`);
                // Limpiar formulario completamente después de crear
                setSelectedCourse('');
                setSelectedSubject('');
                setCatedrasHours('');
                setSubjectSchedules([]);
                setSelectedTimeSlots(new Map());
                toast('Ahora puedes asignar un docente y estudiantes a esta materia', { icon: 'ℹ️' });
            } catch (error) {
                console.error('Error al crear materia:', error);
                toast.error('Error al crear materia');
            } finally {
                setIsCreating(false);
            }
        }
    };


    // Limpiar selección de materia cuando cambia el curso
    const handleCourseChange = (course: number | '') => {
        setSelectedCourse(course);
        if (course === '') {
            setSelectedSubject('');
            setSubjectSchedules([]);
            setSelectedTimeSlots(new Map());
            setCatedrasHours('');
        }
    };

    // Limpiar horarios cuando cambia la materia
    const handleSubjectChange = (subject: number | '') => {
        setSelectedSubject(subject);
        if (subject === '') {
            setSubjectSchedules([]);
            setSelectedTimeSlots(new Map());
            setCatedrasHours('');
        }
    };

    // Generar bloques de tiempo disponibles (7:45 a 16:30 en bloques de 40 minutos)
    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        // Empezar a las 7:45
        slots.push('07:45');
        
        let currentHour = 7;
        let currentMinute = 45;
        
        // Continuar hasta llegar a 16:30
        while (true) {
            // Agregar 40 minutos
            currentMinute += 40;
            if (currentMinute >= 60) {
                currentMinute -= 60;
                currentHour += 1;
            }
            
            // Formatear la hora
            const hourStr = currentHour.toString().padStart(2, '0');
            const minuteStr = currentMinute.toString().padStart(2, '0');
            const timeStr = `${hourStr}:${minuteStr}`;
            
            // Verificar si no hemos pasado las 16:30
            if (currentHour > 16 || (currentHour === 16 && currentMinute > 30)) {
                break;
            }
            
            slots.push(timeStr);
        }
        
        return slots;
    }, []);

    // Días de la semana (Lunes a Viernes)
    const weekDays = useMemo(() => [
        { value: 0, label: 'Lunes', short: 'Lun' },
        { value: 1, label: 'Martes', short: 'Mar' },
        { value: 2, label: 'Miércoles', short: 'Mié' },
        { value: 3, label: 'Jueves', short: 'Jue' },
        { value: 4, label: 'Viernes', short: 'Vie' }
    ], []);

    // Función auxiliar para agregar 40 minutos a una hora
    const add40Minutes = (time: string): string => {
        const [hours, minutes] = time.split(':').map(Number);
        let newHours = hours;
        let newMinutes = minutes + 40;
        
        if (newMinutes >= 60) {
            newMinutes -= 60;
            newHours += 1;
        }
        
        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    };

    // Función para actualizar subjectSchedules desde la selección visual
    const updateSchedulesFromVisualSelection = useCallback((timeSlotsMap: Map<string, string>) => {
        const schedules: Array<{
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            classroom: string;
        }> = [];

        // Agrupar bloques consecutivos por día
        weekDays.forEach(day => {
            const daySlots: Array<{ time: string; classroom: string }> = [];
            timeSlots.forEach(time => {
                const key = `${day.value}-${time}`;
                if (timeSlotsMap.has(key)) {
                    daySlots.push({
                        time,
                        classroom: timeSlotsMap.get(key) || ''
                    });
                }
            });

            // Agrupar bloques consecutivos
            if (daySlots.length > 0) {
                let currentStart = daySlots[0].time;
                let currentEnd = daySlots[0].time; // El último bloque del grupo
                let currentClassroom = daySlots[0].classroom;

                for (let i = 1; i < daySlots.length; i++) {
                    const prevTime = daySlots[i - 1].time;
                    const currentTime = daySlots[i].time;
                    
                    // Verificar si son consecutivos (diferencia de 40 minutos)
                    const [prevHours, prevMinutes] = prevTime.split(':').map(Number);
                    const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
                    
                    const prevTotalMinutes = prevHours * 60 + prevMinutes;
                    const currentTotalMinutes = currentHours * 60 + currentMinutes;
                    const timeDiff = currentTotalMinutes - prevTotalMinutes;
                    
                    if (timeDiff === 40) {
                        // Son consecutivos (40 minutos), extender el bloque actual
                        // Actualizamos currentEnd al último bloque del grupo consecutivo
                        currentEnd = currentTime;
                        // Si el nuevo bloque tiene aula y el actual no, actualizar
                        if (daySlots[i].classroom && !currentClassroom) {
                            currentClassroom = daySlots[i].classroom;
                        }
                    } else {
                        // No son consecutivos, guardar el bloque actual y empezar uno nuevo
                        // El horario es desde currentStart hasta el final del último bloque (currentEnd + 40 min)
                        schedules.push({
                            dayOfWeek: day.value,
                            startTime: currentStart,
                            endTime: add40Minutes(currentEnd),
                            classroom: currentClassroom || ''
                        });
                        currentStart = currentTime;
                        currentEnd = currentTime;
                        currentClassroom = daySlots[i].classroom || '';
                    }
                }
                
                // Agregar el último grupo de bloques consecutivos
                // Cuando hay bloques consecutivos, el horario es desde el inicio del primer bloque
                // hasta el inicio del último bloque (el último punto seleccionado)
                // Ejemplo: 15:05, 15:45, 16:25 -> horario de 15:05 a 16:25
                if (currentStart && currentEnd) {
                    // Si solo hay un bloque, el horario es ese bloque completo (inicio + 40 min)
                    if (daySlots.length === 1) {
                        schedules.push({
                            dayOfWeek: day.value,
                            startTime: currentStart,
                            endTime: add40Minutes(currentStart),
                            classroom: currentClassroom || ''
                        });
                    } else {
                        // Si hay múltiples bloques consecutivos, el horario es desde el primero
                        // hasta el inicio del último (currentEnd es el último punto seleccionado)
                        schedules.push({
                            dayOfWeek: day.value,
                            startTime: currentStart, // Inicio del primer bloque
                            endTime: currentEnd, // Inicio del último bloque (es el final del horario)
                            classroom: currentClassroom || ''
                        });
                    }
                }
            }
        });

        setSubjectSchedules(schedules);
    }, [weekDays, timeSlots]);

    // Función para completar la selección de rango
    const completeSelection = useCallback((endDay: number, endTime: string, start?: { day: number; time: string }) => {
        const startPoint = start || selectionStart;
        if (!startPoint) return;

        // Solo permitir selección en el mismo día
        if (startPoint.day !== endDay) {
            setSelectionStart(null);
            setCurrentHover(null);
            return;
        }

        const startIndex = timeSlots.indexOf(startPoint.time);
        const endIndex = timeSlots.indexOf(endTime);
        
        if (startIndex === -1 || endIndex === -1) {
            setSelectionStart(null);
            setCurrentHover(null);
            return;
        }

        // Determinar el rango (puede ser de inicio a fin o de fin a inicio)
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        
        // Seleccionar todos los bloques en el rango
        setSelectedTimeSlots(prev => {
            const newMap = new Map(prev);
            const currentClassroom = prev.get(`${startPoint.day}-${startPoint.time}`) || '';
            
            for (let i = minIndex; i <= maxIndex; i++) {
                const timeSlot = timeSlots[i];
                const key = `${startPoint.day}-${timeSlot}`;
                newMap.set(key, currentClassroom);
            }
            
            updateSchedulesFromVisualSelection(newMap);
            return newMap;
        });
        
        setSelectionStart(null);
        setCurrentHover(null);
    }, [selectionStart, timeSlots, updateSchedulesFromVisualSelection]);

    // Función para manejar el inicio de selección de rango
    const handleTimeSlotMouseDown = (dayOfWeek: number, time: string) => {
        const key = `${dayOfWeek}-${time}`;
        // Si el slot ya está seleccionado, limpiar todo el día
        if (selectedTimeSlots.has(key)) {
            const newMap = new Map(selectedTimeSlots);
            timeSlots.forEach(t => {
                const k = `${dayOfWeek}-${t}`;
                newMap.delete(k);
            });
            setSelectedTimeSlots(newMap);
            updateSchedulesFromVisualSelection(newMap);
        } else {
            setSelectionStart({ day: dayOfWeek, time });
            setCurrentHover({ day: dayOfWeek, time });
        }
    };

    // Función para manejar el fin de selección de rango
    const handleTimeSlotMouseUp = (dayOfWeek: number, time: string) => {
        if (selectionStart) {
            completeSelection(dayOfWeek, time);
        }
    };

    // Función para manejar hover mientras se arrastra (para mostrar preview)
    const handleTimeSlotMouseEnter = (dayOfWeek: number, time: string) => {
        if (selectionStart && selectionStart.day === dayOfWeek) {
            setCurrentHover({ day: dayOfWeek, time });
        }
    };

    // Agregar listener global para mouseup (por si el usuario arrastra fuera de la cuadrícula)
    useEffect(() => {
        if (!selectionStart) return;

        const handleGlobalMouseUp = () => {
            if (currentHover && currentHover.day === selectionStart.day) {
                completeSelection(currentHover.day, currentHover.time, selectionStart);
            } else if (selectionStart) {
                // Si solo hay inicio sin hover, seleccionar solo ese bloque
                completeSelection(selectionStart.day, selectionStart.time, selectionStart);
            }
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [selectionStart, currentHover, completeSelection]);

    // Función para actualizar aula de un bloque
    const updateClassroomForSlot = (dayOfWeek: number, time: string, classroom: string) => {
        const key = `${dayOfWeek}-${time}`;
        const newMap = new Map(selectedTimeSlots);
        newMap.set(key, classroom);
        setSelectedTimeSlots(newMap);
        updateSchedulesFromVisualSelection(newMap);
    };


    // Función para asignar docente a una materia y crear horarios planificados
    const handleAssignTeacher = async (subjectId: string, teacherUid: string) => {
        try {
            await assignTeacherToSubject(subjectId, teacherUid);
            const teacher = teachers.find(t => t.uid === teacherUid);
            const subject = subjects.find(s => s.id === subjectId);
            
            // Crear horarios desde los horarios planificados guardados en la materia
            if (subject && subject.plannedSchedules && subject.plannedSchedules.length > 0) {
                let createdCount = 0;
                for (const schedule of subject.plannedSchedules) {
                    try {
                        await addSchedule({
                            courseLevel: subject.courseLevel,
                            subjectId: subject.subjectId,
                            teacherUid: teacherUid,
                            dayOfWeek: schedule.dayOfWeek,
                            startTime: schedule.startTime,
                            endTime: schedule.endTime,
                            classroom: schedule.classroom || ''
                        });
                        createdCount++;
                    } catch (error) {
                        console.error('Error al crear horario:', error);
                    }
                }
                if (createdCount > 0) {
                    toast.success(`${teacher?.name} asignado y ${createdCount} horario(s) creado(s)`);
                } else {
                    toast.success(`${teacher?.name} asignado a la materia`);
                }
            } else {
                toast.success(`${teacher?.name} asignado a la materia`);
            }
        } catch (error) {
            console.error('Error al asignar docente:', error);
            toast.error('Error al asignar docente');
        }
    };

    // Función para asignar todos los estudiantes a una materia
    const handleAssignAllStudents = async (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const courseName = getCourseName(subject.courseLevel);
        const subjectName = subject.name;
        
        // Obtener estudiantes del curso de la materia
        const studentsInSubjectCourse = students.filter(s => s.level === subject.courseLevel);

        const result = await Swal.fire({
            title: '¿Asignar todos los estudiantes?',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 8px;">¿Estás seguro de que deseas asignar <strong>TODOS</strong> los estudiantes de ${courseName} a la materia <strong>${subjectName}</strong>?</p>
                    <p style="font-size: 0.875rem; color: #6b7280;">Esta acción asignará ${studentsInSubjectCourse.length} estudiantes a la materia.</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Asignar Todos',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280',
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            try {
                const studentUids = studentsInSubjectCourse.map(s => s.uid);
                await assignMultipleStudentsToSubject(subjectId, studentUids);
                toast.success(`Se asignaron ${studentUids.length} estudiantes a ${subjectName}`);
            } catch (error) {
                console.error('Error al asignar estudiantes:', error);
                toast.error('Error al asignar estudiantes');
            }
        }
    };

    // Función para abrir el modal de selección de estudiantes
    const handleOpenStudentSelection = (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;
        
        setSelectedSubjectId(subjectId);
        // Preseleccionar estudiantes ya asignados
        const assignedUids = new Set(subject.studentUids);
        setSelectedStudentUids(assignedUids);
        // Filtrar por el curso de la materia por defecto
        setFilterCourse(subject.courseLevel);
        setIsSelectingStudents(true);
    };

    // Función para guardar la selección de estudiantes
    const handleSaveSelectedStudents = async () => {
        if (!selectedSubjectId) return;

        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;

        try {
            const studentUidsArray = Array.from(selectedStudentUids);
            // Actualizar los estudiantes directamente (reemplazar la lista completa)
            await updateSubject(selectedSubjectId, { studentUids: studentUidsArray });
            toast.success(`Se asignaron ${studentUidsArray.length} estudiantes a ${subject.name}`);
            setIsSelectingStudents(false);
            setSelectedSubjectId(null);
            setSelectedStudentUids(new Set());
            setFilterCourse('');
        } catch (error) {
            console.error('Error al asignar estudiantes:', error);
            toast.error('Error al asignar estudiantes');
        }
    };

    // Función para cancelar la selección
    const handleCancelStudentSelection = () => {
        setIsSelectingStudents(false);
        setSelectedSubjectId(null);
        setSelectedStudentUids(new Set());
        setFilterCourse('');
    };

    // Obtener estudiantes filtrados por curso (para el modal)
    const studentsForSelection = useMemo(() => {
        if (filterCourse === '') {
            // Si no hay filtro, mostrar todos los estudiantes
            return students;
        }
        return students.filter(s => s.level === filterCourse);
    }, [students, filterCourse]);

    // Función para remover estudiante de una materia
    const handleRemoveStudent = async (subjectId: string, studentUid: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        const student = students.find(s => s.uid === studentUid);
        
        if (!subject || !student) return;

        const result = await Swal.fire({
            title: '¿Remover estudiante?',
            text: `¿Estás seguro de que deseas remover a ${student.name} de ${subject.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Remover',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
        });

        if (result.isConfirmed) {
            try {
                await removeStudentFromSubject(subjectId, studentUid);
                toast.success('Estudiante removido exitosamente');
            } catch (error) {
                console.error('Error al remover estudiante:', error);
                toast.error('Error al remover estudiante');
            }
        }
    };

    // Función para eliminar materia
    const handleDeleteSubject = async (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const result = await Swal.fire({
            title: '¿Eliminar materia?',
            text: `¿Estás seguro de que deseas eliminar la materia ${subject.name} de ${getCourseName(subject.courseLevel)}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
        });

        if (result.isConfirmed) {
            try {
                await deleteSubject(subjectId);
                toast.success('Materia eliminada exitosamente');
            } catch (error) {
                console.error('Error al eliminar materia:', error);
                toast.error('Error al eliminar materia');
            }
        }
    };

    if (!isAdmin) {
        return (
            <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
                <div className="text-center py-12">
                    <HiCog className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">Acceso Restringido</h3>
                    <p className="text-sm text-gray-400">
                        Solo los administradores pueden acceder a esta sección.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <HiCog className="w-6 h-6 text-gray-700" />
                    <h1 className="text-2xl font-semibold text-gray-900">Ajustes</h1>
                </div>
                <p className="text-sm text-gray-500">
                    Gestiona las materias, docentes y estudiantes asignados por curso.
                </p>
            </div>

            {/* Panel de Control */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Crear Nueva Materia</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Selector de Curso */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar Curso
                        </label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => handleCourseChange(Number(e.target.value) || '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecciona un curso</option>
                            {getCourseOptions().map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selector de Materia */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar Materia
                        </label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => handleSubjectChange(Number(e.target.value) || '')}
                            disabled={!selectedCourse}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                !selectedCourse ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                        >
                            <option value="">Selecciona una materia</option>
                            {getSubjectOptions().map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Botón de Creación */}
                    <div className="flex items-end">
                        <button
                            onClick={handleCreateSubject}
                            disabled={
                                !selectedCourse || 
                                !selectedSubject || 
                                selectedTimeSlots.size === 0 ||
                                !areSchedulesValid() ||
                                !catedrasHours || 
                                Number(catedrasHours) <= 0 ||
                                isCreating
                            }
                            className={`w-full px-4 py-2 rounded-md font-semibold transition-all ${
                                selectedCourse && 
                                selectedSubject && 
                                selectedTimeSlots.size > 0 &&
                                areSchedulesValid() &&
                                catedrasHours && 
                                Number(catedrasHours) > 0 &&
                                !isCreating
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {isCreating ? 'Creando...' : 'Crear Materia'}
                        </button>
                    </div>
                </div>
                
                {/* Sección de Horarios (Requerido) - Selector Visual */}
                {selectedCourse && selectedSubject && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-1">
                                Selecciona los Horarios de Clase <span className="text-red-500">*</span>
                            </h3>
                            <p className="text-xs text-gray-500">
                                Haz clic y arrastra para seleccionar un rango de horarios (ej: de 08:00 a 09:30). 
                                También puedes hacer clic en un horario ya seleccionado para limpiarlo. 
                                Los bloques son de 40 minutos cada uno.
                            </p>
                        </div>
                        
                        {/* Cuadrícula de Horarios */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                            <div className="min-w-full">
                                {/* Encabezado con horas */}
                                <div className="flex border-b border-gray-200 bg-gray-50">
                                    <div className="w-24 flex-shrink-0 p-2 text-xs font-medium text-gray-700 border-r border-gray-200"></div>
                                    {timeSlots.map((time, idx) => (
                                        <div 
                                            key={time} 
                                            className={`flex-1 min-w-[60px] p-2 text-center text-xs font-medium text-gray-700 border-r border-gray-200 last:border-r-0 ${
                                                idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                            }`}
                                        >
                                            {time}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Filas para cada día */}
                                {weekDays.map((day) => (
                                    <div key={day.value} className="flex border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                                        <div className="w-24 flex-shrink-0 p-2 text-xs font-medium text-gray-700 border-r border-gray-200 bg-gray-50">
                                            {day.short}
                                        </div>
                                        {timeSlots.map((time, timeIndex) => {
                                            const key = `${day.value}-${time}`;
                                            const isSelected = selectedTimeSlots.has(key);
                                            
                                            // Determinar si este bloque está en el rango de selección actual (preview)
                                            let isInSelectionRange = false;
                                            if (selectionStart && selectionStart.day === day.value) {
                                                const previewTime = currentHover && currentHover.day === day.value 
                                                    ? currentHover.time 
                                                    : selectionStart.time;
                                                    
                                                const startIdx = timeSlots.indexOf(selectionStart.time);
                                                const endIdx = timeSlots.indexOf(previewTime);
                                                
                                                if (startIdx !== -1 && endIdx !== -1) {
                                                    const minIdx = Math.min(startIdx, endIdx);
                                                    const maxIdx = Math.max(startIdx, endIdx);
                                                    isInSelectionRange = timeIndex >= minIdx && timeIndex <= maxIdx;
                                                }
                                            }
                                            
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onMouseDown={() => handleTimeSlotMouseDown(day.value, time)}
                                                    onMouseUp={() => handleTimeSlotMouseUp(day.value, time)}
                                                    onMouseEnter={() => handleTimeSlotMouseEnter(day.value, time)}
                                                    className={`flex-1 min-w-[60px] h-12 border-r border-gray-200 last:border-r-0 transition-all relative ${
                                                        isSelected || isInSelectionRange
                                                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                                            : 'bg-white hover:bg-blue-50'
                                                    }`}
                                                    title={`${day.label} ${time}`}
                                                >
                                                    {(isSelected || isInSelectionRange) && (
                                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Resumen de horarios seleccionados */}
                        {subjectSchedules.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-medium text-blue-800 mb-2">
                                    Horarios seleccionados ({subjectSchedules.length}):
                                </p>
                                <div className="space-y-1">
                                    {subjectSchedules.map((schedule, idx) => (
                                        <div key={idx} className="text-xs text-blue-700 flex items-center gap-2">
                                            <span className="font-medium">
                                                {DayLabels[schedule.dayOfWeek as keyof typeof DayLabels]}: 
                                            </span>
                                            <span>
                                                {schedule.startTime} - {schedule.endTime}
                                            </span>
                                            {schedule.classroom && (
                                                <span className="text-blue-600">
                                                    (Aula: {schedule.classroom})
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Campo para configurar aula global (opcional) */}
                        {selectedTimeSlots.size > 0 && (
                            <div className="mt-4">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Aula (opcional - se aplicará a todos los bloques seleccionados)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Aula 101"
                                    onChange={(e) => {
                                        const classroom = e.target.value;
                                        const newMap = new Map(selectedTimeSlots);
                                        selectedTimeSlots.forEach((_, key) => {
                                            newMap.set(key, classroom);
                                        });
                                        setSelectedTimeSlots(newMap);
                                        updateSchedulesFromVisualSelection(newMap);
                                    }}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                        
                        {selectedTimeSlots.size === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">
                                Haz clic y arrastra en los bloques de tiempo de la cuadrícula para seleccionar un rango de horarios
                            </p>
                        )}
                        
                        {/* Campo de Horas Cátedras */}
                        {selectedTimeSlots.size > 0 && areSchedulesValid() && (
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Horas Cátedras <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={catedrasHours}
                                        onChange={(e) => setCatedrasHours(e.target.value ? Number(e.target.value) : '')}
                                        placeholder="Ej: 4"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Ingresa la cantidad de horas cátedras semanales</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Información del curso/materia seleccionado */}
                {selectedCourse && selectedSubject && (
                    <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-2">Información</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Curso:</span> {getCourseName(selectedCourse)}
                            </div>
                            <div>
                                <span className="font-medium">Materia:</span> {getSubjectName(selectedSubject)}
                            </div>
                            <div>
                                <span className="font-medium">Estudiantes en curso:</span> {studentsInCourse.length}
                            </div>
                            <div>
                                <span className="font-medium">Materia existe:</span> {
                                    subjects.some(s => s.courseLevel === selectedCourse && s.subjectId === selectedSubject) ? 'Sí' : 'No'
                                }
                            </div>
                            {selectedTimeSlots.size > 0 && (
                                <div>
                                    <span className="font-medium">Bloques seleccionados:</span> {selectedTimeSlots.size}
                                </div>
                            )}
                            {subjectSchedules.length > 0 && (
                                <div>
                                    <span className="font-medium">Horarios configurados:</span> {subjectSchedules.length}
                                </div>
                            )}
                            {catedrasHours && (
                                <div>
                                    <span className="font-medium">Horas cátedras:</span> {catedrasHours}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de Materias */}
            <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Materias Existentes</h2>
                {subjects.length === 0 ? (
                    <div className="text-center py-8">
                        <HiAcademicCap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No hay materias creadas</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {subjects.map((subject) => {
                            const teacher = teachers.find(t => t.uid === subject.teacherUid);
                            const assignedStudents = students.filter(s => subject.studentUids.includes(s.uid));
                            
                            return (
                                <div key={subject.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors mb-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-800 text-lg">{subject.name}</h4>
                                            <p className="text-sm text-gray-600">{getCourseName(subject.courseLevel)}</p>
                                            {subject.catedrasHours > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Horas cátedras: <span className="font-medium">{subject.catedrasHours}</span>
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSubject(subject.id)}
                                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                        >
                                            <HiTrash className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Docente Asignado */}
                                    <div className="mb-4">
                                        <h5 className="font-medium text-gray-700 mb-2">Docente Asignado</h5>
                                        {teacher ? (
                                            <div className="flex items-center justify-between bg-white rounded p-3 border">
                                                <div>
                                                    <span className="font-medium">{teacher.name}</span>
                                                    <p className="text-sm text-gray-600">{teacher.mail}</p>
                                                </div>
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                                                    <HiCheck className="w-4 h-4 inline mr-1" />
                                                    Asignado
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                                <p className="text-sm text-yellow-700">No hay docente asignado</p>
                                                <div className="mt-2">
                                                    <select
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                handleAssignTeacher(subject.id, e.target.value);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    >
                                                        <option value="">Seleccionar docente</option>
                                                        {teachers.map((t) => (
                                                            <option key={t.uid} value={t.uid}>
                                                                {t.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Horarios de la Materia */}
                                    <div className="mb-4">
                                        <h5 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <HiClock className="w-4 h-4" />
                                            Horarios de Clase
                                        </h5>
                                        {(() => {
                                            const actualSchedules = getSchedulesBySubject(subject.subjectId, subject.courseLevel);
                                            
                                            // Si hay horarios planificados pero no creados (sin docente asignado)
                                            if (actualSchedules.length === 0 && subject.plannedSchedules && subject.plannedSchedules.length > 0) {
                                                return (
                                                    <div>
                                                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
                                                            <p className="text-sm text-blue-700 mb-2">
                                                                Horarios planificados (se crearán al asignar un docente):
                                                            </p>
                                                            <div className="space-y-2">
                                                                {subject.plannedSchedules.map((schedule, idx) => (
                                                                    <div key={idx} className="bg-white rounded p-2 border border-blue-100">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="font-medium text-gray-800 text-sm">{DayLabels[schedule.dayOfWeek as keyof typeof DayLabels]}</span>
                                                                            <span className="text-sm text-gray-600">
                                                                                {schedule.startTime} - {schedule.endTime}
                                                                            </span>
                                                                            {schedule.classroom && (
                                                                                <span className="text-xs text-gray-500">Aula: {schedule.classroom}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            if (actualSchedules.length === 0 && (!subject.plannedSchedules || subject.plannedSchedules.length === 0)) {
                                                return (
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                                        <p className="text-sm text-yellow-700">No hay horarios configurados para esta materia</p>
                                                    </div>
                                                );
                                            }
                                            
                                            return (
                                                <div className="space-y-2">
                                                    {actualSchedules.map((schedule) => (
                                                        <div key={schedule.id} className="bg-white rounded p-3 border border-gray-200">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <span className="font-medium text-gray-800">{DayLabels[schedule.dayOfWeek as keyof typeof DayLabels]}</span>
                                                                        <span className="text-sm text-gray-600">
                                                                            {schedule.startTime} - {schedule.endTime}
                                                                        </span>
                                                                    </div>
                                                                    {schedule.classroom && (
                                                                        <p className="text-sm text-gray-500">Aula: {schedule.classroom}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Estudiantes Asignados */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="font-medium text-gray-700">Estudiantes Asignados ({assignedStudents.length})</h5>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleOpenStudentSelection(subject.id)}
                                                    className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                                                >
                                                    <HiUsers className="w-4 h-4 inline mr-1" />
                                                    Seleccionar
                                                </button>
                                                <button
                                                    onClick={() => handleAssignAllStudents(subject.id)}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                                                >
                                                    <HiPlus className="w-4 h-4 inline mr-1" />
                                                    Asignar Todos
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {assignedStudents.length === 0 ? (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                                <p className="text-sm text-yellow-700">No hay estudiantes asignados</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {assignedStudents.map((student) => (
                                                    <div key={student.uid} className="flex justify-between items-center bg-white rounded p-2 border">
                                                        <div>
                                                            <span className="font-medium">{student.name}</span>
                                                            <p className="text-sm text-gray-600">{student.mail}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveStudent(subject.id, student.uid)}
                                                            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                        >
                                                            <HiTrash className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Resumen de materias */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Materias</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjectSummary.map((summary) => (
                        <div key={`${summary.subjectId}-${summary.courseLevel}`} className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-gray-800">{summary.subjectName}</h4>
                            <p className="text-sm text-gray-600 mb-2">{summary.courseName}</p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Docente:</span>
                                    <span className="font-medium">{summary.teacherName || 'Sin asignar'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Estudiantes:</span>
                                    <span className="font-medium">{summary.assignedStudents}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Selección de Estudiantes */}
            {isSelectingStudents && selectedSubjectId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b">
                            <h3 className="text-xl font-semibold text-gray-800">
                                Seleccionar Estudiantes para {subjects.find(s => s.id === selectedSubjectId)?.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {getCourseName(subjects.find(s => s.id === selectedSubjectId)?.courseLevel || 0)}
                            </p>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Filtro por curso */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Filtrar por Curso
                                </label>
                                <select
                                    value={filterCourse}
                                    onChange={(e) => setFilterCourse(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos los cursos</option>
                                    {getCourseOptions().map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Seleccionados: <span className="font-semibold">{selectedStudentUids.size}</span> 
                                    {filterCourse !== '' && (
                                        <span> de {studentsForSelection.length} en {getCourseName(filterCourse)}</span>
                                    )}
                                    {filterCourse === '' && (
                                        <span> de {students.length} totales</span>
                                    )}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const allUids = new Set(studentsForSelection.map(s => s.uid));
                                            // Mantener los que ya estaban seleccionados de otros cursos
                                            const merged = new Set([...selectedStudentUids, ...allUids]);
                                            setSelectedStudentUids(merged);
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Seleccionar Todos (Filtrado)
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Deseleccionar solo los del curso filtrado actual
                                            const newSet = new Set(selectedStudentUids);
                                            studentsForSelection.forEach(s => {
                                                newSet.delete(s.uid);
                                            });
                                            setSelectedStudentUids(newSet);
                                        }}
                                        className="text-sm text-gray-600 hover:text-gray-700"
                                    >
                                        Deseleccionar (Filtrado)
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                {studentsForSelection.map((student) => (
                                    <label
                                        key={student.uid}
                                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                            selectedStudentUids.has(student.uid)
                                                ? 'bg-blue-50 border-blue-300'
                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStudentUids.has(student.uid)}
                                            onChange={(e) => {
                                                const newSet = new Set(selectedStudentUids);
                                                if (e.target.checked) {
                                                    newSet.add(student.uid);
                                                } else {
                                                    newSet.delete(student.uid);
                                                }
                                                setSelectedStudentUids(newSet);
                                            }}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <div className="flex-1 flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-gray-800">{student.name}</span>
                                                {student.mail && (
                                                    <p className="text-sm text-gray-600">{student.mail}</p>
                                                )}
                                            </div>
                                            {student.level && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                                    {getCourseName(student.level)}
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                            
                            {studentsForSelection.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    {filterCourse === '' 
                                        ? 'No hay estudiantes registrados' 
                                        : `No hay estudiantes en ${getCourseName(filterCourse)}`
                                    }
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 border-t flex gap-3 justify-end">
                            <button
                                onClick={handleCancelStudentSelection}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveSelectedStudents}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Guardar Selección ({selectedStudentUids.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
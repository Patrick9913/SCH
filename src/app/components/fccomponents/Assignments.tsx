'use client';

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { HiBookOpen, HiUsers, HiPlus, HiTrash, HiCheck, HiAcademicCap, HiClock, HiX } from "react-icons/hi";
import { useAuthContext } from '@/app/context/authContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useSubjects } from '@/app/context/subjectContext';
import { useSchedule } from '@/app/context/scheduleContext';
import { useCourses } from '@/app/context/courseContext';
import { Assignments as AssignmentEnum, UserCurses, UserRole, CourseDivision } from '@/app/types/user';
import { useUserPermissions } from '@/app/utils/rolePermissions';
import { DayLabels } from '@/app/types/schedule';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { SubjectCard } from '../reusable/SubjectCard';
import { SubjectDetail } from '../reusable/SubjectDetail';

// Nota: Este componente es una refactorización de Settings.tsx renombrado a Assignments.tsx
// y con el encabezado y textos principales cambiados a "Materias".

export const Assignments: React.FC = () => {
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
    const { courses } = useCourses();

    // Usar el nuevo sistema de permisos
    const permissions = useUserPermissions(user?.role);
    const isAdmin = permissions.isAnyAdmin; // Incluye tanto Admin como SuperAdmin
    const isStudent = permissions.isStudent;

    // Estados para el panel de materias
    const [activeTab, setActiveTab] = useState<'subjects' | 'assignments'>('subjects');
    const [selectedCourseId, setSelectedCourseId] = useState<string | ''>(''); // ID del curso seleccionado
    const [selectedCourse, setSelectedCourse] = useState<number | ''>(''); // Level del curso (para retrocompatibilidad)
    const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
    const [selectedDivision, setSelectedDivision] = useState<CourseDivision | ''>('');
    const [catedrasHours, setCatedrasHours] = useState<number | ''>('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSelectingStudents, setIsSelectingStudents] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
    const [filterCourse, setFilterCourse] = useState<number | ''>('');
    const [filterDivision, setFilterDivision] = useState<CourseDivision | ''>('');
    const [subjectSchedules, setSubjectSchedules] = useState<Array<{ dayOfWeek: number; startTime: string; endTime: string; classroom: string; }>>([]);
    const [selectedTimeSlots, setSelectedTimeSlots] = useState<Map<string, string>>(new Map());
    const [selectionStart, setSelectionStart] = useState<{ day: number; time: string } | null>(null);
    const [currentHover, setCurrentHover] = useState<{ day: number; time: string } | null>(null);
    const [selectedSubjectForDetail, setSelectedSubjectForDetail] = useState<string | null>(null);

    // Filtrar usuarios por rol
    const students = useMemo(() => 
        users.filter(u => u.role === UserRole.Estudiante), 
        [users]
    );
    const teachers = useMemo(() => 
        users.filter(u => u.role === UserRole.Docente), 
        [users]
    );

    // Helpers enums -> labels
    const getSubjectName = (subjectId: number): string => {
        const subject = Object.entries(AssignmentEnum).find(([key, value]) => value === subjectId);
        return subject ? subject[0] : 'Materia desconocida';
    };
    const getCourseName = (courseId: number): string => {
        const course = Object.entries(UserCurses).find(([key, value]) => value === courseId);
        return course ? course[0] : 'Curso desconocido';
    };
    const getSubjectOptions = () => Object.entries(AssignmentEnum)
        .filter(([_, value]) => !isNaN(Number(value)))
        .map(([label, value]) => ({ label, value: Number(value) }));
    const getCourseOptions = () => {
        // Usar cursos dinámicos desde Firestore en lugar del enum estático
        return courses.map(course => {
            const courseName = getCourseName(course.level);
            return { 
                label: `${courseName}${course.division ? ` ${course.division}` : ''}`, 
                value: course.id,
                level: course.level,
                division: course.division
            };
        });
    };

    const subjectSummary = useMemo(() => getSubjectSummary(), [getSubjectSummary]);

    // Obtener materias asignadas al estudiante
    const { getSubjectsByStudent } = useSubjects();
    const studentSubjects = useMemo(() => {
        if (!user || !isStudent || !user.uid) return [];
        return getSubjectsByStudent(user.uid);
    }, [user, isStudent, getSubjectsByStudent]);

    const areSchedulesValid = () => {
        if (selectedTimeSlots.size === 0) return false;
        if (subjectSchedules.length === 0) return false;
        return subjectSchedules.every(s => s.dayOfWeek >= 0 && s.startTime && s.endTime && s.startTime < s.endTime);
    };

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
                    courseDivision: selectedDivision || undefined,
                    teacherUid: '',
                    studentUids: [],
                    catedrasHours: Number(catedrasHours),
                    plannedSchedules: subjectSchedules
                });
                toast.success(`Materia ${subjectName} creada para ${courseName}`);
                setSelectedCourseId('');
                setSelectedCourse('');
                setSelectedSubject('');
                setSelectedDivision('');
                setCatedrasHours('');
                setSubjectSchedules([]);
                setSelectedTimeSlots(new Map());
                toast('Ahora puedes asignar un docente y estudiantes a esta materia', { icon: 'ℹ️' });
            } catch (e) {
                console.error('Error al crear materia:', e);
                toast.error('Error al crear materia');
            } finally {
                setIsCreating(false);
            }
        }
    };

    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        slots.push('07:45');
        let currentHour = 7;
        let currentMinute = 45;
        while (true) {
            currentMinute += 40;
            if (currentMinute >= 60) { currentMinute -= 60; currentHour += 1; }
            const hourStr = currentHour.toString().padStart(2, '0');
            const minuteStr = currentMinute.toString().padStart(2, '0');
            const timeStr = `${hourStr}:${minuteStr}`;
            if (currentHour > 16 || (currentHour === 16 && currentMinute > 30)) break;
            slots.push(timeStr);
        }
        return slots;
    }, []);

    const weekDays = useMemo(() => [
        { value: 0, label: 'Lunes', short: 'Lun' },
        { value: 1, label: 'Martes', short: 'Mar' },
        { value: 2, label: 'Miércoles', short: 'Mié' },
        { value: 3, label: 'Jueves', short: 'Jue' },
        { value: 4, label: 'Viernes', short: 'Vie' }
    ], []);

    const add40Minutes = (time: string): string => {
        const [hours, minutes] = time.split(':').map(Number);
        let newHours = hours; let newMinutes = minutes + 40;
        if (newMinutes >= 60) { newMinutes -= 60; newHours += 1; }
        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    };

    const updateSchedulesFromVisualSelection = useCallback((timeSlotsMap: Map<string, string>) => {
        const schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string; classroom: string; }> = [];
        weekDays.forEach(day => {
            const daySlots: Array<{ time: string; classroom: string }> = [];
            timeSlots.forEach(time => {
                const key = `${day.value}-${time}`;
                if (timeSlotsMap.has(key)) { daySlots.push({ time, classroom: timeSlotsMap.get(key) || '' }); }
            });
            if (daySlots.length > 0) {
                let currentStart = daySlots[0].time; let currentEnd = daySlots[0].time; let currentClassroom = daySlots[0].classroom;
                for (let i = 1; i < daySlots.length; i++) {
                    const prevTime = daySlots[i - 1].time; const currentTime = daySlots[i].time;
                    const [prevHours, prevMinutes] = prevTime.split(':').map(Number);
                    const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
                    const prevTotalMinutes = prevHours * 60 + prevMinutes; const currentTotalMinutes = currentHours * 60 + currentMinutes;
                    const timeDiff = currentTotalMinutes - prevTotalMinutes;
                    if (timeDiff === 40) {
                        currentEnd = currentTime; if (daySlots[i].classroom && !currentClassroom) { currentClassroom = daySlots[i].classroom; }
                    } else {
                        schedules.push({ dayOfWeek: day.value, startTime: currentStart, endTime: add40Minutes(currentEnd), classroom: currentClassroom || '' });
                        currentStart = currentTime; currentEnd = currentTime; currentClassroom = daySlots[i].classroom || '';
                    }
                }
                if (currentStart && currentEnd) {
                    if (daySlots.length === 1) {
                        schedules.push({ dayOfWeek: day.value, startTime: currentStart, endTime: add40Minutes(currentStart), classroom: currentClassroom || '' });
                    } else {
                        schedules.push({ dayOfWeek: day.value, startTime: currentStart, endTime: currentEnd, classroom: currentClassroom || '' });
                    }
                }
            }
        });
        setSubjectSchedules(schedules);
    }, [weekDays, timeSlots]);

    const completeSelection = useCallback((endDay: number, endTime: string, start?: { day: number; time: string }) => {
        const startPoint = start || selectionStart; if (!startPoint) return;
        if (startPoint.day !== endDay) { setSelectionStart(null); setCurrentHover(null); return; }
        const startIndex = timeSlots.indexOf(startPoint.time); const endIndex = timeSlots.indexOf(endTime);
        if (startIndex === -1 || endIndex === -1) { setSelectionStart(null); setCurrentHover(null); return; }
        const minIndex = Math.min(startIndex, endIndex); const maxIndex = Math.max(startIndex, endIndex);
        setSelectedTimeSlots(prev => {
            const newMap = new Map(prev); const currentClassroom = prev.get(`${startPoint.day}-${startPoint.time}`) || '';
            for (let i = minIndex; i <= maxIndex; i++) { const timeSlot = timeSlots[i]; const key = `${startPoint.day}-${timeSlot}`; newMap.set(key, currentClassroom); }
            updateSchedulesFromVisualSelection(newMap); return newMap;
        });
        setSelectionStart(null); setCurrentHover(null);
    }, [selectionStart, timeSlots, updateSchedulesFromVisualSelection]);

    const handleTimeSlotMouseDown = (dayOfWeek: number, time: string) => {
        const key = `${dayOfWeek}-${time}`;
        if (selectedTimeSlots.has(key)) {
            const newMap = new Map(selectedTimeSlots); timeSlots.forEach(t => { newMap.delete(`${dayOfWeek}-${t}`); });
            setSelectedTimeSlots(newMap); updateSchedulesFromVisualSelection(newMap);
        } else { setSelectionStart({ day: dayOfWeek, time }); setCurrentHover({ day: dayOfWeek, time }); }
    };
    const handleTimeSlotMouseUp = (dayOfWeek: number, time: string) => { if (selectionStart) { completeSelection(dayOfWeek, time); } };
    const handleTimeSlotMouseEnter = (dayOfWeek: number, time: string) => { if (selectionStart && selectionStart.day === dayOfWeek) { setCurrentHover({ day: dayOfWeek, time }); } };

    useEffect(() => {
        if (!selectionStart) return; const handleGlobalMouseUp = () => {
            if (currentHover && currentHover.day === selectionStart.day) { completeSelection(currentHover.day, currentHover.time, selectionStart); }
            else if (selectionStart) { completeSelection(selectionStart.day, selectionStart.time, selectionStart); }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => { window.removeEventListener('mouseup', handleGlobalMouseUp); };
    }, [selectionStart, currentHover, completeSelection]);

    const updateClassroomForSlot = (dayOfWeek: number, time: string, classroom: string) => {
        const key = `${dayOfWeek}-${time}`; const newMap = new Map(selectedTimeSlots); newMap.set(key, classroom); setSelectedTimeSlots(newMap); updateSchedulesFromVisualSelection(newMap);
    };

    const handleAssignTeacher = async (subjectId: string, teacherUid: string) => {
        try {
            await assignTeacherToSubject(subjectId, teacherUid);
            const teacher = teachers.find(t => t.uid === teacherUid);
            const subject = subjects.find(s => s.id === subjectId);
            if (subject && subject.plannedSchedules && subject.plannedSchedules.length > 0) {
                let createdCount = 0;
                for (const schedule of subject.plannedSchedules) {
                    try {
                        await addSchedule({ courseLevel: subject.courseLevel, subjectId: subject.subjectId, teacherUid, dayOfWeek: schedule.dayOfWeek, startTime: schedule.startTime, endTime: schedule.endTime, classroom: schedule.classroom || '' });
                        createdCount++;
                    } catch (error) { console.error('Error al crear horario:', error); }
                }
                if (createdCount > 0) { toast.success(`${teacher?.name} asignado y ${createdCount} horario(s) creado(s)`); }
                else { toast.success(`${teacher?.name} asignado a la materia`); }
            } else { toast.success(`${teacher?.name} asignado a la materia`); }
        } catch (error) { console.error('Error al asignar docente:', error); toast.error('Error al asignar docente'); }
    };

    const handleAssignAllStudents = async (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId); if (!subject) return;
        const courseName = getCourseName(subject.courseLevel); const subjectName = subject.name;
        const studentsInSubjectCourse = students.filter(s => s.level === subject.courseLevel);
        const result = await Swal.fire({
            title: '¿Asignar todos los estudiantes?',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 8px;">¿Estás seguro de que deseas asignar <strong>TODOS</strong> los estudiantes de ${courseName} a la materia <strong>${subjectName}</strong>?</p>
                    <p style="font-size: 0.875rem; color: #6b7280;">Esta acción asignará ${studentsInSubjectCourse.length} estudiantes a la materia.</p>
                </div>
            `,
            icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, Asignar Todos', cancelButtonText: 'Cancelar', confirmButtonColor: '#16a34a', cancelButtonColor: '#6b7280', reverseButtons: true,
        });
        if (result.isConfirmed) {
            try { const studentUids = studentsInSubjectCourse.map(s => s.uid); await assignMultipleStudentsToSubject(subjectId, studentUids); toast.success(`Se asignaron ${studentUids.length} estudiantes a ${subjectName}`); }
            catch (error) { console.error('Error al asignar estudiantes:', error); toast.error('Error al asignar estudiantes'); }
        }
    };

    const handleOpenStudentSelection = (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId); if (!subject) return;
        setSelectedSubjectId(subjectId); const assignedUids = new Set(subject.studentUids); setSelectedStudentUids(assignedUids); setFilterCourse(subject.courseLevel); setIsSelectingStudents(true);
    };
    const handleSaveSelectedStudents = async () => {
        if (!selectedSubjectId) return; const subject = subjects.find(s => s.id === selectedSubjectId); if (!subject) return;
        try { const studentUidsArray = Array.from(selectedStudentUids); await updateSubject(selectedSubjectId, { studentUids: studentUidsArray }); toast.success(`Se asignaron ${studentUidsArray.length} estudiantes a ${subject.name}`); setIsSelectingStudents(false); setSelectedSubjectId(null); setSelectedStudentUids(new Set()); setFilterCourse(''); }
        catch (error) { console.error('Error al asignar estudiantes:', error); toast.error('Error al asignar estudiantes'); }
    };
    const handleCancelStudentSelection = () => { setIsSelectingStudents(false); setSelectedSubjectId(null); setSelectedStudentUids(new Set()); setFilterCourse(''); };
    // Subject actual para el modal
    const currentSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId) || null, [subjects, selectedSubjectId]);

    // Ajuste: filtrado de estudiantes por curso+división para asignación (solo según la materia)
    const studentsForSelection = useMemo(() => {
        if (!selectedSubjectId || !currentSubject) return [];
        return students.filter(s =>
            s.level === currentSubject.courseLevel &&
            (!!currentSubject.courseDivision ? s.division === currentSubject.courseDivision : true)
        );
    }, [students, selectedSubjectId, currentSubject]);
    const handleRemoveStudent = async (subjectId: string, studentUid: string) => {
        const subject = subjects.find(s => s.id === subjectId); const student = students.find(s => s.uid === studentUid); if (!subject || !student) return;
        const result = await Swal.fire({ title: '¿Remover estudiante?', text: `¿Estás seguro de que deseas remover a ${student.name} de ${subject.name}?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, Remover', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', });
        if (result.isConfirmed) { try { await removeStudentFromSubject(subjectId, studentUid); toast.success('Estudiante removido exitosamente'); } catch (error) { console.error('Error al remover estudiante:', error); toast.error('Error al remover estudiante'); } }
    };
    const handleDeleteSubject = async (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId); if (!subject) return;
        const result = await Swal.fire({ title: '¿Eliminar materia?', text: `¿Estás seguro de que deseas eliminar la materia ${subject.name} de ${getCourseName(subject.courseLevel)}?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', });
        if (result.isConfirmed) { try { await deleteSubject(subjectId); toast.success('Materia eliminada exitosamente'); } catch (error) { console.error('Error al eliminar materia:', error); toast.error('Error al eliminar materia'); } }
    };

    // Vista para Estudiantes: solo lectura de sus materias
    if (isStudent) {
        return (
            <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <HiBookOpen className="w-6 h-6 text-gray-700" />
                        <h1 className="text-2xl font-semibold text-gray-900">Mis Materias</h1>
                    </div>
                    <p className="text-sm text-gray-500">Materias asignadas a tu curso.</p>
                </div>

                {studentSubjects.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <HiBookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No tienes materias asignadas</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {studentSubjects
                            .sort((a, b) => {
                                // Ordenar por nombre de materia, luego por división
                                if (a.name !== b.name) {
                                    return a.name.localeCompare(b.name);
                                }
                                const divA = a.courseDivision || '';
                                const divB = b.courseDivision || '';
                                return divA.localeCompare(divB);
                            })
                            .map((subject) => {
                                const teacher = teachers.find(t => t.uid === subject.teacherUid);
                                const courseName = getCourseName(subject.courseLevel);
                                const actualSchedules = getSchedulesBySubject(subject.subjectId, subject.courseLevel);
                                const schedules = actualSchedules.length > 0 ? actualSchedules : (subject.plannedSchedules || []);
                                
                                return (
                                    <div key={subject.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-800">{subject.name}</h3>
                                                {subject.courseDivision && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded border border-blue-300">
                                                        {subject.courseDivision}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 font-medium">{courseName}</p>
                                        </div>

                                        {teacher && (
                                            <div className="mb-4 pb-4 border-b border-gray-200">
                                                <p className="text-sm text-gray-600 mb-1">Docente:</p>
                                                <p className="font-medium text-gray-900">{teacher.name}</p>
                                                {teacher.mail && (
                                                    <p className="text-xs text-gray-500">{teacher.mail}</p>
                                                )}
                                            </div>
                                        )}

                                        {schedules.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                                                    <HiClock className="w-4 h-4" />
                                                    Horarios:
                                                </p>
                                                <div className="space-y-2">
                                                    {schedules.map((schedule, idx) => (
                                                        <div key={idx} className="bg-gray-50 rounded p-2 text-sm">
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-medium text-gray-800">
                                                                    {DayLabels[schedule.dayOfWeek as keyof typeof DayLabels]}
                                                                </span>
                                                                <span className="text-gray-600">
                                                                    {schedule.startTime} - {schedule.endTime}
                                                                </span>
                                                                {schedule.classroom && (
                                                                    <span className="text-xs text-gray-500">
                                                                        Aula: {schedule.classroom}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                )}
            </section>
        );
    }

    // Vista solo para Admin
    if (!isAdmin) {
        return (
            <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
                <div className="text-center py-12">
                    <HiBookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">Acceso Restringido</h3>
                    <p className="text-sm text-gray-400">Solo los administradores pueden acceder a esta sección.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <HiBookOpen className="w-6 h-6 text-gray-700" />
                    <h1 className="text-2xl font-semibold text-gray-900">Materias</h1>
                </div>
                <p className="text-sm text-gray-500">Gestiona las materias, docentes y estudiantes asignados por curso.</p>
            </div>

            {/* El resto del contenido es idéntico al de Settings, manteniendo funcionalidad */}
            {/* Panel de Creación */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Crear Nueva Materia</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Curso</label>
                        <select value={selectedCourseId} onChange={(e) => { 
                            const courseData = getCourseOptions().find(c => c.value === e.target.value);
                            if (courseData) {
                                setSelectedCourseId(courseData.value);
                                setSelectedCourse(courseData.level);
                                setSelectedDivision(courseData.division as CourseDivision || '');
                            } else {
                                setSelectedCourseId('');
                                setSelectedCourse('');
                                setSelectedDivision('');
                            }
                            setSelectedSubject('');
                            setSubjectSchedules([]);
                            setSelectedTimeSlots(new Map());
                            setCatedrasHours('');
                        }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Selecciona un curso</option>
                            {getCourseOptions().map(o => (<option key={`curso-${o.value}`} value={o.value}>{o.label}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Materia</label>
                        <select value={selectedSubject} onChange={(e) => { const v = Number(e.target.value) || ''; setSelectedSubject(v); if (v === '') { setSubjectSchedules([]); setSelectedTimeSlots(new Map()); setCatedrasHours(''); } }} disabled={!selectedCourse} className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!selectedCourse ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                            <option value="">Selecciona una materia</option>
                            {getSubjectOptions().map(o => (<option key={`materia-${o.value}`} value={o.value}>{o.label}</option>))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={handleCreateSubject} disabled={!selectedCourse || !selectedSubject || selectedTimeSlots.size === 0 || !areSchedulesValid() || !catedrasHours || Number(catedrasHours) <= 0 || isCreating} className={`w-full px-4 py-2 rounded-md font-semibold transition-all ${(selectedCourse && selectedSubject && selectedTimeSlots.size > 0 && areSchedulesValid() && catedrasHours && Number(catedrasHours) > 0 && !isCreating) ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                            {isCreating ? 'Creando...' : 'Crear Materia'}
                        </button>
                    </div>
                </div>

                {/* Selector visual de horarios */}
                {selectedCourse && selectedSubject && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Selecciona los Horarios de Clase <span className="text-red-500">*</span></h3>
                            <p className="text-xs text-gray-500">Haz clic y arrastra para seleccionar un rango de horarios. Los bloques son de 40 minutos.</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                            <div className="min-w-full">
                                <div className="flex border-b border-gray-200 bg-gray-50">
                                    <div className="w-24 flex-shrink-0 p-2 text-xs font-medium text-gray-700 border-r border-gray-200"></div>
                                    {timeSlots.map((time, idx) => (
                                        <div key={time} className={`flex-1 min-w-[60px] p-2 text-center text-xs font-medium text-gray-700 border-r border-gray-200 last:border-r-0 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>{time}</div>
                                    ))}
                                </div>
                                {weekDays.map((day) => (
                                    <div key={day.value} className="flex border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                                        <div className="w-24 flex-shrink-0 p-2 text-xs font-medium text-gray-700 border-r border-gray-200 bg-gray-50">{day.short}</div>
                                        {timeSlots.map((time, timeIndex) => {
                                            const key = `${day.value}-${time}`; const isSelected = selectedTimeSlots.has(key);
                                            let isInSelectionRange = false; if (selectionStart && selectionStart.day === day.value) {
                                                const previewTime = currentHover && currentHover.day === day.value ? currentHover.time : selectionStart.time;
                                                const startIdx = timeSlots.indexOf(selectionStart.time); const endIdx = timeSlots.indexOf(previewTime);
                                                if (startIdx !== -1 && endIdx !== -1) { const minIdx = Math.min(startIdx, endIdx); const maxIdx = Math.max(startIdx, endIdx); isInSelectionRange = timeIndex >= minIdx && timeIndex <= maxIdx; }
                                            }
                                            return (
                                                <button key={key} type="button" onMouseDown={() => handleTimeSlotMouseDown(day.value, time)} onMouseUp={() => handleTimeSlotMouseUp(day.value, time)} onMouseEnter={() => handleTimeSlotMouseEnter(day.value, time)} className={`flex-1 min-w-[60px] h-12 border-r border-gray-200 last:border-r-0 transition-all relative ${isSelected || isInSelectionRange ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white hover:bg-blue-50'}`} title={`${day.label} ${time}`}>
                                                    {(isSelected || isInSelectionRange) && (<span className="absolute inset-0 flex items-center justify-center text-xs font-medium">✓</span>)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedTimeSlots.size > 0 && (
                            <div className="mt-4">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Aula (opcional)</label>
                                <input type="text" placeholder="Ej: Aula 101" onChange={(e) => { const classroom = e.target.value; const newMap = new Map(selectedTimeSlots); selectedTimeSlots.forEach((_, key) => { newMap.set(key, classroom); }); setSelectedTimeSlots(newMap); updateSchedulesFromVisualSelection(newMap); }} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        )}

                        {selectedTimeSlots.size > 0 && areSchedulesValid() && (
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Horas Cátedras <span className="text-red-500">*</span></label>
                                    <input type="number" min="1" value={catedrasHours} onChange={(e) => setCatedrasHours(e.target.value ? Number(e.target.value) : '')} placeholder="Ej: 4" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <p className="text-xs text-gray-500 mt-1">Ingresa la cantidad de horas cátedras semanales</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Vista de Resumen o Detalle */}
            {selectedSubjectForDetail ? (() => {
                const subject = subjects.find(s => s.id === selectedSubjectForDetail);
                if (!subject) {
                    setSelectedSubjectForDetail(null);
                    return null;
                }
                
                const teacher = teachers.find(t => t.uid === subject.teacherUid);
                const assignedStudents = students.filter(s => subject.studentUids.includes(s.uid));
                const totalStudentsInCourseDivision = students.filter(s => 
                    s.level === subject.courseLevel && 
                    (subject.courseDivision ? s.division === subject.courseDivision : true)
                ).length;
                
                // Obtener horarios (actuales o planificados)
                const actualSchedules = getSchedulesBySubject(subject.subjectId, subject.courseLevel);
                const allSchedules = actualSchedules.length > 0 
                    ? actualSchedules 
                    : (subject.plannedSchedules || []).map((s, idx) => ({
                        id: `planned-${idx}`,
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        classroom: s.classroom,
                    }));

                return (
                    <SubjectDetail
                        subject={subject}
                        teacher={teacher}
                        teachers={teachers}
                        students={students}
                        assignedStudents={assignedStudents}
                        schedules={allSchedules}
                        totalStudentsInCourse={totalStudentsInCourseDivision}
                        onAssignTeacher={(teacherUid) => handleAssignTeacher(subject.id, teacherUid)}
                        onSelectStudents={() => handleOpenStudentSelection(subject.id)}
                        onAssignAllStudents={() => handleAssignAllStudents(subject.id)}
                        onRemoveStudent={(studentUid) => handleRemoveStudent(subject.id, studentUid)}
                        onDeleteSubject={() => {
                            handleDeleteSubject(subject.id);
                            setSelectedSubjectForDetail(null);
                        }}
                        onBack={() => setSelectedSubjectForDetail(null)}
                    />
                );
            })() : (
                <>
                    {/* Lista de Materias - Vista de Tarjetas */}
                    <div className="mb-8">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Resumen de Materias</h2>
                        {subjects.length === 0 ? (
                            <div className="text-center py-8">
                                <HiAcademicCap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500">No hay materias creadas</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subjects.map((subject) => {
                                    const teacher = teachers.find(t => t.uid === subject.teacherUid);
                                    const assignedStudents = students.filter(s => subject.studentUids.includes(s.uid));
                                    const totalStudentsInCourseDivision = students.filter(s => 
                                        s.level === subject.courseLevel && 
                                        (subject.courseDivision ? s.division === subject.courseDivision : true)
                                    ).length;
                                    const actualSchedules = getSchedulesBySubject(subject.subjectId, subject.courseLevel);
                                    const scheduleCount = (actualSchedules?.length || 0) + (actualSchedules.length === 0 ? (subject.plannedSchedules?.length || 0) : 0);

                                    return (
                                        <SubjectCard
                                            key={subject.id}
                                            subject={subject}
                                            teacher={teacher}
                                            studentCount={assignedStudents.length}
                                            totalStudentsInCourse={totalStudentsInCourseDivision}
                                            scheduleCount={scheduleCount}
                                            onClick={() => setSelectedSubjectForDetail(subject.id)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modal selección de estudiantes */}
            {isSelectingStudents && selectedSubjectId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b">
                            <h3 className="text-xl font-semibold text-gray-800">Seleccionar Estudiantes para {subjects.find(s => s.id === selectedSubjectId)?.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{getCourseName(subjects.find(s => s.id === selectedSubjectId)?.courseLevel || 0)}{subjects.find(s => s.id === selectedSubjectId)?.courseDivision ? ` ${subjects.find(s => s.id === selectedSubjectId)?.courseDivision}` : ''}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Encabezado informativo del curso y división (sin inputs) */}
                            <div className="mb-3 text-sm text-gray-600">
                                {currentSubject ? (
                                    <span>
                                        Mostrando alumnos de {getCourseName(currentSubject.courseLevel)}{currentSubject.courseDivision ? ` ${currentSubject.courseDivision}` : ''}
                                    </span>
                                ) : (
                                    <span>Selecciona una materia</span>
                                )}
                            </div>
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Seleccionados: <span className="font-semibold">{selectedStudentUids.size}</span>
                                    {currentSubject && (
                                        <span>
                                            {` de ${studentsForSelection.length} en ${getCourseName(currentSubject.courseLevel)}`}
                                            {currentSubject.courseDivision ? ` ${currentSubject.courseDivision}` : ''}
                                        </span>
                                    )}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => { const allUids = new Set(studentsForSelection.map(s => s.uid)); const merged = new Set([...selectedStudentUids, ...allUids]); setSelectedStudentUids(merged); }} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Seleccionar Todos</button>
                                    <button onClick={() => { const newSet = new Set(selectedStudentUids); studentsForSelection.forEach(s => { newSet.delete(s.uid); }); setSelectedStudentUids(newSet); }} className="text-sm text-gray-600 hover:text-gray-700">Deseleccionar</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {studentsForSelection.map((student) => (
                                    <label key={student.uid} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedStudentUids.has(student.uid) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="checkbox" checked={selectedStudentUids.has(student.uid)} onChange={(e) => { const newSet = new Set(selectedStudentUids); if (e.target.checked) { newSet.add(student.uid); } else { newSet.delete(student.uid); } setSelectedStudentUids(newSet); }} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                                        <div className="flex-1 flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-gray-800">{student.name}</span>
                                                {student.mail && (<p className="text-sm text-gray-600">{student.mail}</p>)}
                                            </div>
                                            <span className="block text-xs text-gray-500 mt-0.5">
                                                {student.level ? getCourseName(student.level) : ''}{student.division ? ` ${student.division}` : ''}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {studentsForSelection.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    {currentSubject ? `No hay estudiantes en ${getCourseName(currentSubject.courseLevel)}${currentSubject.courseDivision ? ` ${currentSubject.courseDivision}` : ''}` : 'No hay estudiantes disponibles'}
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t flex gap-3 justify-end">
                            <button onClick={handleCancelStudentSelection} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
                            <button onClick={handleSaveSelectedStudents} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Guardar Selección ({selectedStudentUids.size})</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};



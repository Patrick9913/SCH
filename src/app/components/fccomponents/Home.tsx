import { useAuthContext } from "@/app/context/authContext";
import { useTriskaContext } from "@/app/context/triskaContext";
import { useAnnouncements } from "@/app/context/announcementsContext";
import { useSchedule } from "@/app/context/scheduleContext";
import { Assignments, UserCurses} from "@/app/types/user";
import { DayLabels, DayLabelsShort } from "@/app/types/schedule";
import { HiHome, HiClock, HiUser, HiBookOpen } from "react-icons/hi";

import React from "react";

export const Home: React.FC = () => {

    const { user} = useAuthContext()
    const { users} = useTriskaContext()
    const { announcements, createAnnouncement, deleteAnnouncement } = useAnnouncements()
    const { schedules, getSchedulesByCourse } = useSchedule()

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

    // Horarios semanal para estudiantes
    const studentWeeklySchedule = React.useMemo(() => {
        if (!user || user.role !== 3 || !user.level) return null;
        
        const courseSchedules = getSchedulesByCourse(user.level);
        // Organizar por día
        const scheduleByDay: Record<number, typeof courseSchedules> = {};
        courseSchedules.forEach(schedule => {
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
    }, [user, user?.level, schedules, getSchedulesByCourse]);

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
                                <div className="p-5 bg-white border border-gray-200 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Alumnos</h3>
                                    <p className="text-3xl font-semibold text-gray-900 mb-1">{students.length}</p>
                                    <p className="text-xs text-gray-500">Matriculados este ciclo</p>
                                </div>
                                <div className="p-5 bg-white border border-gray-200 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Profesores</h3>
                                    <p className="text-3xl font-semibold text-gray-900 mb-1">{teachers.length}</p>
                                    <p className="text-xs text-gray-500">Activos</p>
                                </div>
                            </>
                        )
                    }
                    
                    <div className="p-5 bg-white border border-gray-200 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Materias</h3>
                        <p className="text-3xl font-semibold text-gray-900 mb-1">15</p>
                        <p className="text-xs text-gray-500">Ofertadas este semestre</p>
                    </div>
                </div>
                {/* Horarios semanal para estudiantes */}
                {user?.role === 3 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Mi Horario Semanal</h2>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="grid grid-cols-5 gap-px bg-gray-200">
                                {[0, 1, 2, 3, 4].map(day => (
                                    <div key={day} className="bg-white">
                                        <div className="bg-gray-50 p-3 border-b border-gray-200">
                                            <h3 className="text-sm font-semibold text-gray-900 text-center">
                                                {DayLabelsShort[day as keyof typeof DayLabelsShort]}
                                            </h3>
                                        </div>
                                        <div className="p-2 space-y-2 min-h-[300px]">
                                            {studentWeeklySchedule && studentWeeklySchedule[day]?.map((schedule) => {
                                                const teacher = users.find(u => u.uid === schedule.teacherUid);
                                                return (
                                                    <div
                                                        key={schedule.id}
                                                        className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:border-blue-300 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <HiClock className="w-4 h-4 text-blue-600" />
                                                            <span className="text-xs font-medium text-blue-900">
                                                                {schedule.startTime} - {schedule.endTime}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                                            {getSubjectName(schedule.subjectId)}
                                                        </h4>
                                                        <div className="space-y-1 text-xs text-gray-600">
                                                            <div className="flex items-center gap-1">
                                                                <HiUser className="w-3 h-3" />
                                                                <span>{teacher?.name || 'Sin profesor'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <HiBookOpen className="w-3 h-3" />
                                                                <span>{schedule.classroom}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {(!studentWeeklySchedule || !studentWeeklySchedule[day] || studentWeeklySchedule[day].length === 0) && (
                                                <div className="text-center py-8 text-gray-400 text-xs">
                                                    Sin clases
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
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
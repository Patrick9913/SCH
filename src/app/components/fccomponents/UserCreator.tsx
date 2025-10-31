'use client';

import React, { useState, useMemo } from "react";
import { IoPeople } from "react-icons/io5";
import { HiArrowLeft } from "react-icons/hi";
import { useTriskaContext } from "@/app/context/triskaContext";
import { useAuthContext } from "@/app/context/authContext";
import { useCourses } from "@/app/context/courseContext";
import { Assignments, UserCurses, CourseDivision } from "@/app/types/user";
import toast from "react-hot-toast";

export const UserCreator: React.FC = () => {
    const { setMenu, newUser } = useTriskaContext();
    const { user: currentUser } = useAuthContext();
    const { courses, assignStudentToCourse } = useCourses();
    const isAdmin = currentUser?.role === 1;

    const [firstName, setFirstName] = useState('');
    const [mail, setMail] = useState('');
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<number>(0);
    const [asignatura, setAsignatura] = useState<number | ''>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    // Cursos ordenados para mostrar
    const sortedCourses = useMemo(() => {
        return [...courses].sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return (a.division || '').localeCompare(b.division || '');
        });
    }, [courses]);

    if (!isAdmin) {
        return (
            <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-500 mb-2">Acceso Restringido</h3>
                    <p className="text-sm text-gray-400">Solo los administradores pueden crear usuarios.</p>
                </div>
            </section>
        );
    }

    const resetForm = () => {
        setFirstName(''); setMail(''); setDni(''); setPassword(''); setRole(0); setAsignatura(''); setSelectedCourseId('');
    };

    const getCourseName = (level: number): string => {
        const course = Object.entries(UserCurses).find(([_, value]) => value === level);
        return course ? course[0] : `${level}°`;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firstName || !mail || !dni || !role) { 
            toast.error('Por favor completa todos los campos requeridos'); 
            return; 
        }
        if (!password) { 
            toast.error('La contraseña es requerida'); 
            return; 
        }
        if (role === 4 && !asignatura) { 
            toast.error('Selecciona una asignatura para el docente'); 
            return; 
        }
        if (role === 3 && !selectedCourseId) { 
            toast.error('Selecciona un curso para el estudiante'); 
            return; 
        }
        
        setIsLoading(true);
        try {
            // Obtener el curso seleccionado para extraer level y division
            const selectedCourse = courses.find(c => c.id === selectedCourseId);
            
            // Crear el usuario
            const userData: any = {
                firstName,
                mail,
                dni: Number(dni),
                role,
                password,
                ...(asignatura && { asignatura })
            };

            // Si es estudiante, agregar courseId, level y division
            if (role === 3 && selectedCourse) {
                userData.courseId = selectedCourseId;
                userData.level = selectedCourse.level;
                userData.division = selectedCourse.division;
            }

            const createdUser = await newUser(userData);
            
            // Si es estudiante, agregarlo automáticamente al curso
            if (role === 3 && selectedCourseId && createdUser?.uid) {
                try {
                    await assignStudentToCourse(selectedCourseId, createdUser.uid);
                } catch (courseError) {
                    console.error('Error al asignar estudiante al curso:', courseError);
                    // No bloqueamos la creación si falla la asignación
                }
            }

            resetForm();
            toast.success('Usuario creado exitosamente. Puedes seguir creando más desde aquí.');
        } catch (error: any) {
            console.error('Error al crear usuario:', error);
            toast.error(error.message || 'Error al crear usuario');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <IoPeople className="w-6 h-6 text-gray-700" />
                        <h1 className="text-2xl font-semibold text-gray-900">Nuevo Usuario</h1>
                    </div>
                    <button
                        onClick={() => setMenu(3)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <span className="inline-flex items-center gap-2"><HiArrowLeft className="w-4 h-4"/> Volver</span>
                    </button>
                </div>
                <p className="text-sm text-gray-500">Completa la información para registrar un nuevo usuario en el sistema.</p>
            </div>

            <div className="max-w-5xl w-full">
                <form onSubmit={handleSubmit} className="rounded-lg bg-white border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Juan Pérez" required />
                    </div>
                    <div className="flex flex-col gap-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
                        <input value={mail} onChange={(e) => setMail(e.target.value)} type="email" className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ejemplo@escuela.com" required />
                    </div>
                    <div className="flex flex-col gap-y-2">
                        <label className="text-sm font-medium text-gray-700">DNI</label>
                        <input value={dni} onChange={(e) => setDni(e.target.value)} type="number" className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="12345678" required />
                    </div>
                    <div className="flex flex-col gap-y-2">
                        <label className="text-sm font-medium text-gray-700">Contraseña</label>
                        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mínimo 6 caracteres" required />
                    </div>
                    <div className="flex flex-col gap-y-2">
                        <label className="text-sm font-medium text-gray-700">Rol</label>
                        <select value={role} onChange={(e) => { setRole(Number(e.target.value)); setAsignatura(''); setSelectedCourseId(''); }} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            <option value={0} disabled>Seleccionar rol...</option>
                            <option value={1}>Administrador</option>
                            <option value={2}>Staff</option>
                            <option value={3}>Estudiante</option>
                            <option value={4}>Docente</option>
                            <option value={5}>Familia</option>
                        </select>
                    </div>
                    {role === 4 && (
                        <div className="flex flex-col gap-y-2">
                            <label className="text-sm font-medium text-gray-700">Asignatura</label>
                            <select value={asignatura} onChange={(e) => setAsignatura(Number(e.target.value))} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="" disabled>Seleccionar asignatura...</option>
                                {Object.entries(Assignments).filter(([key]) => !isNaN(Number(key))).map(([key, name]) => (
                                    <option key={key} value={key}>{name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {role === 3 && (
                        <div className="flex flex-col gap-y-2">
                            <label className="text-sm font-medium text-gray-700">Curso <span className="text-xs text-gray-500">(debe estar previamente creado)</span></label>
                            {courses.length === 0 ? (
                                <div className="p-3 border border-yellow-300 rounded-lg bg-yellow-50">
                                    <p className="text-sm text-yellow-800">
                                        No hay cursos creados. Por favor crea los cursos primero en la sección "Cursos".
                                    </p>
                                </div>
                            ) : (
                                <select 
                                    value={selectedCourseId} 
                                    onChange={(e) => setSelectedCourseId(e.target.value)} 
                                    className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                    required
                                >
                                    <option value="" disabled>Seleccionar curso...</option>
                                    {sortedCourses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {getCourseName(course.level)} - División {course.division}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {selectedCourseId && (
                                <p className="text-xs text-gray-500 mt-1">
                                    El estudiante será asignado automáticamente a este curso al crearlo.
                                </p>
                            )}
                        </div>
                    )}
                    <div className="md:col-span-2 flex gap-3 pt-2">
                        <button type="button" onClick={() => setMenu(3)} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">{isLoading ? 'Creando...' : 'Publicar'}</button>
                    </div>
                    </div>
                </form>
            </div>
        </section>
    );
};



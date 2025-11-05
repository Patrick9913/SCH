'use client';

import React, { useState, useMemo } from "react";
import { IoPeople } from "react-icons/io5";
import { HiArrowLeft, HiPlus } from "react-icons/hi";
import { useTriskaContext } from "@/app/context/triskaContext";
import { useAuthContext } from "@/app/context/authContext";
import { useCourses } from "@/app/context/courseContext";
import { useSubjects } from "@/app/context/subjectContext";
import { Assignments, UserCurses, CourseDivision } from "@/app/types/user";
import { useUserPermissions } from "@/app/utils/rolePermissions";
import toast from "react-hot-toast";

export const UserCreator: React.FC = () => {
    const { setMenu, newUser, users } = useTriskaContext();
    const { user: currentUser } = useAuthContext();
    const { courses, assignStudentToCourse } = useCourses();
    const { subjects } = useSubjects();
    
    // Usar el nuevo sistema de permisos
    const permissions = useUserPermissions(currentUser?.role);

    const [firstName, setFirstName] = useState('');
    const [mail, setMail] = useState('');
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<number>(0);
    const [asignatura, setAsignatura] = useState<number | ''>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedChildrenIds, setSelectedChildrenIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados para búsqueda de hijos por DNI
    const [searchDni, setSearchDni] = useState('');
    const [foundStudent, setFoundStudent] = useState<any>(null);

    // Cursos ordenados para mostrar
    const sortedCourses = useMemo(() => {
        return [...courses].sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return (a.division || '').localeCompare(b.division || '');
        });
    }, [courses]);

    // Materias únicas para selección (solo las creadas)
    const uniqueSubjects = useMemo(() => {
        // Obtener materias únicas por nombre (para evitar duplicados)
        const subjectMap = new Map<string, { name: string; subjectId: number }>();
        subjects.forEach(subject => {
            if (!subjectMap.has(subject.name)) {
                subjectMap.set(subject.name, {
                    name: subject.name,
                    subjectId: subject.subjectId
                });
            }
        });
        return Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [subjects]);

    // Estudiantes disponibles para asignar como hijos
    const availableStudents = useMemo(() => {
        return users
            .filter(u => u.role === 3) // Solo estudiantes
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [users]);

    if (!permissions.canCreateUsers) {
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
        setFirstName(''); 
        setMail(''); 
        setDni(''); 
        setPassword(''); 
        setRole(0); 
        setAsignatura(''); 
        setSelectedCourseId(''); 
        setSelectedChildrenIds([]);
        setSearchDni('');
        setFoundStudent(null);
    };

    const getCourseName = (level: number): string => {
        const course = Object.entries(UserCurses).find(([_, value]) => value === level);
        return course ? course[0] : `${level}°`;
    };

    // Funciones para gestionar hijos por DNI
    const handleSearchStudent = () => {
        if (!searchDni || searchDni.trim() === '') {
            toast.error('Ingresa un DNI para buscar');
            return;
        }

        // Buscar estudiante por DNI
        const student = availableStudents.find(s => String(s.dni) === searchDni.trim());
        
        if (!student) {
            toast.error('No se encontró ningún estudiante con ese DNI');
            setFoundStudent(null);
            return;
        }

        // Verificar que no esté ya agregado
        if (selectedChildrenIds.includes(student.id || student.uid)) {
            toast.error('Este estudiante ya está asociado a esta familia');
            setFoundStudent(null);
            return;
        }

        setFoundStudent(student);
        toast.success('Estudiante encontrado');
    };

    const handleAddFoundStudent = () => {
        if (!foundStudent) return;
        
        const studentId = foundStudent.id || foundStudent.uid;
        setSelectedChildrenIds([...selectedChildrenIds, studentId]);
        setSearchDni('');
        setFoundStudent(null);
        toast.success('Estudiante agregado a la familia');
    };

    const handleRemoveChild = (childId: string) => {
        setSelectedChildrenIds(selectedChildrenIds.filter(id => id !== childId));
        toast.success('Estudiante removido');
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
        
        // Validar permisos para crear SuperAdmin o Admin
        if ((role === 1 || role === 7) && !permissions.canManageAdmins) {
            toast.error('Solo el Super Administrador puede crear Administradores y Super Administradores');
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
        if (role === 5 && selectedChildrenIds.length === 0) { 
            toast.error('Selecciona al menos un hijo para el familiar'); 
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

            // Si es familia, agregar childrenIds
            if (role === 5 && selectedChildrenIds.length > 0) {
                userData.childrenIds = selectedChildrenIds;
                // Para retrocompatibilidad, también establecer childId con el primer hijo
                userData.childId = selectedChildrenIds[0];
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
                        <select value={role} onChange={(e) => { setRole(Number(e.target.value)); setAsignatura(''); setSelectedCourseId(''); setSelectedChildrenIds([]); }} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            <option value={0} disabled>Seleccionar rol...</option>
                            {permissions.canManageAdmins && (
                                <>
                                    <option value={7}>Super Administrador</option>
                                    <option value={1}>Administrador</option>
                                </>
                            )}
                            <option value={2}>Staff</option>
                            <option value={3}>Estudiante</option>
                            <option value={4}>Docente</option>
                            <option value={5}>Familia</option>
                            <option value={6}>Seguridad</option>
                        </select>
                        {!permissions.canManageAdmins && (role === 1 || role === 7) && (
                            <p className="text-xs text-orange-600 mt-1">
                                ⚠️ Solo el Super Administrador puede crear Administradores.
                            </p>
                        )}
                    </div>
                    {role === 4 && (
                        <div className="flex flex-col gap-y-2">
                            <label className="text-sm font-medium text-gray-700">Asignatura</label>
                            {uniqueSubjects.length === 0 ? (
                                <div className="p-3 border border-yellow-300 rounded-lg bg-yellow-50">
                                    <p className="text-sm text-yellow-800">
                                        No hay materias creadas. Por favor crea las materias primero en la sección "Materias".
                                    </p>
                                </div>
                            ) : (
                                <select value={asignatura} onChange={(e) => setAsignatura(Number(e.target.value))} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                    <option value="" disabled>Seleccionar asignatura...</option>
                                    {uniqueSubjects.map(subject => (
                                        <option key={subject.subjectId} value={subject.subjectId}>{subject.name}</option>
                                    ))}
                                </select>
                            )}
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
                    {role === 5 && (
                        <div className="flex flex-col gap-y-3 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">
                                Estudiantes Asociados (Hijos)
                            </label>
                            
                            {availableStudents.length === 0 ? (
                                <div className="p-3 border border-yellow-300 rounded-lg bg-yellow-50">
                                    <p className="text-sm text-yellow-800">
                                        No hay estudiantes creados. Por favor crea los estudiantes primero.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Lista de hijos agregados */}
                                    {selectedChildrenIds.length > 0 && (
                                        <div className="space-y-2 mb-3">
                                            {selectedChildrenIds.map(childId => {
                                                const child = availableStudents.find(s => s.id === childId || s.uid === childId);
                                                if (!child) return null;
                                                
                                                return (
                                                    <div key={childId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                                                                {child.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 text-sm">{child.name}</p>
                                                                <p className="text-xs text-gray-600">
                                                                    {child.level ? getCourseName(child.level) : 'Sin curso'}
                                                                    {child.division && ` - División ${child.division}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveChild(childId)}
                                                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Buscar y agregar nuevo hijo por DNI */}
                                    <div className="space-y-3 p-4 border border-gray-300 rounded-lg bg-gray-50">
                                        <p className="text-xs font-medium text-gray-700">Buscar estudiante por DNI:</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={searchDni}
                                                onChange={(e) => setSearchDni(e.target.value)}
                                                placeholder="Ingrese DNI del estudiante..."
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSearchStudent();
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSearchStudent}
                                                disabled={!searchDni}
                                                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Buscar
                                            </button>
                                        </div>

                                        {/* Estudiante encontrado */}
                                        {foundStudent && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                                                            {foundStudent.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 text-sm">{foundStudent.name}</p>
                                                            <p className="text-xs text-gray-600">
                                                                DNI: {foundStudent.dni} • {foundStudent.level ? getCourseName(foundStudent.level) : 'Sin curso'}
                                                                {foundStudent.division && ` - División ${foundStudent.division}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddFoundStudent}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                                    >
                                                        <HiPlus className="w-4 h-4" />
                                                        Agregar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedChildrenIds.length > 0 && (
                                        <p className="text-xs text-green-600">
                                            ✓ {selectedChildrenIds.length} {selectedChildrenIds.length === 1 ? 'hijo agregado' : 'hijos agregados'}
                                        </p>
                                    )}
                                </>
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



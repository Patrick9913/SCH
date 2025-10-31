import React, { useState, useMemo } from "react";
import { Personalview } from "../reusable/PersonalView";
import { useTriskaContext } from "@/app/context/triskaContext";
import { useAuthContext } from "@/app/context/authContext";
import { useCourses } from "@/app/context/courseContext";
import { UserCurses, UserRole, Assignments, User } from "@/app/types/user";
import { IoPeople } from "react-icons/io5";
import { HiPlus, HiX } from "react-icons/hi";
import { RefreshButton } from "../reusable/RefreshButton";
import toast from "react-hot-toast";
import Swal from 'sweetalert2';

export const Personal: React.FC = () => {
    const { users, firstName, dni, mail, role, nUser, setNUser, setFirstName, setDni, setMail, setRole, newUser, updateUser, deleteUser, suspendUser, activateUser, password, setPassword, refreshUsers, setMenu } = useTriskaContext();
    const { user: currentUser } = useAuthContext();
    const { courses, assignStudentToCourse, removeStudentFromCourse } = useCourses();
    const isAdmin = currentUser?.role === 1;

    // Estados adicionales para campos específicos
    const [asignatura, setAsignatura] = useState<number | ''>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Cursos ordenados para mostrar
    const sortedCourses = useMemo(() => {
        if (!courses || !Array.isArray(courses)) return [];
        return [...courses].sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return (a.division || '').localeCompare(b.division || '');
        });
    }, [courses]);

    const admins = users.filter(u => u.role === 1)
    const teachers = users.filter(u => u.role === 4)
    const students = users.filter(u => u.role === 3)
    const staff = users.filter(u => u.role === 2)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true);

        if (!firstName || !mail || !dni || !role) {
            toast.error("Por favor completa todos los campos requeridos");
            setIsLoading(false);
            return;
        }

        // Si es modo edición, la contraseña es opcional
        if (!isEditMode && !password) {
            toast.error("La contraseña es requerida");
            setIsLoading(false);
            return;
        }

        // Validaciones específicas por rol
        if (role === 4 && !asignatura) { // Docente
            toast.error("Por favor selecciona una asignatura para el docente");
            setIsLoading(false);
            return;
        }

        if (role === 3 && !selectedCourseId) { // Estudiante
            toast.error("Por favor selecciona un curso para el estudiante");
            setIsLoading(false);
            return;
        }
        
        try {
            if (isEditMode && editingUser) {
                // Modo edición
                const selectedCourse = courses && Array.isArray(courses) ? courses.find(c => c.id === selectedCourseId) : undefined;
                const oldCourseId = editingUser.courseId;
                
                // Preparar datos de actualización
                const updateData: any = {
                    firstName,
                    mail,
                    dni: Number(dni),
                    role,
                    ...(password && { password }),
                    ...(asignatura && { asignatura })
                };

                // Si es estudiante y hay curso seleccionado
                if (role === 3 && selectedCourse) {
                    updateData.courseId = selectedCourseId;
                    updateData.level = selectedCourse.level;
                    updateData.division = selectedCourse.division;
                }

                // Actualizar el usuario
                await updateUser(editingUser.id, updateData);
                
                // Si es estudiante y cambió de curso, actualizar las asignaciones
                if (role === 3 && selectedCourse && editingUser.uid) {
                    // Si tenía un curso anterior y cambió, remover del curso antiguo
                    if (oldCourseId && oldCourseId !== selectedCourseId) {
                        try {
                            await removeStudentFromCourse(oldCourseId, editingUser.uid);
                        } catch (error) {
                            console.error('Error al remover del curso antiguo:', error);
                        }
                    }
                    
                    // Agregar al nuevo curso (si no estaba ya)
                    try {
                        await assignStudentToCourse(selectedCourseId, editingUser.uid);
                    } catch (error) {
                        console.error('Error al asignar al nuevo curso:', error);
                    }
                }
                
                toast.success("Usuario actualizado exitosamente");
                handleCancelEdit();
            } else {
                // Modo creación (este flujo ahora está en UserCreator, pero mantener para compatibilidad)
                const selectedCourse = courses.find(c => c.id === selectedCourseId);
                await newUser({
                    firstName,
                    mail,
                    dni: Number(dni),
                    role,
                    password: password!,
                    ...(asignatura && { asignatura }),
                    ...(selectedCourse && {
                        courseId: selectedCourseId,
                        level: selectedCourse.level,
                        division: selectedCourse.division
                    })
                });
                toast.success("Usuario creado exitosamente");
                resetForm();
            }
        } catch (error) {
            console.error('Error al guardar usuario:', error);
            toast.error(error instanceof Error ? error.message : "Error al guardar usuario");
        } finally {
            setIsLoading(false);
        }
    }

    // Función para refrescar datos
    const handleRefresh = () => {
        refreshUsers();
    };

    const resetForm = () => {
        setFirstName('');
        setMail('');
        setDni('');
        setPassword('');
        setRole(0);
        setAsignatura('');
        setSelectedCourseId('');
        setNUser(false);
        setIsEditMode(false);
        setEditingUser(null);
    }

    const getCourseName = (level: number): string => {
        const course = Object.entries(UserCurses).find(([_, value]) => value === level);
        return course ? course[0] : `${level}°`;
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsEditMode(true);
        setFirstName(user.name);
        setMail(user.mail || '');
        setDni(String(user.dni || ''));
        setRole(user.role);
        setAsignatura(user.asig || '');
        // Si tiene courseId, usarlo; si no, usar level como fallback (compatibilidad)
        setSelectedCourseId(user.courseId || '');
        setPassword(''); // No mostrar la contraseña actual
        setNUser(true);
    }

    const handleCancelEdit = () => {
        resetForm();
    }

    const handleDelete = async (user: User) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `¿Estás seguro de que deseas eliminar a ${user.name}? Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            await deleteUser(user.id);
            toast.success("Usuario eliminado exitosamente");
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            toast.error(error instanceof Error ? error.message : "Error al eliminar usuario");
        }
    }

    const handleSuspend = async (user: User) => {
        const result = await Swal.fire({
            title: '¿Suspender usuario?',
            text: `¿Estás seguro de que deseas suspender a ${user.name}? No podrá iniciar sesión hasta que sea reactivado.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, suspender',
            cancelButtonText: 'Cancelar',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            await suspendUser(user.id);
            toast.success("Usuario suspendido exitosamente");
        } catch (error) {
            console.error('Error al suspender usuario:', error);
            toast.error(error instanceof Error ? error.message : "Error al suspender usuario");
        }
    }

    const handleActivate = async (user: User) => {
        try {
            await activateUser(user.id);
            toast.success("Usuario reactivado exitosamente");
        } catch (error) {
            console.error('Error al reactivar usuario:', error);
            toast.error(error instanceof Error ? error.message : "Error al reactivar usuario");
        }
    }

    const userRoleToString = (role: number) => {
        return UserRole[role];
    };

        return (
            <section className="relative flex-1 flex flex-col p-6 overflow-y-auto max-h-screen h-full bg-white">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <IoPeople className="w-6 h-6 text-gray-700" />
                            <h1 className="text-2xl font-semibold text-gray-900">Personal</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setMenu(9)}
                                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                                title="Añadir nuevo usuario"
                            >
                                <span className="inline-flex items-center gap-2"><HiPlus className="w-4 h-4"/> Nuevo usuario</span>
                            </button>
                        <RefreshButton 
                            onRefresh={handleRefresh}
                            tooltip="Actualizar personal"
                            size="md"
                        />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">
                        Gestiona la información del personal, roles y permisos del sistema.
                    </p>
                </div>

                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Administradores ({admins.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {admins.map(u => (
                            <Personalview
                                key={u.id}
                                name={u.name}
                                role={UserRole[u.role]}
                                showActions={isAdmin}
                                isSuspended={u.status === 'suspended'}
                                onEdit={isAdmin ? () => handleEdit(u) : undefined}
                                onDelete={undefined}
                                onSuspend={undefined}
                                onActivate={isAdmin && u.status === 'suspended' && u.id !== currentUser?.id ? () => handleActivate(u) : undefined}
                            />
                        ))}
                    </div>
                    
                    {/* Formulario de edición */}
                    {isEditMode && editingUser && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-semibold text-gray-900">Editar Usuario</h2>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <HiX className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                                <form onSubmit={handleSubmit} className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                value={mail}
                                                onChange={(e) => setMail(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">DNI</label>
                                            <input
                                                type="number"
                                                value={dni}
                                                onChange={(e) => setDni(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña (opcional)</label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Dejar en blanco para mantener la actual"
                                            />
                                        </div>
                                        {role === 4 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Asignatura</label>
                                                <select
                                                    value={asignatura}
                                                    onChange={(e) => setAsignatura(Number(e.target.value) || '')}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Seleccionar asignatura...</option>
                                                    {Object.entries(Assignments).filter(([key]) => !isNaN(Number(key))).map(([key, name]) => (
                                                        <option key={key} value={key}>{name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {role === 3 && (
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Curso</label>
                                                {!courses || courses.length === 0 ? (
                                                    <div className="p-3 border border-yellow-300 rounded-lg bg-yellow-50">
                                                        <p className="text-sm text-yellow-800">
                                                            No hay cursos creados. Por favor crea los cursos primero en la sección "Cursos".
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={selectedCourseId || ''}
                                                        onChange={(e) => setSelectedCourseId(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="">Seleccionar curso...</option>
                                                        {sortedCourses.map(course => (
                                                            <option key={course.id} value={course.id}>
                                                                {getCourseName(course.level)} - División {course.division || ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
            </div>

                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Docentes ({teachers.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teachers.map(u => (
                        <Personalview
                            key={u.id}
                            name={u.name}
                            role={UserRole[u.role]}
                            showActions={isAdmin}
                            isSuspended={u.status === 'suspended'}
                            onEdit={isAdmin ? () => handleEdit(u) : undefined}
                            onDelete={isAdmin ? () => handleDelete(u) : undefined}
                            onSuspend={isAdmin && u.status !== 'suspended' ? () => handleSuspend(u) : undefined}
                            onActivate={isAdmin && u.status === 'suspended' ? () => handleActivate(u) : undefined}
                        />
                    ))}
                </div>
            </div>

                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Staff ({staff.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staff.map(u => (
                        <Personalview
                            key={u.id}
                            name={u.name}
                            role={UserRole[u.role]}
                            showActions={isAdmin}
                            isSuspended={u.status === 'suspended'}
                            onEdit={isAdmin ? () => handleEdit(u) : undefined}
                            onDelete={isAdmin ? () => handleDelete(u) : undefined}
                            onSuspend={isAdmin && u.status !== 'suspended' ? () => handleSuspend(u) : undefined}
                            onActivate={isAdmin && u.status === 'suspended' ? () => handleActivate(u) : undefined}
                        />
                    ))}
                </div>
            </div>

                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Estudiantes ({students.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student) => (
                        <Personalview
                            key={student.uid}
                            name={student.name}
                            role={userRoleToString(student.role)}
                            level={student.level ? getCourseName(student.level) : undefined}
                            division={student.division}
                            showActions={isAdmin}
                            isSuspended={student.status === 'suspended'}
                            onEdit={isAdmin ? () => handleEdit(student) : undefined}
                            onDelete={isAdmin ? () => handleDelete(student) : undefined}
                            onSuspend={isAdmin && student.status !== 'suspended' ? () => handleSuspend(student) : undefined}
                            onActivate={isAdmin && student.status === 'suspended' ? () => handleActivate(student) : undefined}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
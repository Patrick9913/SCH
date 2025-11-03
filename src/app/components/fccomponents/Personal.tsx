import React, { useState, useMemo } from "react";
import { Personalview } from "../reusable/PersonalView";
import { useTriskaContext } from "@/app/context/triskaContext";
import { useAuthContext } from "@/app/context/authContext";
import { useCourses } from "@/app/context/courseContext";
import { UserCurses, UserRole, Assignments, User } from "@/app/types/user";
import { IoPeople } from "react-icons/io5";
import { HiPlus, HiX, HiChevronDown, HiChevronUp } from "react-icons/hi";
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
    
    // Estados para gestión de hijos (Familia)
    const [childrenIds, setChildrenIds] = useState<string[]>([]);
    const [searchDni, setSearchDni] = useState<string>('');
    const [foundStudent, setFoundStudent] = useState<User | null>(null);
    
    // Estados para secciones desplegables
    const [showAdmins, setShowAdmins] = useState(true);
    const [showTeachers, setShowTeachers] = useState(true);
    const [showStaff, setShowStaff] = useState(true);
    const [showStudents, setShowStudents] = useState(true);
    const [showFamilies, setShowFamilies] = useState(true);
    const [showSecurity, setShowSecurity] = useState(true);

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
    const families = users.filter(u => u.role === 5)
    const security = users.filter(u => u.role === 6)

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

                // Si es familia, actualizar childrenIds
                if (role === 5) {
                    updateData.childrenIds = childrenIds;
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
        setChildrenIds([]);
        setSearchDni('');
        setFoundStudent(null);
        setNUser(false);
        setIsEditMode(false);
        setEditingUser(null);
    }

    // Funciones para gestionar hijos (Familia)
    const handleSearchStudent = () => {
        if (!searchDni || searchDni.trim() === '') {
            toast.error('Ingresa un DNI para buscar');
            return;
        }

        // Buscar estudiante por DNI
        const student = students.find(s => String(s.dni) === searchDni.trim());
        
        if (!student) {
            toast.error('No se encontró ningún estudiante con ese DNI');
            setFoundStudent(null);
            return;
        }

        // Verificar que no esté ya agregado
        if (childrenIds.includes(student.id) || childrenIds.includes(student.uid)) {
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
        setChildrenIds(prev => [...prev, studentId]);
        setSearchDni('');
        setFoundStudent(null);
        toast.success('Estudiante agregado a la familia');
    };

    const handleRemoveChild = (childId: string) => {
        setChildrenIds(prev => prev.filter(id => id !== childId));
        toast.success('Estudiante removido');
    };

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
        
        // Si es usuario Familia, cargar los hijos asociados
        if (user.role === 5) {
            if (user.childrenIds && user.childrenIds.length > 0) {
                setChildrenIds([...user.childrenIds]);
            } else if (user.childId) {
                // Compatibilidad con el sistema antiguo de un solo hijo
                setChildrenIds([user.childId]);
            } else {
                setChildrenIds([]);
            }
        } else {
            setChildrenIds([]);
        }
        
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
                    <button 
                        onClick={() => setShowAdmins(!showAdmins)}
                        className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-all group p-3 -mx-3 rounded-lg hover:bg-gray-50"
                    >
                        <span>Administradores ({admins.length})</span>
                        <div className="transition-transform group-hover:scale-110">
                            {showAdmins ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
                        </div>
                    </button>
                    {showAdmins && (
                        admins.length === 0 ? (
                            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                                <p className="text-gray-400 text-sm">No hay administradores registrados</p>
                            </div>
                        ) : (
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
                        )
                    )}
                    
                    {/* Formulario de edición */}
                    {isEditMode && editingUser && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-gray-200 bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-semibold text-gray-900">Editar Usuario</h2>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
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

                                    {/* Sección de Gestión de Hijos para usuarios Familia */}
                                    {role === 5 && (
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Estudiantes Asociados (Hijos)</h3>
                                            
                                            {/* Lista de hijos actuales */}
                                            {childrenIds.length > 0 ? (
                                                <div className="space-y-2 mb-4">
                                                    {childrenIds.map(childId => {
                                                        const child = students.find(s => s.id === childId || s.uid === childId);
                                                        if (!child) return null;
                                                        
                                                        return (
                                                            <div key={childId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                                                                        {child.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-gray-900">{child.name}</p>
                                                                        <p className="text-sm text-gray-600">
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
                                            ) : (
                                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                                                    <p className="text-gray-500 text-sm">No hay estudiantes asociados</p>
                                                </div>
                                            )}

                                            {/* Buscar y agregar nuevo hijo por DNI */}
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={searchDni}
                                                        onChange={(e) => setSearchDni(e.target.value)}
                                                        placeholder="Ingrese DNI del estudiante..."
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                                    <p className="font-medium text-gray-900">{foundStudent.name}</p>
                                                                    <p className="text-sm text-gray-600">
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
                                        </div>
                                    )}
                                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 mt-6 rounded-b-xl">
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium text-sm"
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
                    <button 
                        onClick={() => setShowTeachers(!showTeachers)}
                        className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-all group p-3 -mx-3 rounded-lg hover:bg-gray-50"
                    >
                        <span>Docentes ({teachers.length})</span>
                        <div className="transition-transform group-hover:scale-110">
                            {showTeachers ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
                        </div>
                    </button>
                    {showTeachers && (
                        teachers.length === 0 ? (
                            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                                <p className="text-gray-400 text-sm">No hay docentes registrados</p>
                            </div>
                        ) : (
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
                        )
                    )}
            </div>

                <div className="mb-8">
                    <button 
                        onClick={() => setShowStaff(!showStaff)}
                        className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-all group p-3 -mx-3 rounded-lg hover:bg-gray-50"
                    >
                        <span>Staff ({staff.length})</span>
                        <div className="transition-transform group-hover:scale-110">
                            {showStaff ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
                        </div>
                    </button>
                    {showStaff && (
                        staff.length === 0 ? (
                            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                                <p className="text-gray-400 text-sm">No hay miembros del staff registrados</p>
                            </div>
                        ) : (
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
                        )
                    )}
            </div>

                <div className="mb-8">
                    <button 
                        onClick={() => setShowStudents(!showStudents)}
                        className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-all group p-3 -mx-3 rounded-lg hover:bg-gray-50"
                    >
                        <span>Estudiantes ({students.length})</span>
                        <div className="transition-transform group-hover:scale-110">
                            {showStudents ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
                        </div>
                    </button>
                    {showStudents && (
                        students.length === 0 ? (
                            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                                <p className="text-gray-400 text-sm">No hay estudiantes registrados</p>
                            </div>
                        ) : (
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
                        )
                    )}
            </div>

                <div className="mb-8">
                    <button 
                        onClick={() => setShowFamilies(!showFamilies)}
                        className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-all group p-3 -mx-3 rounded-lg hover:bg-gray-50"
                    >
                        <span>Familias ({families.length})</span>
                        <div className="transition-transform group-hover:scale-110">
                            {showFamilies ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
                        </div>
                    </button>
                    {showFamilies && (
                        families.length === 0 ? (
                            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                                <p className="text-gray-400 text-sm">No hay familias registradas</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {families.map(u => (
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
                        )
                    )}
            </div>

                <div className="mb-8">
                    <button 
                        onClick={() => setShowSecurity(!showSecurity)}
                        className="w-full flex items-center justify-between text-lg font-medium text-gray-900 mb-4 hover:text-gray-700 transition-all group p-3 -mx-3 rounded-lg hover:bg-gray-50"
                    >
                        <span>Seguridad ({security.length})</span>
                        <div className="transition-transform group-hover:scale-110">
                            {showSecurity ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
                        </div>
                    </button>
                    {showSecurity && (
                        security.length === 0 ? (
                            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                                <p className="text-gray-400 text-sm">No hay personal de seguridad registrado</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {security.map(u => (
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
                        )
                    )}
            </div>
        </section>
    )
}
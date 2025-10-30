import React, { useState } from "react";
import { Personalview } from "../reusable/PersonalView";
import { useTriskaContext } from "@/app/context/triskaContext";
import { useAuthContext } from "@/app/context/authContext";
import { UserCurses, UserRole, Assignments, User } from "@/app/types/user";
import { IoPeople } from "react-icons/io5";
import { HiPlus } from "react-icons/hi";
import { RefreshButton } from "../reusable/RefreshButton";
import toast from "react-hot-toast";
import Swal from 'sweetalert2';

export const Personal: React.FC = () => {
    const { users, firstName, dni, mail, role, nUser, setNUser, setFirstName, setDni, setMail, setRole, newUser, updateUser, deleteUser, suspendUser, activateUser, password, setPassword, refreshUsers, setMenu } = useTriskaContext();
    const { user: currentUser } = useAuthContext();
    const isAdmin = currentUser?.role === 1;

    // Estados adicionales para campos específicos
    const [asignatura, setAsignatura] = useState<number | ''>('');
    const [curso, setCurso] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

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

        if (role === 3 && !curso) { // Estudiante
            toast.error("Por favor selecciona un curso para el estudiante");
            setIsLoading(false);
            return;
        }
        
        try {
            if (isEditMode && editingUser) {
                // Modo edición
                await updateUser(editingUser.id, {
                    firstName,
                    mail,
                    dni: Number(dni),
                    role,
                    ...(password && { password }),
                    ...(asignatura && { asignatura }),
                    ...(curso && { curso })
                });
                toast.success("Usuario actualizado exitosamente");
                handleCancelEdit();
            } else {
                // Modo creación
            await newUser({
                    firstName,
                    mail,
            dni: Number(dni),
                    role,
                    password: password!,
                    ...(asignatura && { asignatura }),
                    ...(curso && { curso })
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
        setCurso('');
        setNUser(false);
        setIsEditMode(false);
        setEditingUser(null);
    }

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsEditMode(true);
        setFirstName(user.name);
        setMail(user.mail || '');
        setDni(String(user.dni || ''));
        setRole(user.role);
        setAsignatura(user.asig || '');
        setCurso(user.level || '');
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

    const getCourseName = (level: number) => {
        return Object.keys(UserCurses).find(
            key => UserCurses[key as keyof typeof UserCurses] === level
        ) as keyof typeof UserCurses | undefined;
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
                    
                    {/* Formulario modal removido: ahora la creación se hace en UserCreator */}
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
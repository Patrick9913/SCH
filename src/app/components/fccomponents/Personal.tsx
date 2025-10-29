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
    const { users, firstName, dni, mail, role, nUser, setNUser, setFirstName, setDni, setMail, setRole, newUser, updateUser, deleteUser, suspendUser, activateUser, password, setPassword, refreshUsers } = useTriskaContext();
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

        return (
            <section className="relative flex-1 flex flex-col p-6 overflow-y-auto max-h-screen h-full bg-white">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <IoPeople className="w-6 h-6 text-gray-700" />
                            <h1 className="text-2xl font-semibold text-gray-900">Personal</h1>
                        </div>
                        <RefreshButton 
                            onRefresh={handleRefresh}
                            tooltip="Actualizar personal"
                            size="md"
                        />
                    </div>
                    <p className="text-sm text-gray-500">
                        Gestiona la información del personal, roles y permisos del sistema.
                    </p>
                </div>

                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Administradores ({admins.length})</h2>
                <div className="flex items-start gap-x-5">
                    <div className="flex justify-start gap-x-5">
                        {admins.map(u => (
                            <Personalview
                                key={u.id}
                                name={u.name}
                                role={UserRole[u.role]}
                                showActions={isAdmin}
                                isSuspended={u.status === 'suspended'}
                                onEdit={isAdmin ? () => handleEdit(u) : undefined}
                                onDelete={undefined} // Los administradores no pueden eliminarse entre sí
                                onSuspend={undefined} // Los administradores no pueden suspenderse entre sí
                                onActivate={isAdmin && u.status === 'suspended' && u.id !== currentUser?.id ? () => handleActivate(u) : undefined}
                            />
                        ))}
                    </div>
                    <button 
                        onClick={() => setNUser(!nUser)} 
                        className="cursor-pointer group w-16 h-16 rounded-full flex justify-center items-center bg-cyan-950 hover:bg-cyan-900 transition-colors"
                    >
                        <HiPlus className="group text-white w-6 h-6" />
                    </button>
                    {nUser && (
                            <div className="z-40 backdrop-blur-md top-0 left-0 absolute w-full flex justify-center items-center flex-col p-5 overflow-y-scroll h-full bg-black/60 rounded-md">
                            <form onSubmit={handleSubmit} className="rounded-md w-96 gap-y-4 h-auto flex flex-col justify-between p-6 bg-white shadow-lg">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                                    {isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                                </h3>
                                
                                <div className="flex flex-col gap-y-2">
                                    <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
                                    <input 
                                        value={firstName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} 
                                        className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                        type="text" 
                                        placeholder="Ej: Juan Pérez"
                                        required
                                    />
                                    </div>
                                
                                <div className="flex flex-col gap-y-2">
                                    <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
                                    <input 
                                        value={mail}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMail(e.target.value)} 
                                        className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                        type="email" 
                                        placeholder="ejemplo@escuela.com"
                                        required
                                    />
                                    </div>
                                
                                <div className="flex flex-col gap-y-2">
                                    <label className="text-sm font-medium text-gray-700">DNI</label>
                                    <input 
                                        value={dni}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDni(e.target.value)} 
                                        className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                        type="number" 
                                        placeholder="12345678"
                                        required
                                    />
                                    </div>
                                
                                <div className="flex flex-col gap-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Contraseña {isEditMode && <span className="text-gray-500 text-xs">(dejar vacío para mantener la actual)</span>}
                                    </label>
                                    <input 
                                        value={password}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} 
                                        className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                        type="password" 
                                        placeholder={isEditMode ? "Dejar vacío para mantener" : "Mínimo 6 caracteres"}
                                        required={!isEditMode}
                                    />
                                    </div>
                                
                                <div className="flex flex-col gap-y-2">
                                    <label className="text-sm font-medium text-gray-700">Rol</label>
                                    <select 
                                        value={role} 
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                            setRole(Number(e.target.value));
                                            // Resetear campos específicos al cambiar rol
                                            setAsignatura('');
                                            setCurso('');
                                        }} 
                                        className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                        required
                                    >
                                        <option value={0} disabled>Seleccionar rol...</option>
                                            <option value={1}>Administrador</option>
                                            <option value={2}>Staff</option>
                                            <option value={3}>Estudiante</option>
                                            <option value={4}>Docente</option>
                                            <option value={5}>Familia</option>
                                        </select>
                                    </div>

                                {/* Campo específico para docentes */}
                                {role === 4 && (
                                    <div className="flex flex-col gap-y-2">
                                        <label className="text-sm font-medium text-gray-700">Asignatura</label>
                                        <select 
                                            value={asignatura} 
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAsignatura(Number(e.target.value))} 
                                            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                            required
                                        >
                                            <option value="" disabled>Seleccionar asignatura...</option>
                                            {Object.entries(Assignments)
                                                .filter(([key]) => !isNaN(Number(key)))
                                                .map(([key, name]) => (
                                                    <option key={key} value={key}>{name}</option>
                                                ))}
                                        </select>
                                    </div>
                                )}

                                {/* Campo específico para estudiantes */}
                                {role === 3 && (
                                    <div className="flex flex-col gap-y-2">
                                        <label className="text-sm font-medium text-gray-700">Curso</label>
                                        <select 
                                            value={curso} 
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurso(Number(e.target.value))} 
                                            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                            required
                                        >
                                            <option value="" disabled>Seleccionar curso...</option>
                                            {Object.entries(UserCurses)
                                                .filter(([key]) => !isNaN(Number(key)))
                                                .map(([key, name]) => (
                                                    <option key={key} value={key}>{name}</option>
                                                ))}
                                        </select>
                                    </div>
                                )}
                                
                                <div className="flex gap-3 pt-4">
                                    <button 
                                        type="button" 
                                        onClick={isEditMode ? handleCancelEdit : resetForm}
                                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isLoading ? (isEditMode ? 'Actualizando...' : 'Creando...') : (isEditMode ? 'Actualizar Usuario' : 'Crear Usuario')}
                                    </button>
                                </div>
                                </form>
                            </div>
                    )}
                </div>
            </div>

                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Docentes ({teachers.length})</h2>
                <div className="flex justify-start gap-x-5 flex-wrap">
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
                <div className="flex justify-start gap-x-5 flex-wrap">
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
                <div className="flex justify-start gap-x-5 flex-wrap">
                    {students.map(u => (
                        <Personalview
                            key={u.id}
                            name={u.name}
                            role={UserRole[u.role]}
                            level={u.level ? (Object.keys(UserCurses).find(
                              key => UserCurses[key as keyof typeof UserCurses] === u.level
                            ) as keyof typeof UserCurses | undefined) || String(u.level) : undefined}
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
        </section>
    )
}
import React, { useState } from "react";
import { Personalview } from "../reusable/PersonalView";
import { useTriskaContext } from "@/app/context/triskaContext";
import { UserCurses, UserRole, Assignments } from "@/app/types/user";
import { IoPeople } from "react-icons/io5";
import { HiPlus } from "react-icons/hi";
import { RefreshButton } from "../reusable/RefreshButton";

export const Personal: React.FC = () => {
    const { users, firstName, dni, mail, role, nUser, setNUser, setFirstName, setDni, setMail, setRole, newUser, password, setPassword, refreshUsers } = useTriskaContext();

    // Estados adicionales para campos específicos
    const [asignatura, setAsignatura] = useState<number | ''>('');
    const [curso, setCurso] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState(false);

    const admins = users.filter(u => u.role === 1)
    const teachers = users.filter(u => u.role === 4)
    const students = users.filter(u => u.role === 3)
    const staff = users.filter(u => u.role === 2)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true);

        if (!firstName || !mail || !dni || !role || !password) {
            console.log("Faltan Datos")
            alert("Por favor completa todos los campos");
            setIsLoading(false);
            return;
        }

        // Validaciones específicas por rol
        if (role === 4 && !asignatura) { // Docente
            alert("Por favor selecciona una asignatura para el docente");
            setIsLoading(false);
            return;
        }

        if (role === 3 && !curso) { // Estudiante
            alert("Por favor selecciona un curso para el estudiante");
            setIsLoading(false);
            return;
        }
        
        try {
        // Llamar a newUser con el objeto completo
            await newUser({
            firstName: firstName,
            mail: mail,
            dni: Number(dni),
            role: role,
                password: password,
                ...(asignatura && { asignatura: asignatura }),
                ...(curso && { curso: curso })
            });
            
            // Resetear campos específicos
            setAsignatura('');
            setCurso('');
        } catch (error) {
            console.error('Error al crear usuario:', error);
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
    }

    return (
        <section className="relative flex-1 flex flex-col p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800">
                        <IoPeople className="w-10 h-10" />
                        <span>Personal</span>
                    </div>
                    <RefreshButton 
                        onRefresh={handleRefresh}
                        tooltip="Actualizar personal"
                        size="md"
                    />
                </div>
                <p className="mb-6 text-gray-600">
                Desde este panel puedes gestionar la información del personal, supervisar tareas, 
                y administrar roles y permisos dentro del sistema.
                </p>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-8">Administradores ({admins.length})</h2>
                <div className="flex items-start gap-x-5">
                    <div className="flex justify-start gap-x-5">
                        {admins.map(u => (
                            <Personalview
                                key={u.id}
                                name={u.name}
                                role={UserRole[u.role]}
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
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">Crear Nuevo Usuario</h3>
                                
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
                                    <label className="text-sm font-medium text-gray-700">Contraseña</label>
                                    <input 
                                        value={password}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} 
                                        className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                        type="password" 
                                        placeholder="Mínimo 6 caracteres"
                                        required
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
                                        onClick={resetForm}
                                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isLoading ? 'Creando...' : 'Crear Usuario'}
                                    </button>
                                </div>
                                </form>
                            </div>
                    )}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-8">Docentes ({teachers.length})</h2>
                <div className="flex justify-start gap-x-5 flex-wrap">
                    {teachers.map(u => (
                        <Personalview
                            key={u.id}
                            name={u.name}
                            role={UserRole[u.role]}
                        />
                    ))}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-8">Staff ({staff.length})</h2>
                <div className="flex justify-start gap-x-5 flex-wrap">
                    {staff.map(u => (
                            <Personalview
                                key={u.id}
                                name={u.name}
                                role={UserRole[u.role]}
                            />
                    ))}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-8">Estudiantes ({students.length})</h2>
                <div className="flex justify-start gap-x-5 flex-wrap">
                    {students.map(u => (
                            <Personalview
                                key={u.id}
                                name={u.name}
                                role={UserRole[u.role]}
                                level={u.level && UserCurses[u.level]}
                            />
                    ))}
                </div>
            </div>
        </section>
    )
}
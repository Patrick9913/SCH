import React from "react";
import { Personalview } from "../reusable/PersonalView";
import { useTriskaContext } from "@/app/context/triskaContext";
import { UserCurses, UserRole } from "@/app/types/user";
import { IoPeople } from "react-icons/io5";
import { IoDuplicate } from "react-icons/io5";

export const Personal: React.FC = () => {

    const { users, firstName, dni, mail, role, nUser, setNUser, setFirstName, setDni, setMail, setRole, newUser, password, setPassword } = useTriskaContext();

    const admins = users.filter( u => u.role === 1)
    const teachers = users.filter(u => u.role === 4)
    const students = users.filter( u => u.role === 3)

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!firstName || !mail || !dni || !role || !password) {
            console.log("Faltan Datos")
            return;
        }
        newUser(mail, password)  
    }

    return (
        <section className=" relative flex-1 flex flex-col p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
            <div>
                <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800 mb-2">
                    <IoPeople className=" w-10 h-10" />
                    <span>Personal</span>
                </div>
                <p className="mb-6 text-gray-600">
                Desde este panel puedes gestionar la información del personal, supervisar tareas, 
                y administrar roles y permisos dentro del sistema.
                </p>
            </div>
            <div className=" mb-8">
                <h2 className=" text-2xl font-semibold mb-8">Administradores</h2>
                <div className=" flex items-start gap-x-5">
                    <div className=" flex justify-start gap-x-5">
                    {
                        admins.map( u => (
                            <Personalview
                                key={u.id}
                                name={u.name}
                                role={UserRole[u.role]}
                            />
                        ))
                        }
                    </div>
                    <button onClick={() => setNUser(!nUser)} className=" cursor-pointer group w-16 h-16 rounded-full flex justify-center items-center bg-cyan-950">
                        <IoDuplicate className=" group text-white w-6 h-6 " />
                    </button>
                    {
                        nUser && (
                            <div className="z-40 backdrop-blur-md top-0 left-0 absolute w-full flex justify-center items-center flex-col p-5 overflow-y-scroll h-full bg-black/60 rounded-md">
                                <form onSubmit={handleSubmit} className=" rounded-md w-96 gap-y-4 h-auto flex flex-col justify-between p-3
                                 bg-white shadow">
                                    <div className=" flex flex-col gap-y-2">
                                        <label htmlFor="">Nombre</label>
                                        <input onChange={(e: React.ChangeEvent<HTMLInputElement> ) => setFirstName(e.target.value)} className=" p-2 shadow" type="text" />
                                    </div>
                                    <div className=" flex flex-col gap-y-2">
                                        <label htmlFor="">Correo</label>
                                        <input onChange={(e: React.ChangeEvent<HTMLInputElement> ) => setMail(e.target.value)} className=" p-2 shadow" type="text" />
                                    </div>
                                    <div className=" flex flex-col gap-y-2">
                                        <label htmlFor="">Contraseña</label>
                                        <input onChange={(e: React.ChangeEvent<HTMLInputElement> ) => setPassword(e.target.value)} className=" p-2 shadow" type="text" />
                                    </div>
                                    <div className=" flex flex-col gap-y-2">
                                        <label htmlFor="">DNI</label>
                                        <input onChange={(e: React.ChangeEvent<HTMLInputElement> ) => setDni((e.target.value))} className=" p-2 shadow" type="text" />
                                    </div>
                                    <div className=" flex flex-col gap-y-2">
                                        <label htmlFor="">Rol</label>
                                        <select onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(Number(e.target.value))} className=" p-2 shadow" name="" id="">
                                            <option selected disabled value="roles">Roles</option>
                                            <option value={1}>Administrador</option>
                                            <option value={2}>Staff</option>
                                            <option value={3}>Estudiante</option>
                                            <option value={4}>Docente</option>
                                            <option value={5}>Familia</option>
                                        </select>
                                    </div>
                                    <button type="submit" className=" rounded-md bg-blue-500 w-full text-white px-6 py-3">Enviar</button>
                                </form>
                            </div>
                        )
                    }
                </div>
            </div>
            <div className=" mb-8">
                <h2 className="text-2xl font-semibold mb-8">Docentes</h2>
                <div className=" flex justify-start gap-x-5">
                    {
                        teachers.map( u => (
                            <Personalview
                                key={u.id}
                                name={u.name}
                                role={UserRole[u.role]}
                            />
                        ))
                    }
                </div>
            </div>
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-8">Alumnos</h2>
                <div className=" flex justify-start gap-x-5">
                    {
                        students.map( u => (
                            <Personalview
                                key={u.id}
                                name={u.name}
                                role={UserRole[u.role]}
                                level={u.level && UserCurses[u.level]}
                            />
                        ))
                    }
                </div>
            </div>
        </section>
    )
}
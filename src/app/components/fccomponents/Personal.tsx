import React from "react";
import { Personalview } from "../reusable/PersonalView";
import { useTriskaContext } from "@/app/context/triskaContext";
import { UserCurses, UserRole } from "@/app/types/user";
import { IoPeople } from "react-icons/io5";

export const Personal: React.FC = () => {

    const { users } = useTriskaContext();

    const admins = users.filter( u => u.role === 1)
    const teachers = users.filter(u => u.role === 4)
    const students = users.filter( u => u.role === 3)

    return (
        <section className="flex-1 flex flex-col p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
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
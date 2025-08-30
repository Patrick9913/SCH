import { useAuthContext } from "@/app/context/authContext";
import { useTriskaContext } from "@/app/context/triskaContext";
import { Assignments, UserCurses} from "@/app/types/user";
import { HiHome } from "react-icons/hi";

import React from "react";

export const Home: React.FC = () => {

    const { user} = useAuthContext()
    const { users} = useTriskaContext()

    const students = users.filter( s => s.role === 3)
    const teachers = users.filter( t => t.role === 4)

    return (
            <section className=" flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
                <div>
                    <div>
                        <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800 mb-2">
                            <HiHome className=" w-10 h-10" />
                            <span>Campus Virtual</span>
                        </div>
                        <p className="mb-6 text-gray-600">
                        Desde este panel puedes modificar las configuraciones del sistema, ajustar preferencias y 
                        administrar opciones avanzadas.
                        </p>
                    </div>
                {/* Avisos */}
                <div className="bg-gray-100 p-4 rounded-lg border-l-4 border-blue-400 mb-8">
                    <h2 className="text-xl font-semibold text-blue-700 mb-2">Avisos Importantes</h2>
                    <ul className="list-disc pl-6 text-gray-700">
                    <li>Inscripciones abiertas hasta el 31 de agosto.</li>
                    <li>Entrega de boletas: 20 de septiembre.</li>
                    <li>Reunión de padres de familia: 5 de septiembre a las 18:00 hrs.</li>
                    </ul>
                </div>
                {/* Resumen rápido */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {
                        user?.role == 1 && (
                            <>
                                <button className="bg-blue-100 p-4 rounded-lg shadow flex flex-col items-start">
                                    <h2 className="text-xl font-semibold text-blue-800">Alumnos</h2>
                                    <p className="text-3xl font-bold">{students.length}</p>
                                    <p className="text-sm text-blue-700">Matriculados este ciclo</p>
                                </button>
                                <div className="bg-green-100 p-4 rounded-lg shadow">
                                    <h2 className="text-xl font-semibold text-green-800">Profesores</h2>
                                    <p className="text-3xl font-bold">{teachers.length}</p>
                                    <p className="text-sm text-green-700">Activos</p>
                                </div>
                            </>
                        )
                    }
                    
                    <div className="bg-yellow-100 p-4 rounded-lg shadow">
                    <h2 className="text-xl font-semibold text-yellow-800">Materias</h2>
                    <p className="text-3xl font-bold">15</p>
                    <p className="text-sm text-yellow-700">Ofertadas este semestre</p>
                    </div>
                </div>
                    {
                        user?.role == 1 && (
                            <>
                                {/* Tabla de profesores */}
                                <div className="mb-8">
                                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Lista de Profesores</h2>
                                    <div className=" p-2 rounded shadow">
                                        {
                                            teachers.map( s => (
                                                <div key={s.id} className=" flex justify-start items-center gap-x-10 hover:bg-gray-200 hover:rounded p-2">
                                                    <span className=" text-sm font-semibold">{s.name}</span>|
                                                    <a className=" hover:underline text-sm" href={`mailto:${s.mail}`}>{s.mail}</a>|
                                                    <span>{s.dni}</span>|
                                                    <span>{s.asig && Assignments[s.asig]}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                                {/* Tabla de alumnos */}
                                <div className="mb-8">
                                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Lista de Alumnos</h2>
                                    <div className=" p-2 rounded shadow">
                                        {
                                            students.map( s => (
                                                <div key={s.id} className=" flex justify-start items-center gap-x-10 hover:bg-gray-200 hover:rounded p-2">
                                                    <span className=" text-sm font-semibold">{s.name}</span>|
                                                    <a className=" hover:underline text-sm" href={`mailto:${s.mail}`}>{s.mail}</a>|
                                                    <span className=" text-sm">{s.dni}</span>|
                                                    <span className="font-extrabold w-fit text-sm">{s.level && UserCurses[s.level]}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </>
                        )
                    }
                </div>
            </section>
    )
}
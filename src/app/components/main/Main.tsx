'use client';

import { useAuthContext } from "@/app/context/authContext";
import { UserCurses, UserRole } from "@/app/types/user";
import React from "react";
import { IoPeople } from "react-icons/io5";
import { FaBuildingColumns } from "react-icons/fa6";
import { useTriskaContext } from "@/app/context/triskaContext";
import { HiMail } from "react-icons/hi";
import { IoCalendarClear } from "react-icons/io5";
import { HiBookOpen } from "react-icons/hi";
import { HiCog } from "react-icons/hi";
import { HiHome } from "react-icons/hi";

export const Main: React.FC = () => {

    const { logout, uid, user } = useAuthContext();
    const { users } = useTriskaContext();

    const students = users.filter( s => s.role === 3)
    const teachers = users.filter( t => t.role === 4)
    

    return (
        <div className="min-h-screen h-screen w-screen p-2">
            <div className=" w-full h-full gap-x-3 flex">
                <aside className=" w-full flex-1 max-w-2xs bg-white rounded-md flex flex-col justify-between">
                <div className="p-5">
                <ul className="space-y-3">
                    {/* Opciones para ADMIN (role === 1) */}
                    {user?.role === 1 && (
                        <>
                            <li>
                                <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiHome className="w-5 h-5" />
                                    <span>Inicio</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <IoPeople    className="w-5 h-5" />
                                    <span>Personal</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiCog className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Ajustes</span>
                                </a>
                            </li>
                        </>
                    )}
                    {/* Opciones para ESTUDIANTE (role === 3) */}
                    {user?.role === 3 && (
                        <>
                            <li>
                                <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiBookOpen className="w-5 h-5" />
                                    <span>Mi Boletín</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <IoCalendarClear className="w-5 h-5" />
                                    <span>Mis horarios</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiCog className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Ajustes</span>
                                </a>
                            </li>
                        </>
                    )}
                    {/* Opciones comunes para todos */}
                    <li>
                        <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2">
                            <HiMail className="w-5 h-5" />
                            <span className=" text-sm">Comunicación</span>
                        </a>
                    </li>
                </ul>
                </div>
                <div className="*:text-sm flex flex-col gap-y-2 p-5 items-start">
                    {
                        user?.name && user.role && (
                            <div className="">
                                <span>{user?.name}</span> - <span className=" text-blue-600">{UserRole[user?.role]}</span>
                            </div>
                        )
                    }
                    <button className=" hover:underline hover:underline-offset-2" onClick={logout}>Cerrar Sesión</button>
                    <p className="text-gray-500 ">
                        © 2025 Your Company. All rights reserved.
                    </p>
                </div>
            </aside>
            <section className=" flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
                <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Campus Virtual - Margarita</h1>
                <p className="mb-6 text-gray-600">
                    Bienvenido al panel principal del sistema de gestión escolar. Aquí puedes visualizar información relevante de alumnos, profesores y materias.
                </p>
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
                            {/* Tabla de alumnos */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Lista de Profesores</h2>
                                <div className=" p-2 rounded shadow">
                                    {
                                        teachers.map( s => (
                                            <div className=" flex justify-start items-center gap-x-10 hover:bg-gray-50 p-2">
                                                <span className="">{s.name}</span>
                                                <a className=" hover:underline" href={`mailto:${s.mail}`}>{s.mail}</a>
                                                <span className=" ">{UserRole[s.role]}</span>
                                                {
                                                    s.level &&<span className="  p-2 rounded bg-emerald-500 text-white w-fit">{UserCurses[s.level]}</span>
                                                }
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                            {/* Tabla de Profesores */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Lista de Alumnos</h2>
                                <div className=" p-2 rounded shadow">
                                    {
                                        students.map( s => (
                                            <div className=" flex justify-start items-center gap-x-10 hover:bg-gray-50 p-2">
                                                <span className="">{s.name}</span>
                                                <a className=" hover:underline" href={`mailto:${s.mail}`}>{s.mail}</a>
                                                <span className=" ">{UserRole[s.role]}</span>
                                                <span className="  p-2 rounded bg-emerald-500 text-white w-fit">{s.level && UserCurses[s.level]}</span>
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
            </div>
        </div>
    )
}
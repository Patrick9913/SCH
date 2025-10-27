'use client';

import { useAuthContext } from "@/app/context/authContext";
import React from "react";
import { IoPeople } from "react-icons/io5";
import { useTriskaContext } from "@/app/context/triskaContext";
import { HiMail } from "react-icons/hi";
import { IoCalendarClear } from "react-icons/io5";
import { HiBookOpen } from "react-icons/hi";
import { HiCog } from "react-icons/hi";
import { HiHome } from "react-icons/hi";
import { HiDocumentCheck } from "react-icons/hi2";
import { HiChatBubbleOvalLeft } from "react-icons/hi2";
import { HiChartBar, HiDocumentText, HiClipboardList } from "react-icons/hi";
import { UserRole } from "@/app/types/user";

export const Navbar: React.FC = () => {

    const { user, logout } = useAuthContext();
    const { setMenu} = useTriskaContext();
    
    return (
        <aside className=" w-full flex-1 max-w-2xs bg-white rounded-md flex flex-col justify-between">
            <div className="p-5">
                <ul className="space-y-3">
                    {/* Opciones para ADMIN (role === 1) */}
                    {user?.role === 1 && (
                        <>
                            <li>
                                <button onClick={() => setMenu(1)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiHome className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(3)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <IoPeople className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Personal</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(5)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiDocumentCheck className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Asistencias</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(6)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiChartBar className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Calificaciones</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(2)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiCog className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Ajustes</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones para ESTUDIANTE (role === 3) */}
                    {user?.role === 3 && (
                        <>
                            <li>
                                <button onClick={() => setMenu(1)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiHome className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(8)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <IoCalendarClear className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Mis horarios</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(5)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiDocumentCheck className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Asistencias</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(9)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiClipboardList className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Tareas</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(6)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiChartBar className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Calificaciones</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(2)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiCog className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Ajustes</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones para DOCENTE (role === 4) */}
                    {user?.role === 4 && (
                        <>
                            <li>
                                <button onClick={() => setMenu(1)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiHome className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(5)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiDocumentCheck className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Asistencias</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(8)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <IoCalendarClear className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Horarios</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(9)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiClipboardList className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Tareas</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(6)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiChartBar className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Calificaciones</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(2)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiCog className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Ajustes</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones para STAFF (role === 2) */}
                    {user?.role === 2 && (
                        <>
                            <li>
                                <button onClick={() => setMenu(1)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiHome className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(5)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiDocumentCheck className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Asistencias</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(8)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <IoCalendarClear className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Horarios</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(9)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiClipboardList className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Tareas</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(6)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiChartBar className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Calificaciones</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setMenu(2)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <HiCog className="group-hover:text-orange-500 w-5 h-5" />
                                    <span className="group-hover:text-orange-800">Ajustes</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones comunes para todos */}
                    <li>
                        <button onClick={() => setMenu(4)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                            <HiChatBubbleOvalLeft className="w-5 h-5" />
                            <span>Mensajes</span>
                        </button>
                    </li>
                    <li>
                        <button onClick={() => setMenu(7)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                            <HiDocumentText className="group-hover:text-orange-500 w-5 h-5" />
                            <span className="group-hover:text-orange-800">Boletines</span>
                        </button>
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
    )
}
'use client';

import { useAuthContext } from "@/app/context/authContext";
import { Assignments, UserCurses, UserRole } from "@/app/types/user";
import React from "react";
import { IoPeople } from "react-icons/io5";
import { useTriskaContext } from "@/app/context/triskaContext";
import { HiMail } from "react-icons/hi";
import { IoCalendarClear } from "react-icons/io5";
import { HiBookOpen } from "react-icons/hi";
import { HiCog } from "react-icons/hi";
import { HiHome } from "react-icons/hi";
import { Settings } from "../fccomponents/Settings";
import { Personal } from "../fccomponents/Personal";
import { HiDocumentCheck } from "react-icons/hi2";
import { Home } from "../fccomponents/Home"

export const Main: React.FC = () => {

    const { logout, uid, user } = useAuthContext();
    const { users, menu, setMenu } = useTriskaContext();

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
                                    <button onClick={() => setMenu(1)} className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                        <HiDocumentCheck className="group-hover:text-orange-500 w-5 h-5" />
                                        <span className="group-hover:text-orange-800">Inasistencias</span>
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
                {
                    menu == 1 && (
                        <Home />
                    )
                }
                {
                    menu == 2 && (
                        <Settings />
                    )
                }
                {
                    menu == 3 && (
                        <Personal />
                    )
                }
            </div>
        </div>
    )
}
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
import { HiChartBar, HiDocumentText, HiAcademicCap, HiShieldCheck, HiClipboardList } from "react-icons/hi";
import { UserRole } from "@/app/types/user";

export const Navbar: React.FC = () => {

    const { user, logout } = useAuthContext();
    const { setMenu} = useTriskaContext();
    
    return (
        <aside className="w-full flex-1 max-w-xs bg-white border-r border-gray-200 flex flex-col justify-between">
            <div className="p-4">
                <ul className="space-y-1">
                    {/* Opciones para ADMIN (role === 1) */}
                    {user?.role === 1 && (
                        <>
                            <li>
                                <button 
                                    onClick={() => setMenu(1)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiHome className="w-5 h-5" />
                                    <span>Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(3)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <IoPeople className="w-5 h-5" />
                                    <span>Personal</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(5)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiDocumentCheck className="w-5 h-5" />
                                    <span>Asistencias</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(6)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiChartBar className="w-5 h-5" />
                                    <span>Calificaciones</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(4)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiChatBubbleOvalLeft className="w-5 h-5" />
                                    <span>Mensajes</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(7)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiDocumentText className="w-5 h-5" />
                                    <span>Boletines</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(2)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiBookOpen className="w-5 h-5" />
                                    <span>Materias</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(8)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <IoCalendarClear className="w-5 h-5" />
                                    <span>Horarios</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(13)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiAcademicCap className="w-5 h-5" />
                                    <span>Cursos</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones para ESTUDIANTE (role === 3) */}
                    {user?.role === 3 && (
                        <>
                            <li>
                                <button 
                                    onClick={() => setMenu(1)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiHome className="w-5 h-5" />
                                    <span>Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(2)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiBookOpen className="w-5 h-5" />
                                    <span>Materias</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(5)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiDocumentCheck className="w-5 h-5" />
                                    <span>Asistencias</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(7)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiDocumentText className="w-5 h-5" />
                                    <span>Boletines</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones para DOCENTE (role === 4) */}
                    {user?.role === 4 && (
                        <>
                            <li>
                                <button 
                                    onClick={() => setMenu(1)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiHome className="w-5 h-5" />
                                    <span>Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(10)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <IoPeople className="w-5 h-5" />
                                    <span>Mis Alumnos</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(5)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiDocumentCheck className="w-5 h-5" />
                                    <span>Asistencias</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(6)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiChartBar className="w-5 h-5" />
                                    <span>Calificaciones</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones para STAFF/PRECEPTOR (role === 2) */}
                    {user?.role === 2 && (
                        <>
                            <li>
                                <button 
                                    onClick={() => setMenu(1)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiHome className="w-5 h-5" />
                                    <span>Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(12)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiBookOpen className="w-5 h-5" />
                                    <span>Mis Cursos</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(5)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiDocumentCheck className="w-5 h-5" />
                                    <span>Asistencias</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones para FAMILIA (role === 5) */}
                    {user?.role === 5 && (
                        <>
                            <li>
                                <button 
                                    onClick={() => setMenu(1)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiHome className="w-5 h-5" />
                                    <span>Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(7)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiDocumentText className="w-5 h-5" />
                                    <span>Boletines</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(5)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiDocumentCheck className="w-5 h-5" />
                                    <span>Asistencias</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(4)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiChatBubbleOvalLeft className="w-5 h-5" />
                                    <span>Mensajes</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(14)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiShieldCheck className="w-5 h-5" />
                                    <span>Retiros Anticipados</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones para SEGURIDAD (role === 6) */}
                    {user?.role === 6 && (
                        <>
                            <li>
                                <button 
                                    onClick={() => setMenu(1)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiHome className="w-5 h-5" />
                                    <span>Inicio</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(15)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiShieldCheck className="w-5 h-5" />
                                    <span>Validar Retiros</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setMenu(16)} 
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                >
                                    <HiClipboardList className="w-5 h-5" />
                                    <span>Historial de Retiros</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Opciones comunes para todos */}
                    
                    
                </ul>
            </div>
            <div className="p-4 border-t border-gray-200">
                {user?.name && user.role && (
                    <div className="mb-3">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{UserRole[user.role]}</p>
                    </div>
                )}
                <button 
                    className="text-sm text-gray-600 hover:text-gray-900 mb-2" 
                    onClick={logout}
                >
                    Cerrar Sesión
                </button>
                <p className="text-xs text-gray-400">
                    © 2025
                </p>
            </div>
        </aside>
    )
}
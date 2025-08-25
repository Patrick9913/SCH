'use client';

import { useAuthContext } from "@/app/context/authContext";
import { useTriskaContext } from "@/app/context/triskaContext";
import { UserRole } from "@/app/types/user";
import React from "react";
import { GoHomeFill } from "react-icons/go";

export const Main: React.FC = () => {

    const { users } = useTriskaContext();
    const { logout, uid } = useAuthContext();

    const currentUser = users.filter( u => u.uid === uid)
    const currentRol = currentUser[0]?.role
    console.log('El rol',currentRol)

    return (
        <div className=" bg-gradient-to-tl w-full h-full gap-x-3 flex">
            <aside className=" w-full max-h-screen flex-1 max-w-2xs bg-white rounded-md flex flex-col justify-between">
                <div className="p-5">
                <ul className="space-y-3">
                    <li>
                    <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                        <GoHomeFill className=" w-5 h-5" />
                        <span>Inicio</span>
                    </a>
                    </li>
                    <li>
                    <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                        <GoHomeFill className=" w-5 h-5" />
                        <span>Materias</span>
                    </a>
                    </li>
                    <li>
                    <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                        <GoHomeFill className=" w-5 h-5" />
                        <span>Personal</span>
                    </a>
                    </li>
                    {
                        currentUser && currentRol == 2 && (
                            <li>
                                <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <GoHomeFill className=" w-5 h-5" />
                                    <span>Escuelas</span>
                                </a>
                            </li>
                        ) 
                    }
                    <li>
                    <a href="#" className="text-gray-800 hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                        <GoHomeFill className=" w-5 h-5" />
                        <span>Comunicación</span>
                    </a>
                    </li>
                    {
                        currentUser && currentRol == 2 && (
                            <li>
                                <a href="#" className="text-gray-800 group hover:text-blue-500 flex items-center gap-x-2 *:text-sm">
                                    <GoHomeFill className=" group-hover:text-orange-500 w-5 h-5" />
                                    <span className=" group-hover:text-orange-800">Configuraciones</span>
                                </a>
                            </li>
                        )
                    }
                    {
                        currentUser && currentRol == 4 && (
                            <li>
                                <a href="#" className="text-gray-800 group flex items-center gap-x-2 *:text-sm">
                                    <GoHomeFill className=" group-hover:text-emerald-500 w-5 h-5" />
                                    <span className=" group-hover:text-emerald-800">Ajustes</span>
                                </a>
                            </li>
                        )
                    }
                </ul>
                </div>
                <div className="*:text-sm flex flex-col gap-y-2 p-5 items-start">
                    {
                        currentUser.map( u => (
                            <div className="text-gray-800 font-semibold">
                                {u.name} - {UserRole[u.role]}
                            </div>
                        ))
                    }
                    <button className=" hover:underline hover:underline-offset-2" onClick={logout}>Cerrar Sesión</button>
                    <p className="text-gray-500 ">
                        © 2025 Your Company. All rights reserved.
                    </p>
                </div>
            </aside>
            <section className=" flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
                <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Sistema de Gestión Escolar</h1>
                <p className="mb-6 text-gray-600">
                    Bienvenido al panel principal del sistema de gestión escolar. Aquí puedes visualizar información relevante de alumnos, profesores y materias.
                </p>

                {/* Resumen rápido */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-blue-100 p-4 rounded-lg shadow">
                    <h2 className="text-xl font-semibold text-blue-800">Alumnos</h2>
                    <p className="text-3xl font-bold">320</p>
                    <p className="text-sm text-blue-700">Matriculados este ciclo</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg shadow">
                    <h2 className="text-xl font-semibold text-green-800">Profesores</h2>
                    <p className="text-3xl font-bold">28</p>
                    <p className="text-sm text-green-700">Activos</p>
                    </div>
                    <div className="bg-yellow-100 p-4 rounded-lg shadow">
                    <h2 className="text-xl font-semibold text-yellow-800">Materias</h2>
                    <p className="text-3xl font-bold">15</p>
                    <p className="text-sm text-yellow-700">Ofertadas este semestre</p>
                    </div>
                </div>

                {/* Tabla de alumnos */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Lista de Alumnos</h2>
                    <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead>
                        <tr>
                            <th className="py-2 px-4 border-b">Nombre</th>
                            <th className="py-2 px-4 border-b">Grado</th>
                            <th className="py-2 px-4 border-b">Grupo</th>
                            <th className="py-2 px-4 border-b">Estatus</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td className="py-2 px-4 border-b">Juan Pérez</td>
                            <td className="py-2 px-4 border-b">3°</td>
                            <td className="py-2 px-4 border-b">A</td>
                            <td className="py-2 px-4 border-b text-green-600">Activo</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-4 border-b">María López</td>
                            <td className="py-2 px-4 border-b">2°</td>
                            <td className="py-2 px-4 border-b">B</td>
                            <td className="py-2 px-4 border-b text-green-600">Activo</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-4 border-b">Carlos Sánchez</td>
                            <td className="py-2 px-4 border-b">1°</td>
                            <td className="py-2 px-4 border-b">C</td>
                            <td className="py-2 px-4 border-b text-red-600">Baja</td>
                        </tr>
                        </tbody>
                    </table>
                    </div>
                </div>

                {/* Tabla de profesores */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Lista de Profesores</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 ">
                            <thead>
                            <tr>
                                <th className="py-2 px-4 border-b">Nombre</th>
                                <th className="py-2 px-4 border-b">Materia</th>
                                <th className="py-2 px-4 border-b">Correo</th>
                            </tr>
                            </thead>
                            <tbody>
                            {
                                users.map((user) => (
                                <tr key={user.id}>
                                    <td className="py-2 px-4 border-b">{user.name}</td>
                                    <td className="py-2 px-4 border-b">{user.role}</td>
                                    <td className="py-2 px-4 border-b">{user.id}</td>
                                </tr>
                                ))
                            }
                            <tr>
                                <td className="py-2 px-4 border-b">Pedro Gómez</td>
                                <td className="py-2 px-4 border-b">Historia</td>
                                <td className="py-2 px-4 border-b">pedro.gomez@escuela.edu</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 border-b">Ana Torres</td>
                                <td className="py-2 px-4 border-b">Ciencias</td>
                                <td className="py-2 px-4 border-b">ana.torres@escuela.edu</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                    </div>

                    {/* Avisos */}
                    <div className="bg-gray-100 p-4 rounded-lg border-l-4 border-blue-400">
                        <h2 className="text-xl font-semibold text-blue-700 mb-2">Avisos Importantes</h2>
                        <ul className="list-disc pl-6 text-gray-700">
                        <li>Inscripciones abiertas hasta el 31 de agosto.</li>
                        <li>Entrega de boletas: 20 de septiembre.</li>
                        <li>Reunión de padres de familia: 5 de septiembre a las 18:00 hrs.</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    )
}
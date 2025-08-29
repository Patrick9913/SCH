import React from "react";
import { HiCog } from "react-icons/hi";

export const Settings: React.FC = () => {
    return (
        <section className="flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
            <div>
                <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800 mb-2">
                    <HiCog className=" w-10 h-10" />
                    <span>Ajustes</span>
                </div>
                <p className="mb-6 text-gray-600">
                Desde este panel puedes modificar las configuraciones del sistema, ajustar preferencias y 
                administrar opciones avanzadas.
                </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg border-l-4 border-blue-400 mb-8">
                <h2 className="text-xl font-semibold text-blue-700 mb-2">Avisos Importantes</h2>
                <ul className="list-disc pl-6 text-gray-700">
                <li>Inscripciones abiertas hasta el 31 de agosto.</li>
                <li>Entrega de boletas: 20 de septiembre.</li>
                <li>Reunión de padres de familia: 5 de septiembre a las 18:00 hrs.</li>
                </ul>
            </div>
        </section>
    )
}
import { PersonalView } from "@/app/types/user";
import Image from "next/image";
import React from "react";
import { HiPencil, HiTrash, HiBan } from "react-icons/hi";

interface PersonalViewProps extends PersonalView {
    division?: string;
    onEdit?: () => void;
    onDelete?: () => void;
    onSuspend?: () => void;
    onActivate?: () => void;
    showActions?: boolean;
    isSuspended?: boolean;
}

export const Personalview: React.FC<PersonalViewProps> = ({ 
    src, 
    name, 
    role, 
    level, 
    division,
    onEdit, 
    onDelete, 
    onSuspend, 
    onActivate,
    showActions = false,
    isSuspended = false
}) => {
    return (
        <div
            className={`relative flex flex-col items-center gap-3 group bg-white border border-gray-200 rounded-lg p-5 w-full shadow-sm transition-colors cursor-pointer hover:border-gray-300 hover:bg-gray-50 min-w-[220px]`}
        >
            <div className="relative w-16 h-16 mb-1">
                {src ? (
                    <Image
                        alt={name}
                        src={src}
                        fill
                        className="rounded-full object-cover"
                    />
                ) : (
                    <div className={`w-16 h-16 rounded-full ${isSuspended ? 'bg-gray-400 opacity-50' : 'bg-cyan-950'}`} />
                )}
            </div>
            <div className="flex flex-col items-center mb-1">
                <h2 className={`text-lg font-semibold ${isSuspended ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{name}</h2>
                <p className="text-sm text-gray-600 font-medium">{role}</p>
                {level && <p className="text-xs text-gray-500 mt-0.5">{level}</p>}
                {role === 'Estudiante' && level && (
                    <p className="text-xs text-blue-700 mt-0.5">División: {division || 'Sin división'}</p>
                )}
                {isSuspended && (
                    <span className="text-xs text-red-600 font-medium mt-1">Suspendido</span>
                )}
            </div>
            {showActions && (onEdit || onDelete || onSuspend || onActivate) && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow"
                            title="Editar usuario"
                        >
                            <HiPencil className="w-4 h-4" />
                        </button>
                    )}
                    {(onSuspend || onActivate) && (
                        <button
                            onClick={isSuspended ? onActivate : onSuspend}
                            className={`p-1.5 rounded-full text-white transition-colors shadow ${
                                isSuspended 
                                    ? 'bg-green-500 hover:bg-green-600' 
                                    : 'bg-yellow-500 hover:bg-yellow-600'
                            }`}
                            title={isSuspended ? "Reactivar usuario" : "Suspender usuario"}
                        >
                            <HiBan className="w-4 h-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow"
                            title="Eliminar usuario"
                        >
                            <HiTrash className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

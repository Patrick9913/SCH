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
            className={`relative flex flex-col items-center gap-3 group bg-white border border-gray-200 rounded-lg p-6 w-full transition-all hover:border-gray-300 hover:shadow-md min-w-[220px] ${isSuspended ? 'opacity-75' : ''}`}
        >
            <div className="relative w-20 h-20 mb-2">
                {src ? (
                    <Image
                        alt={name}
                        src={src}
                        fill
                        className="rounded-full object-cover"
                    />
                ) : (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ${isSuspended ? 'bg-gray-400' : 'bg-gradient-to-br from-gray-700 to-gray-900'}`}>
                        {name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            <div className="flex flex-col items-center mb-1 text-center">
                <h2 className={`text-base font-semibold ${isSuspended ? 'text-gray-400' : 'text-gray-900'}`}>{name}</h2>
                <p className="text-sm text-gray-600 font-medium mt-1">{role}</p>
                {level && <p className="text-xs text-gray-500 mt-1">{level}</p>}
                {role === 'Estudiante' && level && division && (
                    <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-full mt-1.5">
                        División {division}
                    </span>
                )}
                {isSuspended && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-medium mt-2">
                        Suspendido
                    </span>
                )}
            </div>
            {showActions && (onEdit || onDelete || onSuspend || onActivate) && (
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                            title="Editar usuario"
                        >
                            <HiPencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {(onSuspend || onActivate) && (
                        <button
                            onClick={isSuspended ? onActivate : onSuspend}
                            className={`p-2 border rounded-lg text-white transition-all shadow-sm ${
                                isSuspended 
                                    ? 'bg-green-500 border-green-600 hover:bg-green-600' 
                                    : 'bg-yellow-500 border-yellow-600 hover:bg-yellow-600'
                            }`}
                            title={isSuspended ? "Reactivar usuario" : "Suspender usuario"}
                        >
                            <HiBan className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-400 transition-all shadow-sm"
                            title="Eliminar usuario"
                        >
                            <HiTrash className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

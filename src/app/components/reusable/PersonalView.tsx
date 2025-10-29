import { PersonalView } from "@/app/types/user";
import Image from "next/image";
import React from "react";
import { HiPencil, HiTrash, HiBan } from "react-icons/hi";

interface PersonalViewProps extends PersonalView {
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
    onEdit, 
    onDelete, 
    onSuspend, 
    onActivate,
    showActions = false,
    isSuspended = false
}) => {
    return (
        <div className="relative flex flex-col items-center gap-3 group">
            <div className="relative w-16 h-16">
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
            <div className="flex flex-col items-center">
                <h2 className={`font-semibold ${isSuspended ? 'text-gray-400 line-through' : ''}`}>{name}</h2>
                <p className="text-sm text-gray-600">{role}</p>
                {level && <p className="text-xs text-gray-500">{level}</p>}
                {isSuspended && (
                    <span className="text-xs text-red-600 font-medium mt-1">Suspendido</span>
                )}
            </div>
            {showActions && (onEdit || onDelete || onSuspend || onActivate) && (
                <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                            title="Editar usuario"
                        >
                            <HiPencil className="w-4 h-4" />
                        </button>
                    )}
                    {(onSuspend || onActivate) && (
                        <button
                            onClick={isSuspended ? onActivate : onSuspend}
                            className={`p-1.5 rounded-full text-white transition-colors ${
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
                            className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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

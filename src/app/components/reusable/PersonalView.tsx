import { PersonalView } from "@/app/types/user";
import Image from "next/image";
import React from "react";

export const Personalview: React.FC<PersonalView> = ({ src, name, role, level }) => {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-16 h-16">
                {src ? (
                    <Image
                        alt={name}
                        src={src}
                        fill
                        className="rounded-full object-cover"
                    />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-cyan-950" />
                )}
            </div>
            <div className=" flex flex-col items-center">
                <h2 className="font-semibold">{name}</h2>
                <p className="text-sm text-gray-600">{role}</p>
                <p className="">{level}</p>
            </div>
        </div>
    );
};

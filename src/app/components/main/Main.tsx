'use client';

import React from "react";
import { useTriskaContext } from "@/app/context/triskaContext";
import { Settings } from "../fccomponents/Settings";
import { Personal } from "../fccomponents/Personal";
import { Home } from "../fccomponents/Home"
import { Navbar } from "./Navbar";

export const Main: React.FC = () => {

    const { users, menu} = useTriskaContext();

    const students = users.filter( s => s.role === 3)
    const teachers = users.filter( t => t.role === 4)
    
    return (
        <div className="min-h-screen h-screen w-screen p-2">
            <div className=" w-full h-full gap-x-3 flex">
                <Navbar />
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
'use client';

import React from "react";
import { useTriskaContext } from "@/app/context/triskaContext";
import { Settings } from "../fccomponents/Settings";
import { Personal } from "../fccomponents/Personal";
import { Home } from "../fccomponents/Home"
import { Navbar } from "./Navbar";
import { Messages } from "../fccomponents/Messages";
import { Attendance } from "../fccomponents/Attendance";
import { Grades } from "../fccomponents/Grades";
import { BulletinReports } from "../fccomponents/BulletinReports";
import { Schedule } from "../fccomponents/Schedule";
import { Tasks } from "../fccomponents/Tasks";

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
                {
                    menu == 4 && (
                        <Messages />
                    )
                }
                {
                    menu == 5 && (
                        <Attendance />
                    )
                }
                {
                    menu == 6 && (
                        <Grades />
                    )
                }
                {
                    menu == 7 && (
                        <BulletinReports />
                    )
                }
                {
                    menu == 8 && (
                        <Schedule />
                    )
                }
                {
                    menu == 9 && (
                        <Tasks />
                    )
                }
            </div>
        </div>
    )
}
'use client';

import React from "react";
import { useTriskaContext } from "@/app/context/triskaContext";
import { Assignments } from "../fccomponents/Assignments";
import { Personal } from "../fccomponents/Personal";
import { Home } from "../fccomponents/Home"
import { UserCreator } from "../fccomponents/UserCreator"
import { Navbar } from "./Navbar";
import { Messages } from "../fccomponents/Messages";
import { Attendance } from "../fccomponents/Attendance";
import { Grades } from "../fccomponents/Grades";
import { BulletinReports } from "../fccomponents/BulletinReports";
import { MyStudents } from "../fccomponents/MyStudents";
import { Schedule } from "../fccomponents/Schedule";
import { MyCourses } from "../fccomponents/MyCourses";
import { Courses } from "../fccomponents/Courses";
import { EarlyWithdrawals } from "../fccomponents/EarlyWithdrawals";
import { WithdrawalSecurity } from "../fccomponents/WithdrawalSecurity";
import { WithdrawalHistory } from "../fccomponents/WithdrawalHistory";
import { YearTransition } from "../fccomponents/YearTransition";

export const Main: React.FC = () => {

    const { users, menu} = useTriskaContext();

    const students = users.filter( s => s.role === 3 && s.status !== 'egresado')
    const teachers = users.filter( t => t.role === 4)
    
    return (
        <div className="min-h-screen h-screen w-screen p-2">
            <div className=" w-full h-full gap-x-2 flex">
                <Navbar />
                {
                    menu == 1 && (
                        <Home />
                    )
                }
                {
                    menu == 2 && (
                        <Assignments />
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
                    menu == 10 && (
                        <MyStudents />
                    )
                }
                {
                    menu == 8 && (
                        <Schedule />
                    )
                }
                {
                    menu == 9 && (
                        <UserCreator />
                    )
                }
                {
                    menu == 12 && (
                        <MyCourses />
                    )
                }
                {
                    menu == 13 && (
                        <Courses />
                    )
                }
                {
                    menu == 14 && (
                        <EarlyWithdrawals />
                    )
                }
                {
                    menu == 15 && (
                        <WithdrawalSecurity />
                    )
                }
                {
                    menu == 16 && (
                        <WithdrawalHistory />
                    )
                }
                {
                    menu == 17 && (
                        <YearTransition />
                    )
                }
            </div>
        </div>
    )
}
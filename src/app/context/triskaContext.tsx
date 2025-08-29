'use client';

import React, { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";
import { db, auth } from '../config'
import { collection, getDoc, getDocs, query, where } from "firebase/firestore";
import { User } from "../types/user";
import { useAuthContext } from "./authContext";


interface TriskaContextProps {
    users: User[];
    menu: number,
    setMenu: Dispatch<SetStateAction<number>>
}

export const TriskaContext = createContext<TriskaContextProps | null>(null);

export const useTriskaContext = () => {
    const context = useContext(TriskaContext);
    if (!context) {
        throw new Error("useTriskaContext must be used within a TriskaProvider");
    }
    return context;
}

export const TriskaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    
    const userRef = collection(db, "users");
    const [users, setUsers] = useState<User[]>([]);
    const {user} = useAuthContext();
    const [menu, setMenu] = useState<number>(1)

    const fetchUsers = async () => {
        try {
            if (user?.role === 1) {
                // Admin: obtener todos los usuarios
                const snapshot = await getDocs(userRef);
                const usersData = snapshot.docs.map((doc) => ({
                    ...(doc.data() as Omit<User, 'id'>),
                    id: doc.id,
                }));
                setUsers(usersData);
                console.log("Todos los usuarios:", users)
            } else if (user?.role === 3) {
                // Usuario común: obtener solo su propio documento
                const q = query(collection(db, "users"), where("uid", "==", user.uid));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data() as User;
                    setUsers([userData]); // mantener array por coherencia
                    console.log("El usuario es:", users)
                } else {
                    console.warn("No se encontró usuario con ese UID.");
                    setUsers([]); // opcional: dejar vacío
                }
            }
        } catch (error) {
            console.error("Error fetching users: ", error);
        }
    }

    useEffect(() => {
        if (!user || !user.uid || user.role === undefined) {
            // Usuario no está logueado, limpiar usuarios
            setUsers([]);
            return;
        }

        fetchUsers();
    }, [user]);

    const triskaValues = {
        menu,
        setMenu,
        users
    }

    return (
        <TriskaContext.Provider value={triskaValues}>
            {children}
        </TriskaContext.Provider>
    )
}
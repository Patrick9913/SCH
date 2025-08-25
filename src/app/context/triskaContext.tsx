'use client';

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { db } from '../config'
import { collection, getDocs } from "firebase/firestore";
import { User } from "../types/user";


interface TriskaContextProps {
    users: User[];
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

    const fetchUsers = async () => {
        try {
            const getusers = await getDocs(userRef)
            const usersData = getusers.docs.map((doc) => ({...doc.data() as Omit<User, 'id'>, id: doc.id}));
            setUsers(usersData)
            console.log(usersData)
        } catch (error) {
            console.error("Error fetching users: ", error);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    const triskaValues = {
        users
    }

    return (
        <TriskaContext.Provider value={triskaValues}>
            {children}
        </TriskaContext.Provider>
    )
}
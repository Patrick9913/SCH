'use client';

import React, { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";
import { db, auth } from '../config';
import { addDoc, collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { User } from "../types/user";
import { useAuthContext } from "./authContext";
import { createUserWithEmailAndPassword } from "firebase/auth";


interface TriskaContextProps {
    users: User[];
    menu: number;
    setMenu: Dispatch<SetStateAction<number>>;
    nUser: boolean;
    setNUser: Dispatch<SetStateAction<boolean>>;
    firstName: string;
    setFirstName: Dispatch<SetStateAction<string>>;
    mail: string;
    setMail: Dispatch<SetStateAction<string>>;
    role: number;
    setRole: Dispatch<SetStateAction<number>>;
    dni: string;
    password: string;
    setPassword: Dispatch<SetStateAction<string>>
    setDni: Dispatch<SetStateAction<string>>;
    newUser: (email: string, password: string) => void;
}

export const TriskaContext = createContext<TriskaContextProps | null>(null);

export const useTriskaContext = () => {
    const context = useContext(TriskaContext);
    if (!context) {
        throw new Error("useTriskaContext must be used within a TriskaProvider");
    }
    return context;
};

export const TriskaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    const userRef = collection(db, "users");
    const [users, setUsers] = useState<User[]>([]);
    const { user } = useAuthContext();
    const [menu, setMenu] = useState<number>(1);
    const [firstName, setFirstName] = useState<string>("");
    const [password, setPassword] = useState<string>(""); 
    const [dni, setDni] = useState<string>("");  // Cambié a número
    const [mail, setMail] = useState<string>("");
    const [role, setRole] = useState<number>(0);
    const [nUser, setNUser] = useState<boolean>(false);

    // Función para obtener usuarios
    const fetchUsers = () => {
    try {
        if (user?.role === 1) {
            // Admin: obtener todos los usuarios en tiempo real
            const unsubscribe = onSnapshot(userRef, (snapshot) => {
                const usersData = snapshot.docs.map((doc) => ({
                    ...(doc.data() as Omit<User, 'id'>),
                    id: doc.id,
                }));
                setUsers(usersData);
            });

            // Devolver la función de desuscripción en caso de que necesites dejar de escuchar los cambios
            return unsubscribe;
        } else if (user?.role === 3) {
            // Usuario común: obtener solo su propio documento en tiempo real
            const q = query(collection(db, "users"), where("uid", "==", user.uid));
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data() as User;
                    setUsers([userData]);  // Mantener array por coherencia
                } else {
                    setUsers([]);  // Si no se encuentra, dejar vacío
                }
            });

            // Devolver la función de desuscripción
            return unsubscribe;
        }
    } catch (error) {
        console.error("Error fetching users: ", error);
    }
};

    // Función para crear un nuevo usuario
    const newUser = async (email: string, password: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userId = user.uid;

            // Crear el nuevo documento de usuario
            await addDoc(collection(db, "users"), {
                name: firstName.trim(),
                mail: mail.trim(),
                dni: Number(dni),
                role: role,
                uid: userId,
            });
            console.log("Usuario creado correctamente");
            setNUser(false)
            setDni("")
            setFirstName("")
            setMail("")
        } catch (error) {
            console.log("Ha ocurrido un error al cargar el usuario", error);
        }
    };

    // useEffect para cargar los usuarios cuando cambia 'user'
    useEffect(() => {
        if (!user || !user.uid || user.role === undefined) {
            // Usuario no está logueado, limpiar usuarios
            setUsers([]);
            return;
        }

        fetchUsers();
    }, [user]);

    // useEffect para mostrar el log cuando 'users' cambie
    useEffect(() => {
        console.log("Usuarios cargados:", users);
    }, [users]);

    const triskaValues = {
        menu,
        firstName,
        setFirstName,
        setMail,
        mail,
        setMenu,
        users,
        nUser,
        setNUser,
        role,
        setRole,
        dni,
        setDni,
        password,
        setPassword,
        newUser
    };

    return (
        <TriskaContext.Provider value={triskaValues}>
            {children}
        </TriskaContext.Provider>
    );
};
``
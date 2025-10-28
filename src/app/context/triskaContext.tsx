'use client';

import React, { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";
import { db, auth, app } from '../config';
import { addDoc, collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { NewUserData, User } from "../types/user";
import { useAuthContext } from "./authContext";
import { useSubjects } from "./subjectContext";
import { createUserWithEmailAndPassword } from "firebase/auth";
// Firebase Functions removido - usando autenticación directa

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
    newUser: (data: NewUserData) => Promise<void>;
}

type CreateUserResponse = {
  uid: string;
};

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
    const { getStudentsByTeacher } = useSubjects();
    const [menu, setMenu] = useState<number>(1);
    const [firstName, setFirstName] = useState<string>("");
    const [password, setPassword] = useState<string>(""); 
    const [dni, setDni] = useState<string>("");  // Cambié a número
    const [mail, setMail] = useState<string>("");
    const [role, setRole] = useState<number>(0);
    const [nUser, setNUser] = useState<boolean>(false);

    // Firebase Functions removido - usando autenticación directa

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

            return unsubscribe;
        } else if (user?.role === 3) {
            // Usuario común: obtener solo su propio documento en tiempo real
            const q = query(collection(db, "users"), where("uid", "==", user.uid));
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data() as User;
                    setUsers([userData]);
                } else {
                    setUsers([]);
                }
            });

            return unsubscribe;
        } else if (user?.role === 4) {
            // Docente: no usar suscripción, solo obtener datos una vez
            // La actualización se manejará con el useEffect adicional
            return () => {}; // No hay suscripción que limpiar
        }
    } catch (error) {
        console.error("Error fetching users: ", error);
    }
};

    // Función para crear un nuevo usuario (solo en Firestore)
    const newUser = async ({ firstName, mail, dni, role, password, asignatura, curso }: NewUserData & { asignatura?: number, curso?: number }) => {
        try {
            console.log("📝 Datos recibidos:", { firstName, mail, dni, role, password, asignatura, curso });
            
            // Validar que firstName no esté vacío
            if (!firstName || firstName.trim() === '') {
                throw new Error("El nombre es requerido");
            }
            
            // Generar un UID temporal (puedes usar uuid o cualquier método)
            const tempUid = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log("🆔 UID generado:", tempUid);
            
            // Crear documento en Firestore
            const { addDoc, collection } = await import("firebase/firestore");
            await addDoc(collection(db, "users"), {
                name: firstName.trim(),
                mail: mail.trim(),
                dni: Number(dni),
                role: role,
                uid: tempUid,
                password: password, // Guardamos la contraseña temporalmente
                ...(asignatura && { asig: asignatura }),
                ...(curso && { level: curso }),
                createdAt: new Date(),
                status: 'pending' // Estado pendiente hasta que se cree en Auth
            });

            console.log("✅ Usuario creado en Firestore:", tempUid);
            alert("Usuario creado exitosamente. El administrador deberá crear la cuenta de autenticación por separado.");

            // Resetear campos
            setNUser(false);
            setDni("");
            setFirstName("");
            setMail("");
            setPassword("");
        } catch (error) {
            console.error("💥 Ha ocurrido un error al crear el usuario:", error);
            alert("Error al crear el usuario: " + (error instanceof Error ? error.message : String(error)));
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

    // useEffect adicional para docentes: actualizar usuarios cuando cambien los subjects
    useEffect(() => {
        if (user?.role === 4 && user.uid) {
            const updateTeacherStudents = () => {
                try {
                    const teacherStudents = getStudentsByTeacher(user.uid);
                    setUsers(teacherStudents);
                    
                    console.log('Docente - Estudiantes actualizados:', {
                        teacherUid: user.uid,
                        studentsCount: teacherStudents.length,
                        studentNames: teacherStudents.map(s => s.name)
                    });
                } catch (error) {
                    console.error('Error al obtener estudiantes del docente:', error);
                    setUsers([]);
                }
            };
            
            // Ejecutar inmediatamente
            updateTeacherStudents();
            
            // También ejecutar después de un pequeño delay para asegurar que los datos estén disponibles
            const timeoutId = setTimeout(updateTeacherStudents, 500);
            
            return () => clearTimeout(timeoutId);
        }
    }, [user?.uid, user?.role]);

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
'use client';

import React, { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState, useCallback } from "react";
import { db } from '../config';
import { collection, onSnapshot, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { NewUserData, User } from "../types/user";
import { useAuthContext } from "./authContext";
import CryptoJS from 'crypto-js';
import Swal from 'sweetalert2';
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
    newUser: (data: NewUserData & { asignatura?: number, curso?: number }) => Promise<void>;
    updateUser: (userId: string, data: Partial<NewUserData & { asignatura?: number, curso?: number }>) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    suspendUser: (userId: string) => Promise<void>;
    activateUser: (userId: string) => Promise<void>;
    refreshUsers: () => void;
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

    const [users, setUsers] = useState<User[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { user } = useAuthContext();
    const [menu, setMenu] = useState<number>(1);
    const [firstName, setFirstName] = useState<string>("");
    const [password, setPassword] = useState<string>(""); 
    const [dni, setDni] = useState<string>("");  // Cambié a número
    const [mail, setMail] = useState<string>("");
    const [role, setRole] = useState<number>(0);
    const [nUser, setNUser] = useState<boolean>(false);

    // Firebase Functions removido - usando autenticación directa

    // Función para obtener usuarios memoizada
    const fetchUsers = useCallback((): (() => void) | undefined => {
        if (!user || !user.id || user.role === undefined) {
            return undefined;
        }
        
        try {
            const userRef = collection(db, "users");
            
            if (user.role === 1) {
                // Admin: obtener todos los usuarios en tiempo real
                const unsubscribe = onSnapshot(userRef, (snapshot) => {
                    const usersData = snapshot.docs.map((doc) => {
                        const data = doc.data() as Omit<User, 'id'>;
                        return {
                            ...data,
                            id: doc.id,
                            // Asegurar que uid sea igual a id para compatibilidad
                            uid: data.uid || doc.id,
                        } as User;
                    });
                    setUsers(usersData);
                });

                return unsubscribe;
            } else if (user.role === 3) {
                // Estudiante: obtener su propio documento Y los profesores asignados a sus materias
                const userDocRef = doc(db, "users", user.id);
                let studentData: User | null = null;
                
                // Función para actualizar usuarios cuando cambian las materias o el estudiante
                const updateUsersWithTeachers = async () => {
                    if (!studentData) return;
                    
                    try {
                        // Obtener las materias asignadas al estudiante para obtener los teacherUids
                        const subjectsRef = collection(db, "subjects");
                        const subjectsSnapshot = await getDocs(subjectsRef);
                        
                        const teacherUids = new Set<string>();
                        subjectsSnapshot.docs.forEach(doc => {
                            const subjectData = doc.data();
                            const studentUids = subjectData.studentUids || [];
                            if (studentUids.includes(user.id) && subjectData.teacherUid) {
                                teacherUids.add(subjectData.teacherUid);
                            }
                        });
                        
                        // Obtener los profesores asignados
                        if (teacherUids.size > 0) {
                            const teachersPromises = Array.from(teacherUids).map(async (teacherUid) => {
                                try {
                                    const teacherDoc = await getDoc(doc(db, "users", teacherUid));
                                    if (teacherDoc.exists()) {
                                        const teacherData = teacherDoc.data();
                                        return {
                                            id: teacherDoc.id,
                                            ...teacherData,
                                            uid: (teacherData.uid as string) || teacherDoc.id,
                                        } as User;
                                    }
                                } catch (error) {
                                    console.error(`Error obteniendo profesor ${teacherUid}:`, error);
                                }
                                return null;
                            });
                            
                            const teachers = await Promise.all(teachersPromises);
                            const validTeachers = teachers.filter(t => t !== null) as User[];
                            
                            // Combinar estudiante + profesores
                            setUsers([studentData, ...validTeachers]);
                        } else {
                            setUsers([studentData]);
                        }
                    } catch (error) {
                        console.error("Error obteniendo profesores:", error);
                        setUsers(studentData ? [studentData] : []);
                    }
                };
                
                // Suscribirse a cambios en el documento del estudiante
                const unsubscribeSelf = onSnapshot(userDocRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        studentData = { 
                            id: snapshot.id, 
                            ...data,
                            uid: (data.uid as string) || snapshot.id,
                        } as User;
                        // Actualizar profesores cuando cambia el estudiante
                        updateUsersWithTeachers();
                    } else {
                        studentData = null;
                        setUsers([]);
                    }
                });

                // También suscribirse a cambios en las materias para actualizar cuando cambien los profesores
                const subjectsRef = collection(db, "subjects");
                const unsubscribeSubjects = onSnapshot(subjectsRef, () => {
                    // Cuando cambian las materias, actualizar la lista de profesores
                    updateUsersWithTeachers();
                });

                // Retornar función de limpieza combinada
                return () => {
                    unsubscribeSelf();
                    unsubscribeSubjects();
                };
            } else if (user.role === 4) {
                // Docente: obtener todos los usuarios estudiantes para poder filtrarlos después
                const unsubscribe = onSnapshot(userRef, (snapshot) => {
                    const usersData = snapshot.docs.map((doc) => {
                        const data = doc.data() as Omit<User, 'id'>;
                        return {
                            ...data,
                            id: doc.id,
                            // Asegurar que uid sea igual a id para compatibilidad
                            uid: data.uid || doc.id,
                        } as User;
                    });
                    setUsers(usersData);
                });

                return unsubscribe;
            }
            return undefined;
        } catch (error) {
            console.error("Error fetching users: ", error);
            return undefined;
        }
    }, [user]);

    // Función para hashear password (debe ser la misma que en authContext)
    const hashPassword = (password: string): string => {
        const HASH_SECRET = process.env.NEXT_PUBLIC_HASH_SECRET || 'default-secret-key-change-in-production';
        return CryptoJS.SHA256(password + HASH_SECRET).toString();
    };

    // Función para crear un nuevo usuario (solo en Firestore)
    const newUser = async ({ firstName, mail, dni, role, password, asignatura, curso }: NewUserData & { asignatura?: number, curso?: number }) => {
        try {
                // Validar permisos - solo admin puede crear usuarios
                if (!user || user.role !== 1) {
                    throw new Error("No tienes permisos para crear usuarios");
                }
            
            // Validar que firstName no esté vacío
            if (!firstName || firstName.trim() === '') {
                throw new Error("El nombre es requerido");
            }
            
                // Validar que el email no esté en uso
                const existingUserQuery = query(collection(db, "users"), where("mail", "==", mail.trim()));
                const existingUserSnapshot = await getDocs(existingUserQuery);
                if (!existingUserSnapshot.empty) {
                    throw new Error("Este correo electrónico ya está en uso");
                }
                
                // Hashear password
                const hashedPassword = hashPassword(password);
                
                // Crear referencia con ID generado automáticamente
                const docRef = doc(collection(db, "users"));
                const userId = docRef.id;
                
                // Crear documento en Firestore con uid igual al documentId desde el inicio
                await setDoc(docRef, {
                name: firstName.trim(),
                mail: mail.trim(),
                dni: Number(dni),
                role: role,
                    password: hashedPassword,
                    uid: userId, // uid igual al documentId desde el inicio
                ...(asignatura && { asig: asignatura }),
                ...(curso && { level: curso }),
                createdAt: new Date(),
                    status: 'active'
                });

                await Swal.fire({
                    icon: 'success',
                    title: 'Usuario creado exitosamente',
                    text: 'El usuario ya puede iniciar sesión.',
                    confirmButtonColor: '#2563eb',
                });

            // Resetear campos
            setNUser(false);
            setDni("");
            setFirstName("");
            setMail("");
            setPassword("");
        } catch (error) {
            console.error("💥 Ha ocurrido un error al crear el usuario:", error);
            await Swal.fire({
                icon: 'error',
                title: 'Error al crear el usuario',
                text: error instanceof Error ? error.message : String(error),
                confirmButtonColor: '#dc2626',
            });
        }
    };

    // Función para actualizar un usuario
    const updateUser = async (userId: string, data: Partial<NewUserData & { asignatura?: number, curso?: number }>) => {
        try {
            // Validar permisos - solo admin puede actualizar usuarios
            if (!user || user.role !== 1) {
                throw new Error("No tienes permisos para actualizar usuarios");
            }

            const userDocRef = doc(db, "users", userId);
            const updateData: any = {};

            if (data.firstName !== undefined) {
                if (!data.firstName || data.firstName.trim() === '') {
                    throw new Error("El nombre es requerido");
                }
                updateData.name = data.firstName.trim();
            }

            if (data.mail !== undefined) {
                // Validar que el email no esté en uso por otro usuario
                const existingUserQuery = query(collection(db, "users"), where("mail", "==", data.mail.trim()));
                const existingUserSnapshot = await getDocs(existingUserQuery);
                if (!existingUserSnapshot.empty && existingUserSnapshot.docs[0].id !== userId) {
                    throw new Error("Este correo electrónico ya está en uso");
                }
                updateData.mail = data.mail.trim();
            }

            if (data.dni !== undefined) {
                updateData.dni = Number(data.dni);
            }

            if (data.role !== undefined) {
                updateData.role = data.role;
            }

            if (data.password !== undefined && data.password !== '') {
                // Solo hashear si se proporciona una nueva contraseña
                updateData.password = hashPassword(data.password);
            }

            if (data.asignatura !== undefined) {
                updateData.asig = data.asignatura;
            }

            if (data.curso !== undefined) {
                updateData.level = data.curso;
            }

            // Asegurar que uid siempre coincida con el id del documento
            updateData.uid = userId;

            await updateDoc(userDocRef, updateData);
            await Swal.fire({
                icon: 'success',
                title: 'Usuario actualizado exitosamente',
                confirmButtonColor: '#2563eb',
            });
        } catch (error) {
            console.error("Error al actualizar usuario:", error);
            throw error;
        }
    };

    // Función para eliminar un usuario
    const deleteUser = async (userId: string) => {
        try {
            // Validar permisos - solo admin puede eliminar usuarios
            if (!user || user.role !== 1) {
                throw new Error("No tienes permisos para eliminar usuarios");
            }

            // Prevenir que el admin se elimine a sí mismo
            if (userId === user.id) {
                throw new Error("No puedes eliminar tu propia cuenta");
            }

            // Verificar que el usuario objetivo no sea un administrador
            const targetUserDoc = await getDoc(doc(db, "users", userId));
            if (!targetUserDoc.exists()) {
                throw new Error("El usuario no existe");
            }

            const targetUserData = targetUserDoc.data();
            if (targetUserData.role === 1) {
                throw new Error("No puedes eliminar a otro administrador");
            }

            const userDocRef = doc(db, "users", userId);
            await deleteDoc(userDocRef);
            await Swal.fire({
                icon: 'success',
                title: 'Usuario eliminado exitosamente',
                confirmButtonColor: '#2563eb',
            });
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            throw error;
        }
    };

    // Función para suspender un usuario
    const suspendUser = async (userId: string) => {
        try {
            // Validar permisos - solo admin puede suspender usuarios
            if (!user || user.role !== 1) {
                throw new Error("No tienes permisos para suspender usuarios");
            }

            // Prevenir que el admin se suspenda a sí mismo
            if (userId === user.id) {
                throw new Error("No puedes suspender tu propia cuenta");
            }

            // Verificar que el usuario objetivo no sea un administrador
            const targetUserDoc = await getDoc(doc(db, "users", userId));
            if (!targetUserDoc.exists()) {
                throw new Error("El usuario no existe");
            }

            const targetUserData = targetUserDoc.data();
            if (targetUserData.role === 1) {
                throw new Error("No puedes suspender a otro administrador");
            }

            const userDocRef = doc(db, "users", userId);
            await updateDoc(userDocRef, { 
                status: 'suspended',
                uid: userId // Mantener el uid consistente
            });
            
            await Swal.fire({
                icon: 'success',
                title: 'Usuario suspendido',
                text: 'El usuario ya no podrá iniciar sesión.',
                confirmButtonColor: '#f59e0b',
            });
        } catch (error) {
            console.error("Error al suspender usuario:", error);
            throw error;
        }
    };

    // Función para reactivar un usuario suspendido
    const activateUser = async (userId: string) => {
        try {
            // Validar permisos - solo admin puede reactivar usuarios
            if (!user || user.role !== 1) {
                throw new Error("No tienes permisos para reactivar usuarios");
            }

            const userDocRef = doc(db, "users", userId);
            await updateDoc(userDocRef, { 
                status: 'active',
                uid: userId // Mantener el uid consistente
            });
            
            await Swal.fire({
                icon: 'success',
                title: 'Usuario reactivado',
                text: 'El usuario ya puede iniciar sesión nuevamente.',
                confirmButtonColor: '#10b981',
            });
        } catch (error) {
            console.error("Error al reactivar usuario:", error);
            throw error;
        }
    };

    // Función para refrescar usuarios manualmente
    const refreshUsers = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // useEffect para cargar los usuarios cuando cambia 'user' o 'refreshTrigger'
    useEffect(() => {
        if (!user || !user.id || user.role === undefined) {
            // Usuario no está logueado, limpiar usuarios
            setUsers([]);
            return;
        }

        const unsubscribe = fetchUsers();
        
        // Cleanup function para desuscribirse cuando el componente se desmonte o cambien las dependencias
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [user, refreshTrigger, fetchUsers]);



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
        newUser,
        updateUser,
        deleteUser,
        suspendUser,
        activateUser,
        refreshUsers
    };

    return (
        <TriskaContext.Provider value={triskaValues}>
            {children}
        </TriskaContext.Provider>
    );
};
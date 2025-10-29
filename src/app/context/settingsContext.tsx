'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { collection, doc, getDoc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config';
import { GradeSettings, ADMIN_EMAIL } from '../types/system';
import { useAuthContext } from './authContext';
import toast from 'react-hot-toast';

interface SettingsContextProps {
  gradeLoadingEnabled: boolean;
  toggleGradeLoading: () => Promise<void>;
  isMainAdmin: boolean;
  isConnected: boolean;
  lastUpdated?: number;
}

const SettingsContext = createContext<SettingsContextProps | null>(null);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de SettingsProvider');
  return ctx;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, uid } = useAuthContext();
  const [gradeLoadingEnabled, setGradeLoadingEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>();
  const previousValue = useRef<boolean | null>(null); // null = no inicializado
  const previousUpdated = useRef<number>(0); // Para detectar nuevas actualizaciones
  const isInitialized = useRef<boolean>(false); // Para saber si ya se inicializó

  const isMainAdmin = user?.role === 1;
  
  // Verificar si el usuario puede gestionar calificaciones
  const canManageGrades = user?.role === 1 || user?.role === 2 || user?.role === 4;

  // Función para probar la conexión a Firebase
  const testFirebaseConnection = async () => {
    try {
      console.log('🔍 Probando conexión a Firebase...');
      const docRef = doc(db, 'system', 'settings');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('✅ Documento existe:', docSnap.data());
        return true;
      } else {
        console.log('⚠️ Documento no existe');
        return false;
      }
    } catch (error) {
      console.error('❌ Error en prueba de conexión:', error);
      return false;
    }
  };

  // Debug: verificar permisos
  useEffect(() => {
    console.log('👤 Usuario actual:', {
      email: user?.mail,
      role: user?.role,
      roleLabel: user?.role === 1 ? 'Administrador' : user?.role,
      isMainAdmin: isMainAdmin
    });
  }, [user, isMainAdmin]);

  useEffect(() => {
    console.log('🔄 Iniciando listener de configuración en tiempo real...');
    const docRef = doc(db, 'system', 'settings');
    
    const unsub = onSnapshot(
      docRef, 
      (snap) => {
        console.log('📡 Snapshot recibido:', snap.exists());
        setIsConnected(true);
        
        if (snap.exists()) {
          const data = snap.data() as any;
          const enabled = data.gradesLoadingEnabled ?? false;
          const updated = data.updatedAt ?? Date.now();
          
          console.log('📡 Estado actualizado desde Firebase:', {
            enabled,
            updatedAt: new Date(updated).toLocaleString(),
            data: data,
            previousValue: previousValue.current,
            previousUpdated: previousUpdated.current,
            hasValueChanged: enabled !== previousValue.current,
            isNewUpdate: updated !== previousUpdated.current,
            canManageGrades,
            userUid: user?.uid
          });
          
          // Detectar si cambió el valor
          const hasValueChanged = previousValue.current !== null && enabled !== previousValue.current;
          const isNewUpdate = updated !== previousUpdated.current;
          
          console.log('🔍 Análisis de cambio:', {
            enabled,
            previousValue: previousValue.current,
            hasValueChanged,
            isNewUpdate,
            isInitialized: isInitialized.current,
            previousUpdated: previousUpdated.current,
            currentUpdated: updated,
            canManageGrades,
            userUid: user?.uid
          });
          
          // Actualizar el estado SIEMPRE (esto es lo más importante)
          setGradeLoadingEnabled(enabled);
          setLastUpdated(updated);
          
          // Mostrar notificación solo si:
          // 1. Ya se inicializó (no es la primera carga)
          // 2. El valor cambió
          // 3. Es una actualización nueva
          // 4. El usuario puede gestionar calificaciones
          if (isInitialized.current && hasValueChanged && isNewUpdate && canManageGrades && user?.uid) {
            console.log('🔔 Mostrando notificación por cambio de estado');
            
            if (enabled) {
              toast.success('¡La carga de notas está disponible!', {
                duration: 5000,
                icon: '📝',
                style: {
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '16px',
                },
              });
            } else {
              toast('La carga de notas ha sido deshabilitada', {
                duration: 5000,
                icon: '⏸️',
                style: {
                  background: '#f59e0b',
                  color: '#ffffff',
                  fontSize: '16px',
                },
              });
            }
          } else {
            console.log('🔕 No se muestra notificación:', {
              isInitialized: isInitialized.current,
              hasValueChanged,
              isNewUpdate,
              canManageGrades,
              userUid: user?.uid,
              enabled,
              previousValue: previousValue.current,
              previousUpdated: previousUpdated.current,
              currentUpdated: updated
            });
          }
          
          // Actualizar referencias para la próxima comparación
          previousValue.current = enabled;
          previousUpdated.current = updated;
          isInitialized.current = true; // Marcar como inicializado después del primer snapshot
          
        } else {
          // Si el documento no existe, crear uno con valores por defecto
          console.log('📝 Creando documento de configuración con valor por defecto');
          setDoc(docRef, {
            gradesLoadingEnabled: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }).catch((error) => {
            console.error('❌ Error al crear documento de configuración:', error);
            setIsConnected(false);
          });
        }
      },
      (error) => {
        console.error('❌ Error en listener de configuración:', error);
        setIsConnected(false);
      }
    );
    
    return () => {
      console.log('🛑 Desconectando listener de configuración');
      unsub();
    };
  }, [canManageGrades, user?.uid]);

  const toggleGradeLoading = async () => {
    // Verificar que es administrador (role === 1)
    if (!uid || user?.role !== 1) {
      console.warn('No se tiene permiso para cambiar el estado:', { uid, role: user?.role });
      toast.error('No tienes permisos para realizar esta acción');
      return;
    }

    // Calcular el nuevo valor antes de intentar actualizar
    const newValue = !gradeLoadingEnabled;
    const timestamp = Date.now();
    
    console.log('🔄 Preparando cambio de estado:', {
      currentValue: gradeLoadingEnabled,
      newValue: newValue,
      timestamp: timestamp,
      uid: uid,
      userRole: user?.role
    });

    try {
      const docRef = doc(db, 'system', 'settings');
      
      console.log('🔄 Cambiando estado de carga de notas a:', newValue, 'con timestamp:', timestamp);
      console.log('🔄 Usuario:', { uid, role: user?.role, email: user?.mail });
      
      await setDoc(docRef, {
        gradesLoadingEnabled: newValue,
        enabledBy: uid,
        enabledAt: timestamp,
        updatedAt: timestamp,
        // Agregar un campo adicional para forzar la actualización
        lastModified: timestamp,
      }, { merge: true });

      console.log('✅ Estado actualizado correctamente en Firebase con timestamp:', timestamp);
      
      // No mostrar notificación aquí porque ya la mostrará el Snapshot
      return;
    } catch (error: any) {
      console.error('❌ Error al actualizar el estado:', error);
      console.error('❌ Detalles del error:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        uid: uid,
        userRole: user?.role,
        newValue: newValue
      });
      
      // No cambiar el estado de conexión si falla la escritura
      const errorMessage = error?.code === 'permission-denied' 
        ? 'No tienes permisos para realizar esta acción'
        : error?.code === 'unavailable'
        ? 'Firebase no está disponible. Intenta de nuevo.'
        : error?.code === 'failed-precondition'
        ? 'Error de condición. Intenta de nuevo.'
        : `Error: ${error?.message || 'Error desconocido'}`;
        
      toast.error(errorMessage);
      // No re-lanzar el error para evitar que entre en el catch del componente
    }
  };

  const value = {
    gradeLoadingEnabled,
    toggleGradeLoading,
    isMainAdmin,
    isConnected,
    lastUpdated,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};


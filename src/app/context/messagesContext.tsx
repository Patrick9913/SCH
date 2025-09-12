'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, auth } from '../config';
import { addDoc, collection, onSnapshot, orderBy, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { DirectMessage } from '../types/message';
import { useAuthContext } from './authContext';

interface MessagesContextProps {
  directMessages: DirectMessage[];
  sendDirectMessage: (toUid: string, body: string) => Promise<void>;
}

const MessagesContext = createContext<MessagesContextProps | null>(null);

export const useMessages = () => {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages debe usarse dentro de MessagesProvider');
  return ctx;
};

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuthContext();
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);

  useEffect(() => {
    if (!uid) return; // ⚡ No crear suscripción hasta que uid exista

    console.log('Suscribiendo con uid:', uid);

    const col = collection(db, 'direct_messages');
    const q = query(
      col,
      where('participants', 'array-contains', uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      console.log('snapshot size', snap.size);
      const items: DirectMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          fromUid: data.fromUid,
          toUid: data.toUid,
          body: data.body,
          createdAt:
            typeof data.createdAt === 'number'
              ? data.createdAt
              : data.createdAt instanceof Timestamp
              ? data.createdAt.toMillis()
              : Date.now(),
          readBy: data.readBy ?? [],
        };
      });
      setDirectMessages(items);
    });

    return () => unsub();
  }, [uid]);


  const sendDirectMessage = async (toUid: string, body: string) => {
    const fromUid = uid ?? auth.currentUser?.uid;
    if (!fromUid) return;
    await addDoc(collection(db, 'direct_messages'), {
      fromUid,
      toUid,
      body: body.trim(),
      createdAt: Date.now(),
      participants: [fromUid, toUid],
    });
  };

  const value = useMemo(() => ({ directMessages, sendDirectMessage }), [directMessages]);
  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
};




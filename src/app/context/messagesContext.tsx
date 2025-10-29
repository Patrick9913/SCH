'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../config';
import { addDoc, collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { DirectMessage } from '../types/messages';
import { useAuthContext } from './authContext';

interface MessagesContextProps {
  directMessages: DirectMessage[];
  sendDirectMessage: (toUid: string, body: string) => Promise<void>;
}

const MessagesContext = createContext<MessagesContextProps | null>(null);

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) throw new Error('useMessages debe usarse dentro de MessagesProvider');
  return context;
};

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuthContext();
  const [ directMessages, setDirectMessages ] = useState<DirectMessage[]>([]);

  useEffect(() => {
    if (!uid) return;

    const col = collection(db, 'direct_messages');
    const q = query(
      col,
      where('participants', 'array-contains', uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const items: DirectMessage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          body: data.body,
          createdAt: data.createdAt,
          fromUid: data.fromUid,
          toUid: data.toUid,
          participants: data.participants || [data.fromUid, data.toUid], // 👈 clave
          readBy: data.readBy || []
        };
      });
      setDirectMessages(items);
    });

    return () => unsub();
  }, [uid]);


  const sendDirectMessage = async (toUid: string, body: string) => {
    if (!uid) return;
    await addDoc(collection(db, 'direct_messages'), {
      fromUid: uid,
      toUid,
      body: body.trim(),
      createdAt: Date.now(),
      participants: [uid, toUid],
    });
  };

  const value = useMemo(() => ({ directMessages, sendDirectMessage }), [directMessages]);
  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
};


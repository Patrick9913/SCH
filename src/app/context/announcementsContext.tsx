'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '../config';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Announcement } from '../types/announcement';
import { useAuthContext } from './authContext';

interface AnnouncementsContextProps {
  announcements: Announcement[];
  createAnnouncement: (data: { title: string; body?: string; audience: Announcement['audience']; }) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
}

const AnnouncementsContext = createContext<AnnouncementsContextProps | null>(null);

export const useAnnouncements = () => {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx) throw new Error('useAnnouncements debe usarse dentro de AnnouncementsProvider');
  return ctx;
};

export const AnnouncementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { user } = useAuthContext();

  useEffect(() => {
    const col = collection(db, 'announcements');
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: Announcement[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const createdAt = typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now());
        return {
          id: d.id,
          title: data.title,
          body: data.body,
          audience: data.audience ?? 'all',
          createdAt,
          createdByUid: data.createdByUid,
          createdByName: data.createdByName,
        } as Announcement;
      });
      setAnnouncements(items);
    });
    return () => unsub();
  }, []);

  const createAnnouncement = async (data: { title: string; body?: string; audience: Announcement['audience']; }) => {
    const col = collection(db, 'announcements');
    await addDoc(col, {
      title: data.title.trim(),
      body: data.body?.trim() ?? '',
      audience: data.audience,
      createdAt: Date.now(),
      createdByUid: user?.uid ?? auth.currentUser?.uid ?? 'unknown',
      createdByName: user?.name ?? 'Sistema',
    });
  };

  const deleteAnnouncement = async (id: string) => {
    await deleteDoc(doc(db, 'announcements', id));
  };

  const value = useMemo(() => ({ announcements, createAnnouncement, deleteAnnouncement }), [announcements]);

  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
};





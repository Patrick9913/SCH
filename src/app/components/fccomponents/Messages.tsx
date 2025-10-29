'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMessages } from '@/app/context/messagesContext';
import { useChat } from '@/app/context/chatContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { db } from '@/app/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';

export const Messages: React.FC = () => {
  const { directMessages, sendDirectMessage } = useMessages();
  const { currentChat, setCurrentChat } = useChat();
  const { users } = useTriskaContext();
  const { uid } = useAuthContext();
  const [tab, setTab] = useState<'received' | 'sent' | 'chats'>('chats');
  const [viewMode, setViewMode] = useState<'chats' | 'messages'>('chats');
  const uidToName = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.uid, u.name));
    return map;
  }, [users]);

  const received = useMemo(() => directMessages.filter((m) => m.toUid === uid), [directMessages, uid]);
  const sent = useMemo(() => directMessages.filter((m) => m.fromUid === uid), [directMessages, uid]);

  // Cache local de nombres faltantes
  const [fetchedNames, setFetchedNames] = useState<Record<string, string>>({});

  const getDisplayName = (someUid: string) => {
    return uidToName.get(someUid) || fetchedNames[someUid] || someUid;
  };

  useEffect(() => {
    const currentList = (tab === 'received' ? received : sent);
    const unknownUids = new Set<string>();
    currentList.forEach((m) => {
      const otherUid = tab === 'received' ? m.fromUid : m.toUid;
      if (!uidToName.get(otherUid) && !fetchedNames[otherUid]) {
        unknownUids.add(otherUid);
      }
    });
    if (unknownUids.size === 0) return;

    const fetchMissing = async () => {
      const col = collection(db, 'users');
      // Firestore no permite IN sobre campos no indexados a veces; iteramos individualmente
      const updates: Record<string, string> = {};
      await Promise.all(
        Array.from(unknownUids).map(async (u) => {
          const q = query(col, where('uid', '==', u));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data() as any;
            updates[u] = data.name || u;
          }
        })
      );
      if (Object.keys(updates).length > 0) {
        setFetchedNames((prev) => ({ ...prev, ...updates }));
      }
    };
    fetchMissing();
  }, [tab, received, sent, uidToName, fetchedNames]);

  // Manejar selección de chat
  const handleChatSelect = (chat: any) => {
    setCurrentChat(chat);
    setViewMode('chats');
  };

  // Manejar cambio de vista
  const handleViewModeChange = (mode: 'chats' | 'messages') => {
    setViewMode(mode);
    if (mode === 'messages') {
      setCurrentChat(null);
    }
  };

  return (
    <section className="flex-1 overflow-hidden max-h-screen h-full bg-white rounded-md">
      {/* Header */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mensajes</h2>
            <p className="text-gray-500 text-sm">Comunicación directa entre usuarios</p>
          </div>
          
          {/* Toggle entre chats y mensajes tradicionales */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('chats')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'chats'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => handleViewModeChange('messages')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'messages'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensajes
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex h-full">
        {viewMode === 'chats' ? (
          <>
            {/* Lista de chats */}
            <ChatList 
              onChatSelect={handleChatSelect}
              selectedChatId={currentChat?.id}
            />
            
            {/* Ventana de chat o mensaje de bienvenida */}
            <div className="flex-1 flex flex-col">
              {currentChat ? (
                <ChatWindow chat={currentChat} />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un chat</h3>
                    <p className="text-gray-500">Elige una conversación para comenzar a chatear</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Vista de mensajes tradicionales */
          <div className="flex-1 p-5 overflow-y-auto">
            {/* Composer */}
            <form
              className="mb-6 flex gap-2 flex-wrap items-center bg-gray-50 rounded-xl p-3 shadow-sm"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement & {
                  toUid: { value: string };
                  body: { value: string };
                };
                const toUid = form.toUid.value;
                const body = form.body.value;
                if (!toUid || !body.trim()) return;
                await sendDirectMessage(toUid, body);
                form.body.value = '';
              }}
            >
              <select name="toUid" className="px-3 py-2 rounded-lg bg-white shadow-sm focus:outline-none">
                <option value="">Seleccionar destinatario</option>
                {users
                  .filter((u) => u.uid !== uid)
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name}
                    </option>
                  ))}
              </select>
              <input name="body" placeholder="Escribe un mensaje..." className="px-3 py-2 rounded-lg bg-white shadow-sm flex-1 min-w-56 focus:outline-none" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2">Enviar</button>
            </form>

            {/* Tabs */}
            <div className="flex items-center gap-4 mb-4">
              <button
                className={`${tab === 'received' ? 'text-blue-700' : 'text-gray-500'} font-medium hover:text-blue-700`}
                onClick={() => setTab('received')}
                type="button"
              >
                Recibidos
              </button>
              <button
                className={`${tab === 'sent' ? 'text-blue-700' : 'text-gray-500'} font-medium hover:text-blue-700`}
                onClick={() => setTab('sent')}
                type="button"
              >
                Enviados
              </button>
            </div>

            {/* Lista de mensajes */}
            <div className="space-y-3">
              {(tab === 'received' ? received : sent).map((m) => (
                <div key={m.id} className="rounded-xl bg-gray-50 p-4 shadow-sm hover:shadow transition-shadow">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-500">{new Date(m.createdAt).toLocaleString()}</p>
                    <span className="text-xs text-gray-500">{tab === 'received' ? 'De' : 'Para'} {getDisplayName(tab === 'received' ? m.fromUid : m.toUid)}</span>
                  </div>
                  <p className="text-gray-900">{m.body}</p>
                </div>
              ))}
              {(tab === 'received' ? received : sent).length === 0 && (
                <p className="text-gray-500">No hay mensajes {tab === 'received' ? 'recibidos' : 'enviados'}.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};



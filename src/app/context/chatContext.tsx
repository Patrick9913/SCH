'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../config';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  arrayUnion
} from 'firebase/firestore';
import { Chat, ChatMessage } from '../types/messages';
import { useAuthContext } from './authContext';

interface ChatContextProps {
  chats: Chat[];
  currentChat: Chat | null;
  currentChatMessages: ChatMessage[];
  setCurrentChat: (chat: Chat | null) => void;
  createChat: (participantUid: string) => Promise<Chat>;
  sendMessage: (chatId: string, body: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  getChatWithUser: (userId: string) => Chat | null;
  isTyping: Record<string, boolean>;
  setTyping: (chatId: string, isTyping: boolean) => void;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextProps | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat debe usarse dentro de ChatProvider');
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuthContext();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});

  const getChatId = (a: string, b: string) => [a, b].sort().join('__');

  const buildChatFromData = (id: string, data: any): Chat => ({
    id,
    participants: data?.participants || [],
    lastMessage: data?.lastMessage,
    lastMessageAt: data?.lastMessageAt || data?.createdAt || 0,
    createdAt: data?.createdAt || Date.now(),
    isActive: data?.isActive !== false,
    unreadCount: data?.unreadCount || {},
  });

  const upsertChat = (chat: Chat) => {
    setChats((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === chat.id);
      if (existingIndex !== -1) {
        const clone = [...prev];
        clone[existingIndex] = { ...clone[existingIndex], ...chat };
        return clone;
      }
      return [chat, ...prev];
    });
  };

  // Suscripción a chats del usuario
  useEffect(() => {
    if (!uid) return;

    const col = collection(db, 'chats');
    // Temporalmente sin orderBy para evitar requerir índice compuesto
    // Los chats se ordenarán en memoria por lastMessageAt
    const q = query(
      col,
      where('participants', 'array-contains', uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const chatList: Chat[] = snap.docs.map((d) => buildChatFromData(d.id, d.data()));
      // Ordenar en memoria por lastMessageAt descendente
      chatList.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      setChats(chatList);
    });

    return () => unsub();
  }, [uid]);

  // Suscripción a mensajes del chat actual
  useEffect(() => {
    if (!currentChat || !uid) {
      setCurrentChatMessages([]);
      return;
    }

    const col = collection(db, 'chats', currentChat.id, 'messages');
    const q = query(col, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snap) => {
      const messages: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          body: data.body,
          createdAt: data.createdAt,
          fromUid: data.fromUid,
          chatId: data.chatId,
          readBy: data.readBy || [],
          messageType: data.messageType || 'text'
        };
      });
      setCurrentChatMessages(messages);
    });

    return () => unsub();
  }, [currentChat, uid]);

  // Crear un nuevo chat
  const createChat = async (participantUid: string): Promise<Chat> => {
    if (!uid) throw new Error('Usuario no autenticado');

    const participants = [uid, participantUid].sort();
    const chatId = getChatId(uid, participantUid);
    const chatRef = doc(db, 'chats', chatId);

    try {
      const snap = await getDoc(chatRef);
      if (snap.exists()) {
        const existingChat = buildChatFromData(chatId, snap.data());
        setCurrentChat(existingChat);
        upsertChat(existingChat);
        return existingChat;
      }

      const now = Date.now();
      const unreadCount = {
        [participants[0]]: 0,
        [participants[1]]: 0,
      };

      await setDoc(chatRef, {
        participants,
        createdAt: now,
        lastMessageAt: now,
        isActive: true,
        unreadCount,
      });

      const newChat: Chat = {
        id: chatId,
        participants,
        createdAt: now,
        lastMessageAt: now,
        isActive: true,
        unreadCount,
      };

      setCurrentChat(newChat);
      upsertChat(newChat);
      return newChat;
    } catch (error) {
      console.error('Error creando chat en Firestore:', error);
      throw error;
    }
  };

  // Enviar mensaje
  const sendMessage = async (chatId: string, body: string) => {
    if (!uid) return;

    const messageData = {
      body: body.trim(),
      fromUid: uid,
      chatId,
      createdAt: Date.now(),
      readBy: [uid],
      messageType: 'text'
    };

    // Agregar mensaje a la subcolección
    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

    // Actualizar el chat con el último mensaje
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: messageData,
      lastMessageAt: Date.now(),
      [`unreadCount.${uid}`]: 0
    });

    // Incrementar contador de no leídos para el otro participante
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      const otherParticipant = chat.participants.find(p => p !== uid);
      if (otherParticipant) {
        await updateDoc(chatRef, {
          [`unreadCount.${otherParticipant}`]: (chat.unreadCount[otherParticipant] || 0) + 1
        });
      }
    }
  };

  // Marcar mensajes como leídos
  const markAsRead = async (chatId: string) => {
    if (!uid || !currentChatMessages.length) return;

    const unreadMessages = currentChatMessages.filter(
      msg => msg.fromUid !== uid && !msg.readBy.includes(uid)
    );

    if (unreadMessages.length === 0) return;

    // Actualizar cada mensaje no leído
    const batch = unreadMessages.map(msg => {
      const messageRef = doc(db, 'chats', chatId, 'messages', msg.id);
      return updateDoc(messageRef, {
        readBy: arrayUnion(uid)
      });
    });

    await Promise.all(batch);

    // Resetear contador de no leídos
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${uid}`]: 0
    });
  };

  // Obtener chat con un usuario específico
  const getChatWithUser = (userId: string): Chat | null => {
    return chats.find(chat => 
      chat.participants.includes(userId) && 
      chat.participants.includes(uid!) &&
      chat.isActive
    ) || null;
  };

  // Manejar estado de escritura
  const setTyping = (chatId: string, typing: boolean) => {
    setIsTyping(prev => ({
      ...prev,
      [chatId]: typing
    }));
  };

  // Función para forzar actualización de chats
  const refreshChats = async () => {
    try {
      const col = collection(db, 'chats');
      const q = query(col, where('participants', 'array-contains', uid));
      await getDocs(q);
    } catch (error) {
      console.error('Error al forzar actualización:', error);
    }
  };

  // Marcar como leído cuando se cambia de chat
  useEffect(() => {
    if (currentChat) {
      markAsRead(currentChat.id);
    }
  }, [currentChat]);

  const value = useMemo(() => ({
    chats,
    currentChat,
    currentChatMessages,
    setCurrentChat,
    createChat,
    sendMessage,
    markAsRead,
    getChatWithUser,
    isTyping,
    setTyping,
    refreshChats
  }), [chats, currentChat, currentChatMessages, isTyping]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

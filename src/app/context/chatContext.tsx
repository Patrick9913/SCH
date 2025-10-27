'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, auth } from '../config';
import { 
  addDoc, 
  collection, 
  onSnapshot, 
  orderBy, 
  query, 
  where, 
  doc, 
  updateDoc, 
  getDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { Chat, ChatMessage, ChatParticipant } from '../types/messages';
import { useAuthContext } from './authContext';
import { useTriskaContext } from './triskaContext';

interface ChatContextProps {
  chats: Chat[];
  currentChat: Chat | null;
  currentChatMessages: ChatMessage[];
  setCurrentChat: (chat: Chat | null) => void;
  createChat: (participantUid: string) => Promise<string>;
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
  const { users } = useTriskaContext();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});

  // Mapeo de usuarios para obtener nombres
  const uidToUser = useMemo(() => {
    const map = new Map<string, ChatParticipant>();
    users.forEach((u) => map.set(u.uid, { uid: u.uid, name: u.name }));
    return map;
  }, [users]);

  // Suscripción a chats del usuario
  useEffect(() => {
    if (!uid) return;

    const col = collection(db, 'chats');
    const q = query(
      col,
      where('participants', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const chatList: Chat[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          participants: data.participants || [],
          lastMessage: data.lastMessage,
          lastMessageAt: data.lastMessageAt || data.createdAt,
          createdAt: data.createdAt,
          isActive: data.isActive !== false,
          unreadCount: data.unreadCount || {}
        };
      });
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
  const createChat = async (participantUid: string): Promise<string> => {
    if (!uid) throw new Error('Usuario no autenticado');

    // Verificar si ya existe un chat con este usuario
    const existingChat = getChatWithUser(participantUid);
    if (existingChat) {
      setCurrentChat(existingChat);
      return existingChat.id;
    }

    const chatData = {
      participants: [uid, participantUid],
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      isActive: true,
      unreadCount: { [uid]: 0, [participantUid]: 0 }
    };

    console.log('Creando chat en Firestore con datos:', chatData);
    const docRef = await addDoc(collection(db, 'chats'), chatData);
    console.log('Chat creado en Firestore con ID:', docRef.id);
    
    // Crear un objeto chat temporal para seleccionarlo inmediatamente
    const tempChat: Chat = {
      id: docRef.id,
      participants: [uid, participantUid],
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      isActive: true,
      unreadCount: { [uid]: 0, [participantUid]: 0 }
    };
    
    console.log('Estableciendo chat actual:', tempChat);
    setCurrentChat(tempChat);
    
    // Agregar el chat temporal a la lista local para evitar el problema de sincronización
    setChats(prevChats => {
      const existingChat = prevChats.find(c => c.id === docRef.id);
      if (!existingChat) {
        return [tempChat, ...prevChats];
      }
      return prevChats;
    });
    
    return docRef.id;
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

  // Función para forzar actualización de chats (debugging)
  const refreshChats = async () => {
    console.log('Forzando actualización de chats...');
    try {
      const col = collection(db, 'chats');
      const q = query(col, where('participants', 'array-contains', uid));
      const snap = await getDocs(q);
      console.log('Chats encontrados al forzar actualización:', snap.size);
      snap.docs.forEach(doc => {
        console.log('Chat encontrado:', doc.id, doc.data());
      });
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
  }), [chats, currentChat, currentChatMessages, isTyping, uidToUser]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

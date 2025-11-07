'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useChat } from '@/app/context/chatContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { Chat, ChatMessage } from '@/app/types/messages';
import { HiArrowLeft } from 'react-icons/hi';

interface ChatWindowProps {
  chat: Chat;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack }) => {
  const { currentChatMessages, sendMessage } = useChat();
  const { users } = useTriskaContext();
  const { uid } = useAuthContext();
  const [messageText, setMessageText] = useState('');
  const otherUserTyping = false; // TODO: Implementar sistema de typing indicator
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mapeo de usuarios para obtener nombres
  const uidToName = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.uid, u.name));
    return map;
  }, [users]);

  // Obtener el otro participante
  const otherParticipant = chat.participants.find(p => p !== uid);
  const otherParticipantName = otherParticipant ? uidToName.get(otherParticipant) || 'Usuario desconocido' : 'Usuario';

  // Scroll automático al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChatMessages]);

  // Manejar envío de mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setMessageText('');
    await sendMessage(chat.id, messageText);
  };

  // Manejar cambios en el input de mensaje
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageText(value);

    // TODO: Implementar sistema de "escribiendo" más adelante
    // Por ahora solo manejamos el texto del mensaje
  };

  // Formatear hora del mensaje
  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Verificar si un mensaje es del usuario actual
  const isMyMessage = (message: ChatMessage) => message.fromUid === uid;

  // Verificar si un mensaje ha sido leído
  const isMessageRead = (message: ChatMessage) => {
    return message.readBy.includes(otherParticipant!) || message.fromUid !== uid;
  };

  return (
    <div className="flex flex-col h-full bg-gray-100/70">
      {/* Header del chat */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Volver a la lista de chats"
            >
              <HiArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
            {otherParticipantName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{otherParticipantName}</h3>
            <p className="text-sm text-gray-500">
              {otherParticipant ? 'En línea' : 'Última vez hace un momento'}
            </p>
          </div>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 bg-gradient-to-br from-[#f0f4f9] via-[#f6f9fc] to-[#eef2f7]">
        {currentChatMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="w-14 h-14 mx-auto mb-4 bg-white/80 border border-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-medium text-gray-700">La conversación está vacía</p>
            <p className="text-sm">Escribe un mensaje para comenzar el chat.</p>
          </div>
        ) : (
          currentChatMessages.map((message, index) => {
            const isMyMsg = isMyMessage(message);
            const prevMessage = index > 0 ? currentChatMessages[index - 1] : null;
            const showAvatar = !prevMessage || prevMessage.fromUid !== message.fromUid;

            return (
              <div
                key={message.id}
                className={`flex ${isMyMsg ? 'justify-end' : 'justify-start'} ${
                  showAvatar ? 'mt-4' : 'mt-1'
                }`}
              >
                <div className={`flex max-w-xs sm:max-w-sm lg:max-w-md ${isMyMsg ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isMyMsg && showAvatar && (
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 mr-2">
                      {otherParticipantName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {!isMyMsg && !showAvatar && <div className="w-8 mr-2" />}

                  {/* Mensaje */}
                  <div className={`flex flex-col ${isMyMsg ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isMyMsg
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.body}</p>
                    </div>
                    
                    {/* Timestamp y estado de lectura */}
                    <div className={`flex items-center space-x-1 mt-1 ${isMyMsg ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[11px] text-gray-400">
                        {formatMessageTime(message.createdAt)}
                      </span>
                      {isMyMsg && (
                        <div className="flex items-center">
                          {isMessageRead(message) ? (
                            <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Indicador de escritura - solo mostrar si el otro participante está escribiendo */}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 bg-gray-200 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-gray-600">{otherParticipantName} está escribiendo...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="text"
            value={messageText}
            onChange={handleMessageChange}
            placeholder="Escribe un mensaje"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
          <button
            type="submit"
            disabled={!messageText.trim()}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-full px-5 py-2 font-medium transition-colors"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

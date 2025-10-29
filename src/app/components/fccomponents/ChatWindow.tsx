'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useChat } from '@/app/context/chatContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { Chat, ChatMessage } from '@/app/types/messages';

interface ChatWindowProps {
  chat: Chat;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat }) => {
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

    await sendMessage(chat.id, messageText);
    setMessageText('');
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
    <div className="flex flex-col h-full bg-white">
      {/* Header del chat */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentChatMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No hay mensajes aún</p>
            <p className="text-sm">¡Envía el primer mensaje!</p>
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
                <div className={`flex max-w-xs lg:max-w-md ${isMyMsg ? 'flex-row-reverse' : 'flex-row'}`}>
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
                      <span className="text-xs text-gray-500">
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
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={messageText}
            onChange={handleMessageChange}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!messageText.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg px-6 py-2 font-medium transition-colors"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useState } from 'react';
import { useChat } from '@/app/context/chatContext';
import { useAuthContext } from '@/app/context/authContext';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { hasPermission } from '@/app/utils/rolePermissions';
import { HiChatAlt2 } from 'react-icons/hi';
import { User } from '@/app/types/user';

const MessagesContent: React.FC = () => {
  const { currentChat, setCurrentChat, createChat } = useChat();
  const [viewMode, setViewMode] = useState<'list' | 'chat'>(currentChat ? 'chat' : 'list');

  useEffect(() => {
    setViewMode(currentChat ? 'chat' : 'list');
  }, [currentChat]);

  const handleUserSelect = async (user: User) => {
    try {
      const chat = await createChat(user.uid);
      setCurrentChat(chat);
      setViewMode('chat');
    } catch (error) {
      console.error('No se pudo abrir el chat:', error);
    }
  };

  const handleGoBack = () => {
    setCurrentChat(null);
    setViewMode('list');
  };

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <HiChatAlt2 className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Mensajes</h1>
        </div>
        <p className="text-sm text-gray-500">Comunicación directa entre usuarios autorizados.</p>
      </div>

      {viewMode === 'list' && (
        <div className="min-h-[60vh]">
          <ChatList onUserSelect={handleUserSelect} selectedChatId={currentChat?.id} />
        </div>
      )}

      {viewMode === 'chat' && currentChat && (
        <div className="min-h-[60vh]">
          <ChatWindow chat={currentChat} onBack={handleGoBack} />
        </div>
      )}

      {viewMode === 'chat' && !currentChat && (
        <div className="border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col min-h-[60vh]">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6 py-10 max-w-sm">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chat no disponible</h3>
              <p className="text-sm text-gray-500">El chat seleccionado ya no existe. Regresa a la lista para elegir otro contacto.</p>
              <button
                type="button"
                onClick={handleGoBack}
                className="mt-4 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Volver a la lista
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export const Messages: React.FC = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <section className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">Cargando mensajería...</p>
      </section>
    );
  }

  const canAccessMessaging = hasPermission(user?.role, 'canSendMessages');

  if (!canAccessMessaging) {
    return (
      <section className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md p-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Acceso restringido</h1>
          <p className="text-gray-500">
            No tienes permisos para utilizar el módulo de mensajería. Si crees que se trata de un error, comunícate con un administrador.
          </p>
        </div>
      </section>
    );
  }

  return <MessagesContent />;
};

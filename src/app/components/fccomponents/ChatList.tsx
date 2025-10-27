'use client';

import React from 'react';

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: Date;
}

interface ChatListProps {
  onChatSelect: (chat: Chat) => void;
  selectedChatId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onChatSelect, selectedChatId }) => {
  // Por ahora, retornamos una lista vacía
  // Esto se puede implementar más tarde con datos reales
  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversaciones</h3>
      <div className="space-y-2">
        <p className="text-gray-500 text-sm">No hay conversaciones disponibles</p>
      </div>
    </div>
  );
};

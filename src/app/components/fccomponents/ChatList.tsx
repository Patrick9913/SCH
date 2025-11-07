'use client';

import React, { useMemo, useState } from 'react';
import { useChat } from '@/app/context/chatContext';
import { useAuthContext } from '@/app/context/authContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { RolePermissions, getRoleName } from '@/app/utils/rolePermissions';
import { User, UserRole } from '@/app/types/user';

const MESSAGING_ALLOWED_ROLES = new Set<number>(RolePermissions.canSendMessages);

const ROLE_FILTER_OPTIONS: Array<{ value: 'all' | UserRole; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: UserRole.SuperAdmin, label: 'Super administradores' },
  { value: UserRole.Administrador, label: 'Administradores' },
  { value: UserRole.Staff, label: 'Staff' },
  { value: UserRole.Docente, label: 'Docentes' },
  { value: UserRole.Familia, label: 'Familia' },
  { value: UserRole.Seguridad, label: 'Seguridad' },
];

interface ChatListProps {
  onUserSelect: (user: User) => void;
  selectedChatId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onUserSelect, selectedChatId }) => {
  const { chats } = useChat();
  const { uid } = useAuthContext();
  const { users } = useTriskaContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  const getChatId = (a: string, b: string) => [a, b].sort().join('__');

  const uidToUser = useMemo(() => {
    const map = new Map<string, (typeof users)[number]>();
    users.forEach((user) => map.set(user.uid, user));
    return map;
  }, [users]);

  const contacts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const allowedUsers = users.filter((user) =>
      user.uid !== uid &&
      typeof user.role === 'number' &&
      MESSAGING_ALLOWED_ROLES.has(user.role)
    );

    const filteredByRole = roleFilter === 'all'
      ? allowedUsers
      : allowedUsers.filter((user) => user.role === roleFilter);

    const entries = filteredByRole.map((user) => {
      const existingChat = chats.find((chat) => chat.participants.includes(user.uid));
      const lastMessage = existingChat?.lastMessage?.body || (existingChat ? 'Sin mensajes' : 'Inicia una conversación');
      const lastMessageAt = existingChat?.lastMessageAt || existingChat?.createdAt || 0;
      const unread = uid ? existingChat?.unreadCount?.[uid] || 0 : 0;

      return {
        user,
        chat: existingChat || null,
        displayName: user.name,
        normalizedName: user.name.toLowerCase(),
        lastMessage,
        lastMessageAt,
        unread,
      };
    });

    const filtered = term
      ? entries.filter((entry) => entry.normalizedName.includes(term))
      : entries;

    filtered.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

    return filtered;
  }, [users, chats, uid, searchTerm, roleFilter]);

  const handleSelect = (entry: (typeof contacts)[number]) => {
    onUserSelect(entry.user);
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'Sin actividad';
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60 * 1000) return 'Hace un momento';
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `Hace ${minutes} min`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="border border-gray-200 rounded-2xl bg-white shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50/60">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Conversaciones</h3>
          {contacts.length > 0 && (
            <span className="text-xs text-gray-500">{contacts.length}</span>
          )}
        </div>
        <div className="space-y-3">
          <div className="relative">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1016.65 16.65z" />
            </svg>
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                const value = e.target.value;
                setRoleFilter(value === 'all' ? 'all' : Number(value) as UserRole);
              }}
              className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ROLE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-gray-50/40">
        {contacts.length === 0 ? (
          <div className="mt-8 text-center text-gray-500 text-sm bg-gray-50/80 border border-dashed border-gray-200 rounded-xl py-6">
            No hay conversaciones disponibles
          </div>
        ) : (
          contacts.map((entry) => {
            const { chat, user, displayName, lastMessage, unread, lastMessageAt } = entry;
            const candidateId = uid ? getChatId(uid, user.uid) : null;
            const selectedId = chat ? chat.id : candidateId;
            const isSelected = selectedChatId && selectedId ? selectedChatId === selectedId : false;
            const timestampLabel = lastMessageAt ? formatTimestamp(lastMessageAt) : '';

            return (
              <button
                key={chat ? chat.id : `contact-${user.uid}`}
                onClick={() => handleSelect(entry)}
                className={`w-full text-left p-3 rounded-xl border transition-colors shadow-sm ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/80'
                    : 'border-transparent bg-white hover:border-blue-200/60 hover:bg-blue-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {displayName}
                    </p>
                    {typeof user.role === 'number' && (
                      <span className="text-xs text-gray-400">{getRoleName(user.role)}</span>
                    )}
                  </div>
                  <div className="text-right">
                    {timestampLabel && <p className="text-xs text-gray-400">{timestampLabel}</p>}
                    {chat && unread > 0 && (
                      <span className="inline-flex items-center justify-center text-xs font-semibold text-white bg-blue-600 rounded-full px-2 py-0.5">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 line-clamp-2">{lastMessage}</p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

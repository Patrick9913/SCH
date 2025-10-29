'use client';

import React, { useState } from 'react';
import { HiRefresh } from 'react-icons/hi';

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  tooltip?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  className = '',
  size = 'md',
  disabled = false,
  tooltip = 'Actualizar datos'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (disabled || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error al actualizar:', error);
    } finally {
      // Pequeño delay para mostrar la animación
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={disabled || isRefreshing}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        bg-blue-500 hover:bg-blue-600 
        disabled:bg-gray-400 disabled:cursor-not-allowed
        text-white rounded-lg
        transition-all duration-200
        hover:scale-105 active:scale-95
        ${className}
      `}
      title={tooltip}
    >
      <HiRefresh 
        className={`
          ${iconSizeClasses[size]}
          transition-transform duration-300
          ${isRefreshing ? 'animate-spin' : ''}
        `}
      />
    </button>
  );
};

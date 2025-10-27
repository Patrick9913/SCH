# Sistema de Chats en Tiempo Real

## Descripción

Se ha implementado un sistema completo de chats en tiempo real que permite a los usuarios tener conversaciones continuas, similar a aplicaciones como WhatsApp o Telegram. El sistema incluye:

## Características Principales

### 🚀 Funcionalidades Implementadas

1. **Chats en Tiempo Real**
   - Conversaciones continuas entre usuarios
   - Mensajes sincronizados instantáneamente
   - Indicadores de "escribiendo..."

2. **Gestión de Conversaciones**
   - Lista de chats con vista previa del último mensaje
   - Contadores de mensajes no leídos
   - Timestamps de última actividad

3. **Interfaz Dual**
   - Modo "Chats": Sistema de conversaciones en tiempo real
   - Modo "Mensajes": Sistema tradicional de mensajería

4. **Indicadores de Estado**
   - Mensajes leídos/no leídos
   - Estado de escritura en tiempo real
   - Contadores de mensajes no leídos

5. **Creación de Chats**
   - Iniciar nuevas conversaciones con cualquier usuario
   - Búsqueda de usuarios disponibles
   - Prevención de chats duplicados

## Estructura de Archivos

### Nuevos Archivos Creados

```
src/app/
├── context/
│   └── chatContext.tsx          # Contexto para gestión de chats
├── components/fccomponents/
│   ├── ChatList.tsx             # Lista de conversaciones
│   └── ChatWindow.tsx           # Ventana de chat individual
└── types/
    └── messages.tsx             # Tipos actualizados para chats
```

### Archivos Modificados

```
src/app/
├── components/fccomponents/
│   └── Messages.tsx             # Integración del sistema de chats
├── layout.tsx                   # Agregado ChatProvider
└── types/
    └── messages.tsx             # Nuevos tipos de datos
```

## Estructura de Base de Datos

### Colección `chats`
```javascript
{
  id: "chat_id",
  participants: ["uid1", "uid2"],
  lastMessage: {
    id: "message_id",
    body: "Contenido del mensaje",
    fromUid: "uid1",
    createdAt: timestamp,
    readBy: ["uid1"]
  },
  lastMessageAt: timestamp,
  createdAt: timestamp,
  isActive: true,
  unreadCount: {
    "uid1": 0,
    "uid2": 3
  }
}
```

### Subcolección `chats/{chatId}/messages`
```javascript
{
  id: "message_id",
  body: "Contenido del mensaje",
  fromUid: "uid1",
  chatId: "chat_id",
  createdAt: timestamp,
  readBy: ["uid1", "uid2"],
  messageType: "text"
}
```

## Uso del Sistema

### Para Usuarios

1. **Iniciar un Chat**
   - Hacer clic en "Nuevo Chat"
   - Buscar y seleccionar un usuario
   - Comenzar a escribir

2. **Navegar entre Chats**
   - Ver lista de conversaciones en el panel izquierdo
   - Hacer clic en cualquier chat para abrirlo
   - Los contadores muestran mensajes no leídos

3. **Enviar Mensajes**
   - Escribir en el campo de texto
   - Presionar Enter o hacer clic en "Enviar"
   - Los mensajes aparecen instantáneamente

4. **Cambiar entre Modos**
   - Usar el toggle "Chats" / "Mensajes" en el header
   - Los chats ofrecen conversaciones continuas
   - Los mensajes ofrecen el sistema tradicional

### Para Desarrolladores

#### Usar el Contexto de Chat

```typescript
import { useChat } from '@/app/context/chatContext';

const MyComponent = () => {
  const { 
    chats, 
    currentChat, 
    createChat, 
    sendMessage 
  } = useChat();
  
  // Crear un nuevo chat
  const handleCreateChat = async (userId: string) => {
    const chatId = await createChat(userId);
    console.log('Chat creado:', chatId);
  };
  
  // Enviar un mensaje
  const handleSendMessage = async (chatId: string, message: string) => {
    await sendMessage(chatId, message);
  };
};
```

#### Tipos de Datos

```typescript
interface Chat {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  lastMessageAt: number;
  createdAt: number;
  isActive: boolean;
  unreadCount: Record<string, number>;
}

interface ChatMessage {
  id: string;
  body: string;
  createdAt: number;
  fromUid: string;
  chatId: string;
  readBy: string[];
  messageType?: 'text' | 'image' | 'file';
}
```

## Configuración de Firebase

### Reglas de Seguridad

El archivo `firestore.rules` incluye reglas específicas para:
- Acceso a chats solo para participantes
- Lectura/escritura de mensajes
- Validación de permisos de usuario

### Despliegue de Reglas

```bash
firebase deploy --only firestore:rules
```

## Características Técnicas

### Tiempo Real
- Utiliza `onSnapshot` de Firestore para actualizaciones en tiempo real
- Sincronización automática entre dispositivos
- Optimización de re-renders con `useMemo`

### Gestión de Estado
- Context API para estado global de chats
- Estado local para UI (modales, formularios)
- Persistencia en Firebase

### UX/UI
- Diseño responsive y moderno
- Indicadores visuales de estado
- Animaciones suaves
- Accesibilidad mejorada

## Próximas Mejoras Sugeridas

1. **Notificaciones Push**
   - Alertas cuando el usuario no está en la app
   - Configuración de preferencias de notificación

2. **Archivos Multimedia**
   - Envío de imágenes
   - Envío de archivos
   - Vista previa de medios

3. **Chats Grupales**
   - Múltiples participantes
   - Administración de grupos
   - Nombres personalizados

4. **Funcionalidades Avanzadas**
   - Respuestas a mensajes específicos
   - Edición de mensajes
   - Eliminación de mensajes
   - Búsqueda en conversaciones

5. **Optimizaciones**
   - Paginación de mensajes
   - Compresión de imágenes
   - Modo offline
   - Sincronización diferencial

## Solución de Problemas

### Problemas Comunes

1. **Los mensajes no aparecen**
   - Verificar conexión a Firebase
   - Revisar reglas de seguridad
   - Comprobar autenticación del usuario

2. **Los chats no se crean**
   - Verificar que el usuario esté autenticado
   - Comprobar permisos en Firestore
   - Revisar logs de la consola

3. **Problemas de rendimiento**
   - Verificar que se estén usando `useMemo` correctamente
   - Revisar suscripciones de Firestore
   - Comprobar re-renders innecesarios

### Logs de Debug

El sistema incluye logs detallados en la consola para facilitar el debugging:
- Creación de chats
- Envío de mensajes
- Actualizaciones de estado
- Errores de Firebase


import { AppState, AppAction } from '../../shared/types';

type ConversationAction = Extract<AppAction,
  | { type: 'ADD_CHAT_MESSAGE' }
  | { type: 'APPEND_CHAT_CHUNK' }
  | { type: 'SET_CHAT_LOADING' }
  | { type: 'SET_CONVERSATIONS' }
  | { type: 'ADD_CONVERSATION' }
  | { type: 'REMOVE_CONVERSATION' }
  | { type: 'RENAME_CONVERSATION' }
  | { type: 'SET_ACTIVE_CONVERSATION' }
  | { type: 'SET_CHAT_MESSAGES' }
  | { type: 'SET_AVAILABLE_MODELS' }
  | { type: 'SET_SELECTED_MODEL' }
>;

export function conversationReducer(state: AppState, action: ConversationAction): AppState {
  switch (action.type) {
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload.message] };

    case 'APPEND_CHAT_CHUNK':
      return {
        ...state,
        chatMessages: state.chatMessages.map(m =>
          m.id === action.payload.messageId
            ? { ...m, content: m.content + action.payload.content }
            : m
        ),
      };

    case 'SET_CHAT_LOADING':
      return { ...state, chatLoading: action.payload.loading };

    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload.conversations };

    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload.conversation, ...state.conversations],
        activeConversationId: action.payload.conversation.id,
        chatMessages: [],
      };

    case 'REMOVE_CONVERSATION': {
      const filtered = state.conversations.filter(c => c.id !== action.payload.id);
      const wasActive = state.activeConversationId === action.payload.id;
      return {
        ...state,
        conversations: filtered,
        activeConversationId: wasActive ? (filtered[0]?.id ?? null) : state.activeConversationId,
        chatMessages: wasActive ? [] : state.chatMessages,
      };
    }

    case 'RENAME_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.payload.id ? { ...c, title: action.payload.title } : c
        ),
      };

    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload.id, chatMessages: [] };

    case 'SET_CHAT_MESSAGES':
      return { ...state, chatMessages: action.payload.messages };

    case 'SET_AVAILABLE_MODELS':
      return { ...state, availableModels: action.payload.models };

    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: action.payload.model };

    default:
      return state;
  }
}

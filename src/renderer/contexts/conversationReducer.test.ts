import { conversationReducer } from './conversationReducer';
import { initialState } from './AppStateContext';
import { AppState } from '../../shared/types';

describe('conversationReducer', () => {
  describe('ADD_CHAT_MESSAGE', () => {
    it('should add a chat message', () => {
      const message = { id: 'msg-1', role: 'user' as const, content: 'Hello', timestamp: Date.now() };
      const state = conversationReducer(initialState, {
        type: 'ADD_CHAT_MESSAGE',
        payload: { message },
      });

      expect(state.chatMessages).toHaveLength(1);
      expect(state.chatMessages[0]).toEqual(message);
    });
  });

  describe('APPEND_CHAT_CHUNK', () => {
    it('should append content to a specific message', () => {
      const msg = { id: 'msg-1', role: 'assistant' as const, content: 'Hi', timestamp: Date.now() };
      const state: AppState = { ...initialState, chatMessages: [msg] };

      const result = conversationReducer(state, {
        type: 'APPEND_CHAT_CHUNK',
        payload: { messageId: 'msg-1', content: ' there' },
      });

      expect(result.chatMessages[0].content).toBe('Hi there');
    });

    it('should not modify other messages', () => {
      const m1 = { id: 'msg-1', role: 'user' as const, content: 'A', timestamp: 1 };
      const m2 = { id: 'msg-2', role: 'assistant' as const, content: 'B', timestamp: 2 };
      const state: AppState = { ...initialState, chatMessages: [m1, m2] };

      const result = conversationReducer(state, {
        type: 'APPEND_CHAT_CHUNK',
        payload: { messageId: 'msg-2', content: 'C' },
      });

      expect(result.chatMessages[0].content).toBe('A');
      expect(result.chatMessages[1].content).toBe('BC');
    });
  });

  describe('SET_CHAT_LOADING', () => {
    it('should set chat loading state', () => {
      const state = conversationReducer(initialState, {
        type: 'SET_CHAT_LOADING',
        payload: { loading: true },
      });
      expect(state.chatLoading).toBe(true);
    });
  });

  describe('SET_CONVERSATIONS', () => {
    it('should replace conversations array', () => {
      const convos = [
        { id: 'c1', title: 'Chat 1', createdAt: 1, updatedAt: 1 },
        { id: 'c2', title: 'Chat 2', createdAt: 2, updatedAt: 2 },
      ];

      const state = conversationReducer(initialState, {
        type: 'SET_CONVERSATIONS',
        payload: { conversations: convos },
      });

      expect(state.conversations).toEqual(convos);
    });
  });

  describe('ADD_CONVERSATION', () => {
    it('should prepend conversation, set active, and clear messages', () => {
      const existing = { id: 'c1', title: 'Old', createdAt: 1, updatedAt: 1 };
      const newConvo = { id: 'c2', title: 'New', createdAt: 2, updatedAt: 2 };
      const state: AppState = {
        ...initialState,
        conversations: [existing],
        activeConversationId: 'c1',
        chatMessages: [{ id: 'm1', role: 'user' as const, content: 'hi', timestamp: 1 }],
      };

      const result = conversationReducer(state, {
        type: 'ADD_CONVERSATION',
        payload: { conversation: newConvo },
      });

      expect(result.conversations[0]).toEqual(newConvo);
      expect(result.conversations).toHaveLength(2);
      expect(result.activeConversationId).toBe('c2');
      expect(result.chatMessages).toEqual([]);
    });
  });

  describe('REMOVE_CONVERSATION', () => {
    it('should remove conversation and fallback active to first remaining', () => {
      const state: AppState = {
        ...initialState,
        conversations: [
          { id: 'c1', title: 'A', createdAt: 1, updatedAt: 1 },
          { id: 'c2', title: 'B', createdAt: 2, updatedAt: 2 },
        ],
        activeConversationId: 'c1',
        chatMessages: [{ id: 'm1', role: 'user', content: 'hi', timestamp: 1 }],
      };

      const result = conversationReducer(state, {
        type: 'REMOVE_CONVERSATION',
        payload: { id: 'c1' },
      });

      expect(result.conversations).toHaveLength(1);
      expect(result.activeConversationId).toBe('c2');
      expect(result.chatMessages).toEqual([]);
    });

    it('should not change active or messages when non-active removed', () => {
      const state: AppState = {
        ...initialState,
        conversations: [
          { id: 'c1', title: 'A', createdAt: 1, updatedAt: 1 },
          { id: 'c2', title: 'B', createdAt: 2, updatedAt: 2 },
        ],
        activeConversationId: 'c1',
        chatMessages: [{ id: 'm1', role: 'user', content: 'hi', timestamp: 1 }],
      };

      const result = conversationReducer(state, {
        type: 'REMOVE_CONVERSATION',
        payload: { id: 'c2' },
      });

      expect(result.activeConversationId).toBe('c1');
      expect(result.chatMessages).toHaveLength(1);
    });

    it('should set active to null when last conversation removed', () => {
      const state: AppState = {
        ...initialState,
        conversations: [{ id: 'c1', title: 'A', createdAt: 1, updatedAt: 1 }],
        activeConversationId: 'c1',
      };

      const result = conversationReducer(state, {
        type: 'REMOVE_CONVERSATION',
        payload: { id: 'c1' },
      });

      expect(result.conversations).toHaveLength(0);
      expect(result.activeConversationId).toBeNull();
    });
  });

  describe('RENAME_CONVERSATION', () => {
    it('should update conversation title', () => {
      const state: AppState = {
        ...initialState,
        conversations: [{ id: 'c1', title: 'Old', createdAt: 1, updatedAt: 1 }],
      };

      const result = conversationReducer(state, {
        type: 'RENAME_CONVERSATION',
        payload: { id: 'c1', title: 'New Title' },
      });

      expect(result.conversations[0].title).toBe('New Title');
    });
  });

  describe('SET_ACTIVE_CONVERSATION', () => {
    it('should set active conversation and clear messages', () => {
      const state: AppState = {
        ...initialState,
        conversations: [
          { id: 'c1', title: 'A', createdAt: 1, updatedAt: 1 },
          { id: 'c2', title: 'B', createdAt: 2, updatedAt: 2 },
        ],
        activeConversationId: 'c1',
        chatMessages: [{ id: 'm1', role: 'user', content: 'hi', timestamp: 1 }],
      };

      const result = conversationReducer(state, {
        type: 'SET_ACTIVE_CONVERSATION',
        payload: { id: 'c2' },
      });

      expect(result.activeConversationId).toBe('c2');
      expect(result.chatMessages).toEqual([]);
    });
  });

  describe('SET_CHAT_MESSAGES', () => {
    it('should replace chat messages array', () => {
      const messages = [
        { id: 'm1', role: 'user' as const, content: 'hello', timestamp: 1 },
        { id: 'm2', role: 'assistant' as const, content: 'hi', timestamp: 2 },
      ];

      const state = conversationReducer(initialState, {
        type: 'SET_CHAT_MESSAGES',
        payload: { messages },
      });

      expect(state.chatMessages).toEqual(messages);
    });
  });

  describe('SET_AVAILABLE_MODELS', () => {
    it('should set available models', () => {
      const models = [{ id: 'gpt-4o', name: 'GPT-4o' }];
      const state = conversationReducer(initialState, {
        type: 'SET_AVAILABLE_MODELS',
        payload: { models },
      });
      expect(state.availableModels).toEqual(models);
    });
  });

  describe('SET_SELECTED_MODEL', () => {
    it('should set selected model', () => {
      const state = conversationReducer(initialState, {
        type: 'SET_SELECTED_MODEL',
        payload: { model: 'gpt-4o' },
      });
      expect(state.selectedModel).toBe('gpt-4o');
    });

    it('should clear selected model', () => {
      const state: AppState = { ...initialState, selectedModel: 'gpt-4o' };
      const result = conversationReducer(state, {
        type: 'SET_SELECTED_MODEL',
        payload: { model: null },
      });
      expect(result.selectedModel).toBeNull();
    });
  });

  describe('default', () => {
    it('should return state unchanged for unknown actions', () => {
      const result = conversationReducer(initialState, { type: 'UNKNOWN' } as any);
      expect(result).toBe(initialState);
    });
  });
});

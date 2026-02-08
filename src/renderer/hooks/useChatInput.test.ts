import { renderHook, act } from '@testing-library/react';
import { useChatInput } from './useChatInput';
import { AppState, AppAction } from '../../shared/types';
import { initialState } from '../contexts/AppStateContext';

describe('useChatInput', () => {
  let dispatch: jest.Mock;
  let mockSend: jest.Mock;
  let mockStop: jest.Mock;

  beforeEach(() => {
    dispatch = jest.fn();
    mockSend = jest.fn();
    mockStop = jest.fn();
    (window as any).electronAPI = {
      copilot: { send: mockSend, stop: mockStop },
    };
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const baseState: AppState = {
    ...initialState,
    activeConversationId: 'conv-1',
    conversations: [{ id: 'conv-1', title: 'Test', createdAt: 500, updatedAt: 500 }],
    selectedModel: 'gpt-4',
  };

  it('should manage input value state', () => {
    const { result } = renderHook(() => useChatInput(baseState, dispatch));

    expect(result.current.inputValue).toBe('');

    act(() => result.current.setInputValue('hello'));
    expect(result.current.inputValue).toBe('hello');
  });

  it('should not send when input is empty', () => {
    const { result } = renderHook(() => useChatInput(baseState, dispatch));

    act(() => result.current.handleSend());

    expect(dispatch).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should not send when loading', () => {
    const state = { ...baseState, chatLoading: true };
    const { result } = renderHook(() => useChatInput(state, dispatch));

    act(() => result.current.setInputValue('hello'));
    act(() => result.current.handleSend());

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should dispatch messages and call IPC on send', () => {
    const { result } = renderHook(() => useChatInput(baseState, dispatch));

    act(() => result.current.setInputValue('hello'));
    act(() => result.current.handleSend());

    // Should dispatch: ADD_CHAT_MESSAGE (user), ADD_CHAT_MESSAGE (assistant), SET_CHAT_LOADING
    const types = dispatch.mock.calls.map((c: [AppAction]) => c[0].type);
    expect(types).toContain('ADD_CHAT_MESSAGE');
    expect(types).toContain('SET_CHAT_LOADING');

    // Should call IPC send
    expect(mockSend).toHaveBeenCalledWith('conv-1', 'hello', expect.any(String), 'gpt-4');

    // Should clear input
    expect(result.current.inputValue).toBe('');
  });

  it('should create conversation when none active', () => {
    const state: AppState = { ...baseState, activeConversationId: null };
    const { result } = renderHook(() => useChatInput(state, dispatch));

    act(() => result.current.setInputValue('hello'));
    act(() => result.current.handleSend());

    const addConv = dispatch.mock.calls.find(
      (c: [AppAction]) => c[0].type === 'ADD_CONVERSATION'
    );
    expect(addConv).toBeDefined();
  });

  it('should save selectedModel to localStorage on send', () => {
    const { result } = renderHook(() => useChatInput(baseState, dispatch));

    act(() => result.current.setInputValue('hello'));
    act(() => result.current.handleSend());

    expect(localStorage.getItem('lastUsedModel')).toBe('gpt-4');
  });

  it('should call stop IPC on handleStop', () => {
    const state = {
      ...baseState,
      chatLoading: true,
      chatMessages: [
        { id: 'msg-1', role: 'user' as const, content: 'hi', timestamp: 1000 },
        { id: 'msg-2', role: 'assistant' as const, content: 'hel', timestamp: 1001 },
      ],
    };
    const { result } = renderHook(() => useChatInput(state, dispatch));

    act(() => result.current.handleStop());

    expect(mockStop).toHaveBeenCalledWith('conv-1', 'msg-2');
  });

  it('should not stop when not loading', () => {
    const { result } = renderHook(() => useChatInput(baseState, dispatch));

    act(() => result.current.handleStop());

    expect(mockStop).not.toHaveBeenCalled();
  });

  it('should send on Enter key (without Shift)', () => {
    const { result } = renderHook(() => useChatInput(baseState, dispatch));

    act(() => result.current.setInputValue('hello'));

    const event = {
      key: 'Enter',
      shiftKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    act(() => result.current.handleKeyDown(event));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalled();
  });

  it('should not send on Shift+Enter', () => {
    const { result } = renderHook(() => useChatInput(baseState, dispatch));

    act(() => result.current.setInputValue('hello'));

    const event = {
      key: 'Enter',
      shiftKey: true,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    act(() => result.current.handleKeyDown(event));

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should stop propagation on all keydown events', () => {
    const { result } = renderHook(() => useChatInput(baseState, dispatch));

    const event = {
      key: 'a',
      shiftKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    act(() => result.current.handleKeyDown(event));

    expect(event.stopPropagation).toHaveBeenCalled();
  });
});

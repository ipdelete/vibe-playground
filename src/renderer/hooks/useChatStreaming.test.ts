import { renderHook, act } from '@testing-library/react';
import { useChatStreaming } from './useChatStreaming';

describe('useChatStreaming', () => {
  let mockOnChunk: jest.Mock;
  let mockOnDone: jest.Mock;
  let mockOnError: jest.Mock;
  let cleanupChunk: jest.Mock;
  let cleanupDone: jest.Mock;
  let cleanupError: jest.Mock;
  let dispatch: jest.Mock;

  beforeEach(() => {
    cleanupChunk = jest.fn();
    cleanupDone = jest.fn();
    cleanupError = jest.fn();
    dispatch = jest.fn();

    mockOnChunk = jest.fn().mockReturnValue(cleanupChunk);
    mockOnDone = jest.fn().mockReturnValue(cleanupDone);
    mockOnError = jest.fn().mockReturnValue(cleanupError);

    (window as any).electronAPI = {
      copilot: {
        onChunk: mockOnChunk,
        onDone: mockOnDone,
        onError: mockOnError,
      },
    };
  });

  it('should subscribe to IPC streaming events on mount', () => {
    renderHook(() => useChatStreaming(dispatch));

    expect(mockOnChunk).toHaveBeenCalledWith(expect.any(Function));
    expect(mockOnDone).toHaveBeenCalledWith(expect.any(Function));
    expect(mockOnError).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should dispatch APPEND_CHAT_CHUNK on chunk', () => {
    renderHook(() => useChatStreaming(dispatch));

    const chunkHandler = mockOnChunk.mock.calls[0][0];
    act(() => chunkHandler('msg-1', 'hello'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'APPEND_CHAT_CHUNK',
      payload: { messageId: 'msg-1', content: 'hello' },
    });
  });

  it('should dispatch SET_CHAT_LOADING false on done', () => {
    renderHook(() => useChatStreaming(dispatch));

    const doneHandler = mockOnDone.mock.calls[0][0];
    act(() => doneHandler());

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_CHAT_LOADING',
      payload: { loading: false },
    });
  });

  it('should dispatch chunk and loading false on error', () => {
    renderHook(() => useChatStreaming(dispatch));

    const errorHandler = mockOnError.mock.calls[0][0];
    act(() => errorHandler('msg-2', 'something broke'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'APPEND_CHAT_CHUNK',
      payload: { messageId: 'msg-2', content: 'Error: something broke' },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_CHAT_LOADING',
      payload: { loading: false },
    });
  });

  it('should cleanup all listeners on unmount', () => {
    const { unmount } = renderHook(() => useChatStreaming(dispatch));

    unmount();

    expect(cleanupChunk).toHaveBeenCalled();
    expect(cleanupDone).toHaveBeenCalled();
    expect(cleanupError).toHaveBeenCalled();
  });
});

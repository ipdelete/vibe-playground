import * as React from 'react';
import { useRef, useEffect } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { useChatStreaming } from '../../hooks/useChatStreaming';
import { useModelPicker } from '../../hooks/useModelPicker';
import { useChatInput } from '../../hooks/useChatInput';
import { useConversationSync } from '../../hooks/useConversationSync';
import { Icon } from '../Icon';

export function ChatView() {
  const { state, dispatch } = useAppState();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useChatStreaming(dispatch);
  useConversationSync(state);

  const { pickerOpen, setPickerOpen, pickerRef, selectedModelName } = useModelPicker(
    state.availableModels, state.selectedModel, state.chatLoading, dispatch,
  );

  const { inputValue, setInputValue, inputRef, handleSend, handleStop, handleKeyDown } = useChatInput(
    state, dispatch,
  );

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [state.chatMessages]);

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {state.chatMessages.length === 0 ? (
          <div className="chat-empty">
            <Icon name="copilot" size={48} />
            <p>{state.activeConversationId ? 'No messages yet' : 'Start a new conversation'}</p>
          </div>
        ) : (
          state.chatMessages.map(msg => (
            <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
              <div className="chat-message-content">
                {msg.content || (msg.role === 'assistant' && state.chatLoading ? '...' : '')}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot..."
            rows={1}
          />
          <button
            className={`chat-send-btn${state.chatLoading ? ' stop' : ''}`}
            onClick={state.chatLoading ? handleStop : handleSend}
            disabled={!state.chatLoading && !inputValue.trim()}
            title={state.chatLoading ? 'Stop generation' : 'Send message'}
          >
            <Icon name={state.chatLoading ? 'stop-circle' : 'send'} size="sm" />
          </button>
        </div>
        {state.availableModels.length > 0 && (
          <div className="chat-input-footer">
            <div className="model-picker" ref={pickerRef}>
              <button
                className="model-picker-btn"
                onClick={() => setPickerOpen(prev => !prev)}
                disabled={state.chatLoading}
                title="Select model"
              >
                {selectedModelName} ▾
              </button>
              {pickerOpen && (
                <div className="model-picker-dropdown">
                  {state.availableModels.map(m => (
                    <button
                      key={m.id}
                      className={`model-picker-item${m.id === state.selectedModel ? ' active' : ''}`}
                      onClick={() => {
                        dispatch({ type: 'SET_SELECTED_MODEL', payload: { model: m.id } });
                        setPickerOpen(false);
                      }}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

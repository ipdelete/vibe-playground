import { renderHook, act } from '@testing-library/react';
import { useModelPicker } from './useModelPicker';
import { ModelInfo, AppAction } from '../../shared/types';

describe('useModelPicker', () => {
  let dispatch: jest.Mock;
  let mockListModels: jest.Mock;

  beforeEach(() => {
    dispatch = jest.fn();
    mockListModels = jest.fn().mockResolvedValue([]);
    (window as any).electronAPI = {
      copilot: { listModels: mockListModels },
    };
    localStorage.clear();
  });

  const models: ModelInfo[] = [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5', name: 'GPT-3.5' },
  ];

  it('should fetch models on mount when none available', async () => {
    mockListModels.mockResolvedValue(models);

    await act(async () => {
      renderHook(() => useModelPicker([], null, false, dispatch));
    });

    expect(mockListModels).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_AVAILABLE_MODELS',
      payload: { models },
    });
  });

  it('should not fetch models when already available', async () => {
    await act(async () => {
      renderHook(() => useModelPicker(models, 'gpt-4', false, dispatch));
    });

    expect(mockListModels).not.toHaveBeenCalled();
  });

  it('should default to first model when no localStorage', async () => {
    mockListModels.mockResolvedValue(models);

    await act(async () => {
      renderHook(() => useModelPicker([], null, false, dispatch));
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SELECTED_MODEL',
      payload: { model: 'gpt-4' },
    });
  });

  it('should restore last-used model from localStorage', async () => {
    localStorage.setItem('lastUsedModel', 'gpt-3.5');
    mockListModels.mockResolvedValue(models);

    await act(async () => {
      renderHook(() => useModelPicker([], null, false, dispatch));
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SELECTED_MODEL',
      payload: { model: 'gpt-3.5' },
    });
  });

  it('should not set model if one is already selected', async () => {
    mockListModels.mockResolvedValue(models);

    await act(async () => {
      renderHook(() => useModelPicker([], 'gpt-4', false, dispatch));
    });

    // Should dispatch SET_AVAILABLE_MODELS but not SET_SELECTED_MODEL
    const modelCalls = dispatch.mock.calls.filter(
      (c: [AppAction]) => c[0].type === 'SET_SELECTED_MODEL'
    );
    expect(modelCalls).toHaveLength(0);
  });

  it('should toggle picker open/close', () => {
    const { result } = renderHook(() => useModelPicker(models, 'gpt-4', false, dispatch));

    expect(result.current.pickerOpen).toBe(false);

    act(() => result.current.setPickerOpen(true));
    expect(result.current.pickerOpen).toBe(true);

    act(() => result.current.setPickerOpen(false));
    expect(result.current.pickerOpen).toBe(false);
  });

  it('should register and remove mousedown listener when picker opens/closes', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const removeSpy = jest.spyOn(document, 'removeEventListener');

    const { result, unmount } = renderHook(() => useModelPicker(models, 'gpt-4', false, dispatch));

    expect(addSpy).not.toHaveBeenCalledWith('mousedown', expect.any(Function));

    act(() => result.current.setPickerOpen(true));
    expect(addSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    act(() => result.current.setPickerOpen(false));
    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
    unmount();
  });

  it('should derive selectedModelName from models', () => {
    const { result } = renderHook(() => useModelPicker(models, 'gpt-4', false, dispatch));
    expect(result.current.selectedModelName).toBe('GPT-4');
  });

  it('should fall back to model id when name not found', () => {
    const { result } = renderHook(() => useModelPicker(models, 'unknown-id', false, dispatch));
    expect(result.current.selectedModelName).toBe('unknown-id');
  });

  it('should fall back to "Model" when no model selected', () => {
    const { result } = renderHook(() => useModelPicker(models, null, false, dispatch));
    expect(result.current.selectedModelName).toBe('Model');
  });
});

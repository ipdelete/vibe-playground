import { createIpcListener } from './createIpcListener';

describe('createIpcListener', () => {
  const mockOn = jest.fn();
  const mockRemoveListener = jest.fn();
  const mockIpcRenderer = { on: mockOn, removeListener: mockRemoveListener } as any;
  const fakeEvent = {} as Electron.IpcRendererEvent;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers handler on the correct channel', () => {
    createIpcListener(mockIpcRenderer, 'agent:data', jest.fn());
    expect(mockOn).toHaveBeenCalledWith('agent:data', expect.any(Function));
  });

  it('returns a cleanup function', () => {
    const cleanup = createIpcListener(mockIpcRenderer, 'test:channel', jest.fn());
    expect(typeof cleanup).toBe('function');
  });

  it('cleanup removes the same handler from the same channel', () => {
    const cleanup = createIpcListener(mockIpcRenderer, 'copilot:chunk', jest.fn());
    cleanup();
    const registeredHandler = mockOn.mock.calls[0][1];
    expect(mockRemoveListener).toHaveBeenCalledWith('copilot:chunk', registeredHandler);
  });

  it('forwards args to callback, stripping the _event param (1 arg)', () => {
    const callback = jest.fn();
    createIpcListener(mockIpcRenderer, 'copilot:done', callback);
    const handler = mockOn.mock.calls[0][1];
    handler(fakeEvent, 'msg-123');
    expect(callback).toHaveBeenCalledWith('msg-123');
  });

  it('forwards multiple args to callback (2 args)', () => {
    const callback = jest.fn();
    createIpcListener(mockIpcRenderer, 'agent:data', callback);
    const handler = mockOn.mock.calls[0][1];
    handler(fakeEvent, 'id-1', 'some-data');
    expect(callback).toHaveBeenCalledWith('id-1', 'some-data');
  });

  it('forwards multiple args to callback (3 args)', () => {
    const callback = jest.fn();
    createIpcListener(mockIpcRenderer, 'copilot:error', callback);
    const handler = mockOn.mock.calls[0][1];
    handler(fakeEvent, 'msg-1', 'err-text', 'extra');
    expect(callback).toHaveBeenCalledWith('msg-1', 'err-text', 'extra');
  });

  it('works with a single object arg', () => {
    const callback = jest.fn();
    createIpcListener(mockIpcRenderer, 'fs:directoryChanged', callback);
    const handler = mockOn.mock.calls[0][1];
    const watchEvent = { type: 'change', path: '/tmp' };
    handler(fakeEvent, watchEvent);
    expect(callback).toHaveBeenCalledWith(watchEvent);
  });
});

import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('kanade', {
  version: '0.0.1',
});

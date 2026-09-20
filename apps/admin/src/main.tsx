import React from 'react';
import ReactDOM from 'react-dom/client';

// Safe Storage Polyfill for iframe environment compatibility
(() => {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
  } catch (e) {
    const memoryStorage: Record<string, string> = {};
    const safeStorage = {
      getItem: (key: string) => (key in memoryStorage ? memoryStorage[key] : null),
      setItem: (key: string, value: string) => { memoryStorage[key] = String(value); },
      removeItem: (key: string) => { delete memoryStorage[key]; },
      clear: () => { Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]); },
      get length() { return Object.keys(memoryStorage).length; },
      key: (index: number) => Object.keys(memoryStorage)[index] || null,
    };
    Object.defineProperty(window, 'localStorage', { value: safeStorage, configurable: true, writable: true });
  }

  try {
    const testKey = '__session_test__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
  } catch (e) {
    const memoryStorage: Record<string, string> = {};
    const safeSessionStorage = {
      getItem: (key: string) => (key in memoryStorage ? memoryStorage[key] : null),
      setItem: (key: string, value: string) => { memoryStorage[key] = String(value); },
      removeItem: (key: string) => { delete memoryStorage[key]; },
      clear: () => { Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]); },
      get length() { return Object.keys(memoryStorage).length; },
      key: (index: number) => Object.keys(memoryStorage)[index] || null,
    };
    Object.defineProperty(window, 'sessionStorage', { value: safeSessionStorage, configurable: true, writable: true });
  }
})();

import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

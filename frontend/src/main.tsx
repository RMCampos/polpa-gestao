import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';
import App from './App.tsx';
import axios from 'axios';

axios.defaults.withCredentials = true;

let memoryUser: string | null = null;

const _origGetItem    = Storage.prototype.getItem;
const _origSetItem    = Storage.prototype.setItem;
const _origRemoveItem = Storage.prototype.removeItem;

Storage.prototype.getItem = function (key: string): string | null {
  if (this === localStorage) {
    if (key === 'user') return memoryUser;
  }
  return _origGetItem.call(this, key);
};

Storage.prototype.setItem = function (key: string, value: string): void {
  if (this === localStorage) {
    if (key === 'user') { memoryUser = value; return; }
  }
  _origSetItem.call(this, key, value);
};

Storage.prototype.removeItem = function (key: string): void {
  if (this === localStorage) {
    if (key === 'user') { memoryUser = null; return; }
  }
  _origRemoveItem.call(this, key);
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
);

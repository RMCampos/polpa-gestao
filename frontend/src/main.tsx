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

let memoryToken: string | null = null;
let memoryUser: string | null = null;

const originalGetItem = localStorage.getItem.bind(localStorage);
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);

localStorage.getItem = (key: string) => {
  if (key === 'token') return memoryToken;
  if (key === 'user') return memoryUser;
  return originalGetItem(key);
};

localStorage.setItem = (key: string, value: string) => {
  if (key === 'token') {
    memoryToken = value;
    return;
  }
  if (key === 'user') {
    memoryUser = value;
    return;
  }
  originalSetItem(key, value);
};

localStorage.removeItem = (key: string) => {
  if (key === 'token') {
    memoryToken = null;
    return;
  }
  if (key === 'user') {
    memoryUser = null;
    return;
  }
  originalRemoveItem(key);
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

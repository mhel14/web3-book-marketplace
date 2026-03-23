import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App.tsx';
import { WalletProvider } from './context/WalletContext.tsx';
import { ToastProvider } from './components/ui/ToastProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <WalletProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </WalletProvider>
    </ToastProvider>
  </StrictMode>,
);

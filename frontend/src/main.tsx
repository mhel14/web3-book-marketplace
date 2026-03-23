import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { WalletProvider } from './context/WalletContext.tsx';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/ui/ToastProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <WalletProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </WalletProvider>
    </ToastProvider>
  </StrictMode>,
);

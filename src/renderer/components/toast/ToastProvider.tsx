import React from 'react';
import { Toaster } from 'sonner';

const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors={false}
      closeButton={false}
      toastOptions={{
        duration: 2000,
        style: {
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'var(--text-normal)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
        },
      }}
    />
  );
};

export default ToastProvider;

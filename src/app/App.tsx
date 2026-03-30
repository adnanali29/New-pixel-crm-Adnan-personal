import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AppProvider>
  );
}

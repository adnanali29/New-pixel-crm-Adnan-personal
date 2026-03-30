import React from 'react';
import { Outlet, Navigate } from 'react-router';
import { useApp } from '../context/AppContext';
import Header from './Header';
import NavBar from './NavBar';

export default function Layout() {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>
      <Header />
      <NavBar />
      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

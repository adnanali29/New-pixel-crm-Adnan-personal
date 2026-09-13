import { createBrowserRouter, Navigate } from 'react-router';
import Layout from './components/Layout';
import Login from './pages/Login';
import CustomerPage from './pages/Customer';
import EnquiryPage from './pages/Enquiry';
import QuotationPage from './pages/Quotation';
import OrderPage from './pages/Order';
import RevenuePage from './pages/Revenue';
import SalesAnalyticsPage from './pages/SalesAnalytics';
import MarketResearchPage from './pages/MarketResearch';
import SettingsPage from './pages/Settings';
import React from 'react';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, element: React.createElement(Navigate, { to: '/enquiry', replace: true }) },
      { path: 'customers', Component: CustomerPage },
      { path: 'enquiry', Component: EnquiryPage },
      { path: 'quotation', Component: QuotationPage },
      { path: 'order', Component: OrderPage },
      { path: 'revenue', Component: RevenuePage },
      { path: 'analytics', Component: SalesAnalyticsPage },
      { path: 'market-research', Component: MarketResearchPage },
      { path: 'settings', Component: SettingsPage },
    ],
  },
]);

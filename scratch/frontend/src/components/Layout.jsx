import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

// AppLayout: sidebar on the left, page content on the right.
// Used for all authenticated/application pages.
export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-brand-secondary">
      {/* Fixed left sidebar — w-56 on desktop, hidden on mobile (Sidebar handles its own mobile drawer) */}
      <Sidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// PublicLayout: no sidebar. Used only for Login and Signup.
export const PublicLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-brand-secondary">
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

// Default export kept as AppLayout for backward compat
export default AppLayout;

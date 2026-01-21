import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Remove the key prop that was causing re-render issues */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pt-16 md:pt-16 lg:pt-4 p-4 scrollbar-hide">
          <div className="container mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>

        {/* Fixed Footer */}
        <footer className="bg-white bg-opacity-10 backdrop-blur-md border-t border-white border-opacity-10 py-3 px-4 flex-shrink-0 shadow-2xl">
          <div className="container mx-auto text-center text-sm text-white text-opacity-80">
            Powered by{' '}
            <a
              href="https://www.botivate.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-indigo-200 font-bold underline transition-colors"
            >
              Botivate
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
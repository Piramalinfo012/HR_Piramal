import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

// ScrollToTop component to handle scrolling to top on route changes
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Wait for the component to fully render before scrolling
    const timer = setTimeout(() => {
      // Target the main content area that has the overflow-y-auto class
      const mainContent = document.querySelector('main.overflow-y-auto');
      if (mainContent) {
        // Scroll the main content area to top
        mainContent.scrollTop = 0;
      } else {
        // Fallback to window scroll if main content not found
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto' // Use 'auto' for immediate scroll
        });

        // Also ensure the document body is scrolled to top
        if (document.body) {
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        }
      }
    }, 100); // Small delay to ensure DOM is updated

    return () => clearTimeout(timer);
  }, [location.pathname]); // Only run when pathname changes

  return null;
};



const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Scroll to top component */}
      <ScrollToTop />

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
        <footer className="bg-white border-t border-gray-200 py-3 px-4 flex-shrink-0 z-50">
          <div className="container mx-auto text-center text-sm text-gray-500 font-medium">
            Developed By <span className="text-indigo-600 font-bold">deepak Sahu</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
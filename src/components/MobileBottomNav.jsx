import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Clock, CalendarRange, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';

const MobileBottomNav = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const currentUser = user || storedUser;
  
  const homePath = currentUser?.role === 'employee' || currentUser?.Admin === 'No' ? '/employee-mobile' : '/';

  const navItems = [
    { id: 'home', path: homePath, icon: Home, label: 'Home' },
    { id: 'attendance', path: '/my-attendance', icon: Clock, label: 'Outstation' },
    { id: 'leave', path: '/leave-request', icon: CalendarRange, label: 'Leave' },
    { id: 'profile', path: '/employee-profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden">
      {/* Background with strong blur and glassmorphism */}
      <div className="absolute inset-0 bg-white/80 dark:bg-[#06101f]/80 backdrop-blur-2xl border-t border-slate-200/50 dark:border-slate-800/50 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] rounded-t-3xl" />
      
      <div className="relative flex justify-between items-center px-4 py-2 pb-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/my-attendance' && location.pathname === '/mark-attendance');
          
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-16 h-16 w-full -webkit-tap-highlight-color-transparent group"
            >
              {/* Active Background Bubble */}
              {isActive && (
                <motion.div
                  layoutId="activeBubble"
                  className="absolute inset-0 bg-teal-500/10 dark:bg-teal-400/10 rounded-2xl z-0"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              
              {/* Top Floating Indicator */}
              {isActive && (
                 <motion.div 
                   layoutId="activeIndicator"
                   className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.8)] z-10" 
                   transition={{ type: "spring", stiffness: 300, damping: 25 }}
                 />
              )}

              {/* Icon Container with Spring Motion */}
              <motion.div 
                className="relative z-10 flex flex-col items-center justify-center mt-1"
                initial={false}
                animate={{
                  y: isActive ? -6 : 0,
                  scale: isActive ? 1.15 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Icon 
                  size={24} 
                  className={`transition-colors duration-300 ${
                    isActive 
                      ? 'text-teal-600 dark:text-teal-400 stroke-[2.5px]' 
                      : 'text-slate-400 dark:text-slate-500 stroke-2 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`} 
                />
              </motion.div>
              
              {/* Label with AnimatePresence */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute bottom-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 tracking-wide z-10"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;

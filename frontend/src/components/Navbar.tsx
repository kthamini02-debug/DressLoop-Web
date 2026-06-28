import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { ThemeToggle } from './ThemeToggle';
import { Shirt, Bell, LogOut, Menu, X, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  // Navigation Links based on role
  const getNavLinks = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return [
        { label: 'Admin Dashboard', path: '/admin' },
        { label: 'NGO Approvals', path: '/admin/approvals' },
        { label: 'Manage Users', path: '/admin/users' },
        { label: 'Manage Donations', path: '/admin/donations' },
      ];
    }
    
    if (user.role === 'donor') {
      return [
        { label: 'My Donations', path: '/donor' },
        { label: 'Active Chats', path: '/chats' },
      ];
    }
    
    if (user.role === 'ngo') {
      return [
        { label: 'Browse Donations', path: '/ngo' },
        { label: 'My Requests', path: '/ngo/requests' },
        { label: 'Active Chats', path: '/chats' },
      ];
    }
    
    return [];
  };

  const navLinks = getNavLinks();

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={user ? (user.role === 'admin' ? '/admin' : user.role === 'donor' ? '/donor' : '/ngo') : '/'} className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-500 font-bold text-xl tracking-tight">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
                <Shirt className="w-6 h-6" />
              </div>
              <span className="text-slate-800 dark:text-slate-100">Dress</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />

            {user && (
              <>
                {/* Real-time Notifications Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                    aria-label="View notifications"
                    id="notification-bell-btn"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isNotificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-150 dark:border-slate-700/50 py-2 z-50 animate-slide-in-up">
                      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 8).map((notif) => (
                            <div
                              key={notif.id}
                              className={`px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 text-left transition-colors ${
                                !notif.read_status ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                              }`}
                            >
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                {notif.title}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Link */}
                {user.role !== 'admin' && (
                  <Link
                    to="/profile"
                    className={`p-2 rounded-full transition-colors ${
                      isActive('/profile')
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    aria-label="View profile"
                  >
                    <UserIcon className="w-5 h-5" />
                  </Link>
                )}

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  aria-label="Logout"
                  id="logout-btn"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Mobile Hamburger menu */}
            {user && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {user && isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                isActive(link.path)
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user.role !== 'admin' && (
            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                isActive('/profile')
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              My Profile
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

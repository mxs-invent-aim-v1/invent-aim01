import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import { Zap } from 'lucide-react';

const MAIN_TABS = [
  { id: 'inventory', label: 'Inventory', color: 'bg-[#d37042]', path: '/inventory/dashboard' },
  { id: 'track-trace', label: 'Track & Trace', color: 'bg-[#3e6648]', path: '/tracking' },
  { id: 'app-management', label: 'Application Management', color: 'bg-[#276fae]', path: '/users' },
  { id: 'billing-payments', label: 'Billing & Payments', color: 'bg-[#673ab7]', path: '/billing/dashboard' },
];

  const SIDEBAR_OPTIONS = {
  'inventory': [
    { label: 'upload', path: '/upload' },
    { label: 'Register', path: '/inventory/register' },
    { label: 'Manage', path: '/invoices' },
    { label: 'Search', path: '/inventory/search' },
  ],
  'track-trace': [
    { label: 'Trace Inv', path: '/tracking/trace-inv' },
    { label: 'Trace Workflow', path: '/tracking/workflow' },
    { label: 'Trace Process', path: '/tracking/process' },
    { label: 'Manage', path: '/tracking/manage' },
  ],
  'app-management': [
    { label: 'User', path: '/users' },
    { label: 'Create P/W/S', path: '/app-management/create-pws' },
  ],
  'billing-payments': [
    { label: 'Summary', path: '/billing/summary' },
    { label: 'History', path: '/billing/history' },
    { label: 'Register', path: '/billing/register' },
    { label: 'Manage', path: '/billing/manage' },
  ],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/inventory') || path === '/upload' || path === '/invoices') return 'inventory';
    if (path.startsWith('/tracking')) return 'track-trace';
    if (path.startsWith('/purchase')) return 'purchase';
    if (path.startsWith('/app-management') || path === '/users') return 'app-management';
    if (path.startsWith('/billing')) return 'billing-payments';
    return 'inventory'; // Default fallback
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Keep active tab in sync with location if navigated from somewhere else
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const handleTabClick = (tabId, path) => {
    setActiveTab(tabId);
    if (path) navigate(path);
  };

  const activeSidebarOptions = SIDEBAR_OPTIONS[activeTab] || [];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-brutal-dark text-white font-mono selection:bg-[#FCD535] selection:text-black">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-6 px-8 pb-4 shrink-0 bg-[#111] border-b border-[#333]">
        <Link to="/dashboard" className="text-2xl font-black tracking-tighter hover:text-[#FCD535] transition-colors flex items-center gap-2 uppercase">
          <Zap size={24} className="text-[#FCD535]" /> /// INVOICE_AI
        </Link>
        
        <div className="flex items-center gap-8 text-xs font-bold tracking-widest uppercase">
          <Link to="/query" className="text-gray-500 hover:text-[#FCD535] transition-colors">Ask AI</Link>
          <Link to="/help" className="text-gray-500 hover:text-[#FCD535] transition-colors">Help & support</Link>
          <Link to="/settings" className="text-gray-500 hover:text-[#FCD535] transition-colors">Settings</Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-xs font-bold tracking-widest text-[#FCD535] bg-black px-2 py-1 uppercase border border-[#333]">
                {user.username}
              </span>
              <button 
                onClick={logout}
                className="text-xs font-black tracking-widest text-red-500 hover:text-red-400 uppercase transition-colors"
              >
                LOGOUT
              </button>
            </>
          ) : (
            <Link to="/login" className="text-xs font-black tracking-widest text-[#FCD535] hover:text-white uppercase transition-colors">Login</Link>
          )}
        </div>
      </div>

      {/* Lower Row / Main Tabs */}
      <div className="flex items-end bg-[#111] border-b border-[#333] shrink-0 px-8 pt-4 gap-8">
        {MAIN_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.path)}
              className={clsx(
                "pb-3 text-xs font-black tracking-widest uppercase transition-colors border-b-2",
                isActive 
                  ? "text-[#FCD535] border-[#FCD535]" 
                  : "text-gray-500 border-transparent hover:text-white hover:border-gray-500"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Main Content Area: Sidebar + Outlet */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        {activeTab !== 'inventory' && (
          <aside className="w-56 bg-[#111] border-r border-[#333] shrink-0 overflow-y-auto flex flex-col py-4 relative z-10">
            {activeSidebarOptions.map((opt) => (
              <NavLink
                key={opt.path}
                to={opt.path}
                className={({ isActive }) => clsx(
                  "px-8 py-4 border-b border-[#222] last:border-0 hover:bg-[#1a1a1a] transition-colors whitespace-nowrap text-xs font-bold tracking-widest uppercase flex items-center justify-between",
                  isActive ? "text-[#FCD535] bg-[#151515] border-r-2 border-r-[#FCD535]" : "text-gray-500"
                )}
              >
                {opt.label}
                {/* Optional small indicator for active state could go here, but border-r-2 handles it */}
              </NavLink>
            ))}
          </aside>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-brutal-dark relative z-0">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

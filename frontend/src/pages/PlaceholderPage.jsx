import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function PlaceholderPage({ title }) {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-brutal-dark text-white font-mono">
      <LayoutDashboard size={64} className="text-[#FCD535] opacity-50 mb-8" />
      <h1 className="text-4xl font-black tracking-tighter uppercase text-[#FCD535] mb-4">
        {title || 'Coming Soon'}
      </h1>
      <p className="text-gray-400 font-bold tracking-widest uppercase text-sm">
        This page is currently under construction.
      </p>
    </div>
  );
}

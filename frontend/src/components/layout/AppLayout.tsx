import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CopilotDrawer } from '@/components/copilot/CopilotDrawer';

export const AppLayout: React.FC = () => {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#070b14] text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)} isCopilotOpen={isCopilotOpen} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <CopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
    </div>
  );
};

'use client';

import React from 'react';
import Sidebar from '@/components/dashboard/sidebar';
import ExchangeBalancesCard from '@/components/dashboard/exchange-balances-card';
import { LayoutDashboard, Repeat, Wallet, History, Settings, TrendingUp } from 'lucide-react';

// Ícones Lucide com estilo
const iconProps = { className: "h-5 w-5" };
const AppIcons = {
  LayoutDashboard: <LayoutDashboard {...iconProps} />,
  Repeat: <Repeat {...iconProps} />,
  TrendingUp: <TrendingUp {...iconProps} />,
  Wallet: <Wallet {...iconProps} />,
  History: <History {...iconProps} />,
  Settings: <Settings {...iconProps} />,
};

export default function CarteirasPage() {
  const sidebarNavItems = [
    { title: 'Dashboard', href: '/dashboard', icon: AppIcons.LayoutDashboard },
    { title: 'Arbitragem', href: '/arbitragem', icon: AppIcons.Repeat },
    { title: 'Big Arb', href: '/big-arb', icon: AppIcons.TrendingUp },
    { title: 'Carteiras', href: '/carteiras', icon: AppIcons.Wallet },
    { title: 'Histórico', href: '/historico', icon: AppIcons.History },
    { title: 'Configurações', href: '/configuracoes', icon: AppIcons.Settings },
  ];

  return (
    <div className="flex min-h-screen bg-dark-bg text-white">
      <Sidebar
        user={{ 
          name: 'Arbitrack',
          imageUrl: '/images/avatar.png.png'
        }}
        navItems={sidebarNavItems}
      />
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-white">Carteiras</h1>
          <p className="text-custom-cyan">Saldo em tempo real de cada corretora conectada</p>
        </header>

        <div className="max-w-7xl">
          <ExchangeBalancesCard />
        </div>
      </main>
    </div>
  );
} 
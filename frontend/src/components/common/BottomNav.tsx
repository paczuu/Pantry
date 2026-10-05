import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Boxes,
  QrCode,
  ShoppingCart,
  BookOpen,
  ChefHat,
  History,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../language/LanguageContext';
import { NavItemConfig } from '../../types';
import {
  NAV_CONFIG_UPDATED_EVENT,
  loadNavConfig,
} from '../../utils/navConfig';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenScanner: () => void;
}

const ICONS_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  pantry: Boxes,
  shopping: ShoppingCart,
  'scan-action': QrCode,
  notes: BookOpen,
  recipes: ChefHat,
  audit: History,
  settings: Settings,
};

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
}) => {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [navConfig, setNavConfig] = useState<NavItemConfig[]>(() => loadNavConfig());

  useEffect(() => {
    const handleNavChange = () => {
      setNavConfig(loadNavConfig());
    };

    window.addEventListener(NAV_CONFIG_UPDATED_EVENT, handleNavChange);
    return () => {
      window.removeEventListener(NAV_CONFIG_UPDATED_EVENT, handleNavChange);
    };
  }, []);

  const visibleItems = navConfig
    .filter((item) => {
      if (!item.visible) return false;
      if (item.id === 'audit' && !isAdmin) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 pb-[env(safe-area-inset-bottom)] md:static md:bg-transparent md:border-none md:pb-0">
      <div className="max-w-xl mx-auto px-2 flex items-center justify-around h-16">
        {visibleItems.map((item) => {
          const Icon = ICONS_MAP[item.id] || LayoutDashboard;
          const displayLabel = t(`nav.${item.id}`) || item.label;

          if (item.id === 'scan-action') {
            return (
              <button
                key={item.id}
                onClick={onOpenScanner}
                className="flex flex-col items-center justify-center flex-1 py-1 px-1 text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] tracking-tight font-medium">{displayLabel}</span>
              </button>
            );
          }

          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110 text-emerald-400' : ''} transition-transform`} />
              <span className="text-[10px] tracking-tight">{displayLabel}</span>
              {isActive && (
                <span className="w-1 h-1 bg-emerald-400 rounded-full mt-0.5 animate-fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

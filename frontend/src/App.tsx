import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { NoHouseholdView } from './components/auth/NoHouseholdView';
import { DashboardPage } from './pages/DashboardPage';
import { PantryPage } from './pages/PantryPage';
import { ShoppingListsView } from './components/shopping/ShoppingListsView';
import { NotesView } from './components/notes/NotesView';
import { RecipesView } from './components/recipes/RecipesView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { HouseholdSettingsView } from './components/settings/HouseholdSettingsView';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { BarcodeScannerModal } from './components/scanner/BarcodeScannerModal';
import { QuickAddModal } from './components/scanner/QuickAddModal';
import { EditPantryItemModal } from './components/pantry/EditPantryItemModal';
import { PantryItem } from './types';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'ADD' | 'REMOVE'>('ADD');
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-emerald-400">
        <Loader2 className="w-10 h-10 animate-spin" />
        <span className="text-sm font-semibold text-slate-300">Ładowanie aplikacji Spiżarnia...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!user.householdId) {
    return <NoHouseholdView />;
  }

  const handleOpenScanner = (mode: 'ADD' | 'REMOVE' = 'ADD') => {
    setScannerMode(mode);
    setIsScannerOpen(true);
  };

  const handleEditItem = (item: PantryItem) => {
    setEditingItem(item);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Pasek Górny */}
      <Header
        onOpenSettings={() => setActiveTab('settings')}
        onGoDashboard={() => setActiveTab('dashboard')}
      />

      {/* Główna Zawartość */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardPage
            onOpenScanner={handleOpenScanner}
            onOpenAddManual={() => setIsManualAddOpen(true)}
            onEditItem={handleEditItem}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'pantry' && (
          <PantryPage
            onOpenScanner={handleOpenScanner}
            onOpenAddManual={() => setIsManualAddOpen(true)}
            onEditItem={handleEditItem}
          />
        )}

        {activeTab === 'shopping' && <ShoppingListsView />}

        {activeTab === 'notes' && <NotesView />}

        {activeTab === 'recipes' && <RecipesView />}

        {activeTab === 'audit' && <AuditLogsView />}

        {activeTab === 'settings' && <HouseholdSettingsView />}
      </main>

      {/* Dolny Pasek Nawigacyjny */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => handleOpenScanner('ADD')}
      />

      {/* Modal Skanera EAN */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        defaultMode={scannerMode}
      />

      {/* Modal Ręcznego Dodawania */}
      <QuickAddModal
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        initialProduct={null}
      />

      {/* Modal Edycji Produktu */}
      <EditPantryItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
      />
    </div>
  );
};

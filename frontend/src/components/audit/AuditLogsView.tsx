import React, { useState, useEffect, useCallback } from 'react';
import { ActivityLog, AuditStats } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShieldAlert,
  Search,
  Filter,
  User as UserIcon,
  Clock,
  PlusCircle,
  Edit3,
  MinusCircle,
  Trash2,
  ShoppingCart,
  UserPlus,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');

  const fetchAuditData = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.getAuditLogs({
          page,
          limit: 30,
          action: actionFilter !== 'ALL' ? actionFilter : undefined,
          userId: userFilter !== 'ALL' ? userFilter : undefined,
          search: search || undefined,
        }),
        api.getAuditStats(),
      ]);

      setLogs(logsRes.logs || []);
      setTotal(logsRes.total || 0);
      setTotalPages(logsRes.totalPages || 1);
      setStats(statsRes);
    } catch (error: any) {
      showToast('Błąd pobierania dziennika audytu.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, page, actionFilter, userFilter, search]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Dostęp ograniczony</h3>
        <p className="text-xs text-slate-400">
          Dziennik audytu i historia zmian są dostępne wyłącznie dla użytkowników z rolą Administratora.
        </p>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DODANO_PRODUKT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <PlusCircle className="w-3.5 h-3.5" /> Dodano produkt
          </span>
        );
      case 'ZMIENIONO_WARTOSCI':
      case 'EDYTOWANO_PRODUKT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Edit3 className="w-3.5 h-3.5" /> Edytowano dane
          </span>
        );
      case 'ZMNIEJSZONO_ILOSC':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <MinusCircle className="w-3.5 h-3.5" /> Zmniejszono ilość
          </span>
        );
      case 'ZUŻYTO_PRODUKT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <MinusCircle className="w-3.5 h-3.5" /> Całkowicie zużyto
          </span>
        );
      case 'USUNIĘTO_PRODUKT':
      case 'WYRZUCONO_PRODUKT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Trash2 className="w-3.5 h-3.5" /> Usunięto / Wyrzucono
          </span>
        );
      case 'PRZENIESIONO_Z_LISTY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <ShoppingCart className="w-3.5 h-3.5" /> Przeniesiono z zakupów
          </span>
        );
      case 'DOLACZONO_DO_DOMU':
      case 'NOWY_DOMOWNIK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <UserPlus className="w-3.5 h-3.5" /> Nowy domownik
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {action}
          </span>
        );
    }
  };

  const renderDetails = (detailsStr: string) => {
    try {
      const parsed = JSON.parse(detailsStr);
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.message) {
          return <p className="text-xs text-slate-200">{parsed.message}</p>;
        }
        return (
          <pre className="text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800 overflow-x-auto">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      }
    } catch (e) {
      // Zwykły tekst
    }
    return <p className="text-xs text-slate-200">{detailsStr}</p>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              Dziennik Zmian & Audyt
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Śledź pełną historię operacji w spiżarni: kto dodał, edytował, odliczył lub usunął produkt
          </p>
        </div>

        <button
          onClick={() => fetchAuditData()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </div>

      {/* Podsumowanie Aktywności */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">Zdarzenia (30 dni)</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{stats.totalEvents30Days}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] font-semibold text-emerald-400">Dodane produkty</div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {stats.actionCounts['DODANO_PRODUKT'] || 0}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] font-semibold text-amber-400">Zużyte / Odliczone</div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {(stats.actionCounts['ZMNIEJSZONO_ILOSC'] || 0) + (stats.actionCounts['ZUŻYTO_PRODUKT'] || 0)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] font-semibold text-cyan-400">Edycje wartości</div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {stats.actionCounts['ZMIENIONO_WARTOSCI'] || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filtry */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Szukaj */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Szukaj produktu lub użytkownika..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Typ akcji */}
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Wszystkie rodzaje zdarzeń</option>
            <option value="DODANO_PRODUKT">Dodanie produktu</option>
            <option value="ZMIENIONO_WARTOSCI">Edycja wartości</option>
            <option value="ZMNIEJSZONO_ILOSC">Zmniejszenie ilości / Zużycie</option>
            <option value="ZUŻYTO_PRODUKT">Całkowite zużycie</option>
            <option value="USUNIĘTO_PRODUKT">Usunięcie produktu</option>
            <option value="PRZENIESIONO_Z_LISTY">Przeniesienie z zakupów</option>
            <option value="DOLACZONO_DO_DOMU">Dołączenie domownika</option>
          </select>

          {/* Użytkownicy */}
          <select
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Wszyscy użytkownicy</option>
            {stats && Object.entries(stats.userActivity).map(([uid, u]) => (
              <option key={uid} value={uid}>
                {u.name} ({u.count} akcji)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista Zdarzeń / Oś Czasu */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            Brak zarejestrowanych zdarzeń w dzienniku audytu dla wybranych filtrów.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 transition-all space-y-2.5 shadow-sm"
            >
              {/* Nagłówek zdarzenia: Kto, Co, Kiedy */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold shrink-0">
                    {log.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs">{log.userName}</span>
                    <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline font-mono">
                      ({log.userEmail})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getActionBadge(log.action)}
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleString('pl-PL', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Obiekt i Szczegóły Zmian */}
              <div className="pl-9 space-y-1">
                <div className="text-xs font-semibold text-emerald-400">
                  Produkt: <strong className="text-white font-bold">{log.entityName}</strong>
                </div>
                {renderDetails(log.details)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginacja */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Strona {page} z {totalPages} (łącznie {total} wpisów)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

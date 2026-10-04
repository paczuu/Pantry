import React, { useState, useEffect, useCallback } from 'react';
import { ActivityLog, AuditStats } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Language } from '../../i18n/translations';
import {
  ShieldAlert,
  Search,
  User as UserIcon,
  Clock,
  PlusCircle,
  Edit3,
  MinusCircle,
  Trash2,
  ShoppingCart,
  UserPlus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  ShieldCheck,
  Home,
} from 'lucide-react';

/**
 * Tłumaczenie opisów akcji (details) z bazy danych do wybranego języka
 */
export function formatAuditDetails(detailsStr: string, language: Language): string {
  if (!detailsStr) return '';
  if (language === 'pl') {
    return detailsStr;
  }

  let text = detailsStr;

  // 1. Zwiększono ilość istniejącego produktu "..." [cap] o X szt. (aktualnie w spiżarni: Y szt.).
  text = text.replace(
    /Zwiększono ilość istniejącego produktu "([^"]+)"(?:\s*\[(.*?)\])? o (\d+) szt\.(?:\s*\(aktualnie w spiżarni: (\d+) szt\.\))?/g,
    (_, name, cap, qty, total) => {
      const capStr = cap ? ` [${cap}]` : '';
      const totalStr = total ? ` (currently in pantry: ${total} pcs)` : '';
      return `Increased quantity of existing item "${name}"${capStr} by ${qty} pcs${totalStr}.`;
    }
  );

  // 2. Dodano produkt "..." [cap] w ilości X szt.
  text = text.replace(
    /Dodano produkt "([^"]+)"(?:\s*\[(.*?)\])? w ilości (\d+) szt\.?/g,
    (_, name, cap, qty) => {
      const capStr = cap ? ` [${cap}]` : '';
      return `Added item "${name}"${capStr} (quantity: ${qty} pcs).`;
    }
  );

  // 3. Zmniejszono ilość produktu "..." o X szt. (pozostało: Y szt.).
  text = text.replace(
    /Zmniejszono ilość produktu "([^"]+)" o (\d+) szt\.(?:\s*\(pozostało: (\d+) szt\.\))?/g,
    (_, name, qty, remaining) => {
      const remStr = remaining ? ` (remaining: ${remaining} pcs)` : '';
      return `Reduced quantity of item "${name}" by ${qty} pcs${remStr}.`;
    }
  );

  // 4. Całkowicie zużyto produkt "..." w ilości X szt.
  text = text.replace(
    /Całkowicie zużyto produkt "([^"]+)"(?:\s*w ilości (\d+) szt\.)?/g,
    (_, name, qty) => {
      const qtyStr = qty ? ` (quantity: ${qty} pcs)` : '';
      return `Fully consumed item "${name}"${qtyStr}.`;
    }
  );

  // 5. Wyrzucono produkt "..." z powodu przeterminowania.
  text = text.replace(
    /Wyrzucono produkt "([^"]+)" z powodu przeterminowania\.?/g,
    'Discarded item "$1" due to expiration.'
  );

  // 6. Wyrzucono produkt "..." (zmarnowano).
  text = text.replace(
    /Wyrzucono produkt "([^"]+)"(?:\s*\(zmarnowano\))?\.?/g,
    'Discarded item "$1" (wasted).'
  );

  // 7. Usunięto produkt "..." ze spiżarni.
  text = text.replace(
    /Usunięto produkt "([^"]+)" ze spiżarni\.?/g,
    'Removed item "$1" from pantry.'
  );

  // 8. Przeniesiono X kupionych produktów z listy "..." do spiżarni.
  text = text.replace(
    /Przeniesiono (\d+) kupionych produktów z listy "([^"]+)" do spiżarni\.?/g,
    'Transferred $1 purchased items from list "$2" to pantry.'
  );

  // 9. Użytkownik utworzył konto za pomocą kodu zaproszenia i dołączył do gospodarstwa.
  text = text.replace(
    /Użytkownik utworzył konto za pomocą kodu zaproszenia i dołączył do gospodarstwa\.?/g,
    'User registered with invite code and joined the household.'
  );

  // 10. Administrator wygenerował nowy kod zaproszenia ważny przez 5 minut.
  text = text.replace(
    /Administrator wygenerował nowy kod zaproszenia ważny przez 5 minut\.?/g,
    'Administrator generated a new invite code valid for 5 minutes.'
  );

  // 11. Administrator X zmienił rolę użytkownika Y (E) na: R.
  text = text.replace(
    /Administrator (.+?) zmienił rolę użytkownika (.+?) \((.+?)\) na:\s*([A-Z]+)\.?/g,
    'Administrator $1 changed role of user $2 ($3) to: $4.'
  );

  // 12. Administrator X usunął konto użytkownika Y (E) z systemu.
  text = text.replace(
    /Administrator (.+?) usunął konto użytkownika (.+?) \((.+?)\) z systemu\.?/g,
    'Administrator $1 removed user account $2 ($3) from system.'
  );

  // 13. Utworzono pierwsze konto instalacji jako administrator gospodarstwa i administrator systemu.
  text = text.replace(
    /Utworzono pierwsze konto instalacji jako administrator gospodarstwa i administrator systemu\.?/g,
    'Created initial system installation account as household & system administrator.'
  );

  // 14. X dołączył(a) do gospodarstwa domowego.
  text = text.replace(
    /(.+?) dołączył\(a\) do gospodarstwa domowego\.?/g,
    '$1 joined the household.'
  );

  // 15. Zaktualizowano dane produktu "..." / Edycja pól:
  text = text.replace(/Zaktualizowano dane produktu "([^"]+)":?/g, 'Updated item "$1" properties:');
  text = text.replace(/\bilość:\s*/g, 'quantity: ');
  text = text.replace(/\bnazwa:\s*/g, 'name: ');
  text = text.replace(/\bdata ważności:\s*/g, 'expiry date: ');
  text = text.replace(/\bdata otwarcia:\s*/g, 'open date: ');
  text = text.replace(/\bpojemność:\s*/g, 'net weight/volume: ');
  text = text.replace(/\bkategoria:\s*/g, 'category: ');
  text = text.replace(/\bmarka:\s*/g, 'brand: ');
  text = text.replace(/\bkod kreskowy:\s*/g, 'barcode: ');
  text = text.replace(/\bnotatki:\s*/g, 'notes: ');
  text = text.replace(/\botwarty:\s*tak\b/gi, 'opened: yes');
  text = text.replace(/\botwarty:\s*nie\b/gi, 'opened: no');
  text = text.replace(/\bbrak\b/gi, 'none');

  return text;
}

export const AuditLogsView: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const { t, language } = useLanguage();

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
      showToast(t('audit.errorFetching'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, page, actionFilter, userFilter, search, t]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">
          {t('audit.accessRestricted')}
        </h3>
        <p className="text-xs text-slate-400">
          {t('audit.accessRestrictedDesc')}
        </p>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DODANO_PRODUKT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <PlusCircle className="w-3.5 h-3.5" />
            {language === 'en' ? 'Item added' : 'Dodano produkt'}
          </span>
        );
      case 'ZWIĘKSZONO_ILOSC':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <PlusCircle className="w-3.5 h-3.5" />
            {language === 'en' ? 'Quantity increased' : 'Zwiększono ilość'}
          </span>
        );
      case 'ZMIENIONO_WARTOSCI':
      case 'EDYTOWANO_PRODUKT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Edit3 className="w-3.5 h-3.5" />
            {language === 'en' ? 'Item edited' : 'Edytowano dane'}
          </span>
        );
      case 'ZMNIEJSZONO_ILOSC':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <MinusCircle className="w-3.5 h-3.5" />
            {language === 'en' ? 'Quantity reduced' : 'Zmniejszono ilość'}
          </span>
        );
      case 'ZUŻYTO_PRODUKT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <MinusCircle className="w-3.5 h-3.5" />
            {language === 'en' ? 'Fully consumed' : 'Całkowicie zużyto'}
          </span>
        );
      case 'USUNIĘTO_PRODUKT':
      case 'USUNIETO_PRODUKT':
      case 'WYRZUCONO_PRODUKT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Trash2 className="w-3.5 h-3.5" />
            {language === 'en' ? 'Removed / Discarded' : 'Usunięto / Wyrzucono'}
          </span>
        );
      case 'PRZENIESIONO_Z_LISTY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <ShoppingCart className="w-3.5 h-3.5" />
            {language === 'en' ? 'Transferred from shopping' : 'Przeniesiono z zakupów'}
          </span>
        );
      case 'DOLACZONO_DO_DOMU':
      case 'NOWY_DOMOWNIK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <UserPlus className="w-3.5 h-3.5" />
            {language === 'en' ? 'Member joined' : 'Nowy domownik'}
          </span>
        );
      case 'WYGENEROWANO_KOD_ZAPROSZENIA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <KeyRound className="w-3.5 h-3.5" />
            {language === 'en' ? 'Invite code' : 'Kod zaproszenia'}
          </span>
        );
      case 'ZMIANA_ROLI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            {language === 'en' ? 'Role changed' : 'Zmiana uprawnień'}
          </span>
        );
      case 'USUNIETO_CZLONKA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Trash2 className="w-3.5 h-3.5" />
            {language === 'en' ? 'Member removed' : 'Usunięto użytkownika'}
          </span>
        );
      case 'UTWORZONO_GOSPODARSTWO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Home className="w-3.5 h-3.5" />
            {language === 'en' ? 'Household created' : 'Utworzono dom'}
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
          return (
            <p className="text-xs text-slate-200">
              {formatAuditDetails(parsed.message, language)}
            </p>
          );
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

    return (
      <p className="text-xs text-slate-200">
        {formatAuditDetails(detailsStr, language)}
      </p>
    );
  };

  const locale = language === 'en' ? 'en-US' : 'pl-PL';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              {t('audit.title')}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('audit.desc')}
          </p>
        </div>

        <button
          onClick={() => fetchAuditData()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {/* Podsumowanie Aktywności */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400">
              {t('audit.events30Days')}
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">{stats.totalEvents30Days}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] font-semibold text-emerald-400">
              {t('audit.itemsAddedStat')}
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {(stats.actionCounts['DODANO_PRODUKT'] || 0) + (stats.actionCounts['ZWIĘKSZONO_ILOSC'] || 0)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] font-semibold text-amber-400">
              {t('audit.consumedStat')}
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {(stats.actionCounts['ZMNIEJSZONO_ILOSC'] || 0) + (stats.actionCounts['ZUŻYTO_PRODUKT'] || 0)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] font-semibold text-cyan-400">
              {t('audit.editsStat')}
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {(stats.actionCounts['ZMIENIONO_WARTOSCI'] || 0) + (stats.actionCounts['EDYTOWANO_PRODUKT'] || 0)}
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
              placeholder={t('audit.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Typ akcji */}
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">{t('audit.allActionTypes')}</option>
            <option value="DODANO_PRODUKT">{language === 'en' ? 'Item added' : 'Dodanie produktu'}</option>
            <option value="ZWIĘKSZONO_ILOSC">{language === 'en' ? 'Quantity increased' : 'Zwiększenie ilości'}</option>
            <option value="ZMIENIONO_WARTOSCI">{language === 'en' ? 'Values edited' : 'Edycja wartości'}</option>
            <option value="ZMNIEJSZONO_ILOSC">{language === 'en' ? 'Quantity reduced / Consumed' : 'Zmniejszenie ilości / Zużycie'}</option>
            <option value="ZUŻYTO_PRODUKT">{language === 'en' ? 'Fully consumed' : 'Całkowite zużycie'}</option>
            <option value="USUNIĘTO_PRODUKT">{language === 'en' ? 'Item deleted' : 'Usunięcie produktu'}</option>
            <option value="PRZENIESIONO_Z_LISTY">{language === 'en' ? 'Transferred from shopping' : 'Przeniesienie z zakupów'}</option>
            <option value="DOLACZONO_DO_DOMU">{language === 'en' ? 'Member joined' : 'Dołączenie domownika'}</option>
            <option value="ZMIANA_ROLI">{language === 'en' ? 'Role change' : 'Zmiana uprawnień'}</option>
            <option value="WYGENEROWANO_KOD_ZAPROSZENIA">{language === 'en' ? 'Invite code generated' : 'Wygenerowanie kodu'}</option>
          </select>

          {/* Użytkownicy */}
          <select
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">{t('audit.allUsers')}</option>
            {stats && Object.entries(stats.userActivity).map(([uid, u]) => (
              <option key={uid} value={uid}>
                {u.name} ({u.count} {t('audit.actionsCount')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista Zdarzeń / Oś Czasu */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            {t('audit.empty')}
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
                    {new Date(log.createdAt).toLocaleString(locale, {
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
                  {t('audit.itemPrefix')}: <strong className="text-white font-bold">{log.entityName}</strong>
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
            {language === 'en'
              ? `Page ${page} of ${totalPages} (total ${total} entries)`
              : `Strona ${page} z ${totalPages} (łącznie ${total} wpisów)`}
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

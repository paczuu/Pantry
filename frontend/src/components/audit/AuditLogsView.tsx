import React, { useState, useEffect, useCallback } from 'react';
import { EmptyState, Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { cn } from '../../utils/cn';
import { SearchInput, Select } from '../ui/FormControls';
import { ActivityLog, AuditStats } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../language/LanguageContext';
import { Language } from '../../language/translations';
import {
  ShieldAlert,
  Search,
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
 * Translates action descriptions (details) stored in the database into the selected language.
 * The stored text is Polish, so it is returned unchanged for `pl` and pattern-matched for `en`.
 */
export function formatAuditDetails(detailsStr: string, language: Language): string {
  if (!detailsStr) return '';
  if (language === 'pl') {
    return detailsStr;
  }

  let text = detailsStr;

  // 1. Increased quantity of an existing item "..." [cap] by X pcs (currently in pantry: Y pcs).
  text = text.replace(
    /Zwiększono ilość istniejącego produktu "([^"]+)"(?:\s*\[(.*?)\])? o (\d+) szt\.(?:\s*\(aktualnie w spiżarni: (\d+) szt\.\))?/g,
    (_, name, cap, qty, total) => {
      const capStr = cap ? ` [${cap}]` : '';
      const totalStr = total ? ` (currently in pantry: ${total} pcs)` : '';
      return `Increased quantity of existing item "${name}"${capStr} by ${qty} pcs${totalStr}.`;
    }
  );

  // 2. Added item "..." [cap] with quantity X pcs.
  text = text.replace(
    /Dodano produkt "([^"]+)"(?:\s*\[(.*?)\])? w ilości (\d+) szt\.?/g,
    (_, name, cap, qty) => {
      const capStr = cap ? ` [${cap}]` : '';
      return `Added item "${name}"${capStr} (quantity: ${qty} pcs).`;
    }
  );

  // 3. Decreased quantity of item "..." by X pcs (remaining: Y pcs).
  text = text.replace(
    /Zmniejszono ilość produktu "([^"]+)" o (\d+) szt\.(?:\s*\(pozostało: (\d+) szt\.\))?/g,
    (_, name, qty, remaining) => {
      const remStr = remaining ? ` (remaining: ${remaining} pcs)` : '';
      return `Reduced quantity of item "${name}" by ${qty} pcs${remStr}.`;
    }
  );

  // 4. Item "..." fully consumed (X pcs).
  text = text.replace(
    /Całkowicie zużyto produkt "([^"]+)"(?:\s*w ilości (\d+) szt\.)?/g,
    (_, name, qty) => {
      const qtyStr = qty ? ` (quantity: ${qty} pcs)` : '';
      return `Fully consumed item "${name}"${qtyStr}.`;
    }
  );

  // 5. Item "..." thrown away because it expired.
  text = text.replace(
    /Wyrzucono produkt "([^"]+)" z powodu przeterminowania\.?/g,
    'Discarded item "$1" due to expiration.'
  );

  // 6. Item "..." thrown away (wasted).
  text = text.replace(
    /Wyrzucono produkt "([^"]+)"(?:\s*\(zmarnowano\))?\.?/g,
    'Discarded item "$1" (wasted).'
  );

  // 7. Item "..." removed from the pantry.
  text = text.replace(
    /Usunięto produkt "([^"]+)" ze spiżarni\.?/g,
    'Removed item "$1" from pantry.'
  );

  // 8. X bought items moved from list "..." to the pantry.
  text = text.replace(
    /Przeniesiono (\d+) kupionych produktów z listy "([^"]+)" do spiżarni\.?/g,
    'Transferred $1 purchased items from list "$2" to pantry.'
  );

  // 9. A user registered with an invite code and joined the household.
  text = text.replace(
    /Użytkownik utworzył konto za pomocą kodu zaproszenia i dołączył do gospodarstwa\.?/g,
    'User registered with invite code and joined the household.'
  );

  // 10. An admin generated a new invite code valid for 5 minutes.
  text = text.replace(
    /Administrator wygenerował nowy kod zaproszenia ważny przez 5 minut\.?/g,
    'Administrator generated a new invite code valid for 5 minutes.'
  );

  // 11. Admin X changed the role of user Y (E) to R.
  text = text.replace(
    /Administrator (.+?) zmienił rolę użytkownika (.+?) \((.+?)\) na:\s*([A-Z]+)\.?/g,
    'Administrator $1 changed role of user $2 ($3) to: $4.'
  );

  // 12. Admin X deleted the account of user Y (E).
  text = text.replace(
    /Administrator (.+?) usunął konto użytkownika (.+?) \((.+?)\) z systemu\.?/g,
    'Administrator $1 removed user account $2 ($3) from system.'
  );

  // 13. First account of the installation created as household admin and system admin.
  text = text.replace(
    /Utworzono pierwsze konto instalacji jako administrator gospodarstwa i administrator systemu\.?/g,
    'Created initial system installation account as household & system administrator.'
  );

  // 14. X joined the household.
  text = text.replace(
    /(.+?) dołączył\(a\) do gospodarstwa domowego\.?/g,
    '$1 joined the household.'
  );

  // 15. Item "..." updated / edited fields:
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
      <EmptyState
        className="max-w-md mx-auto"
        icon={<ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />}
        title={t('audit.accessRestricted')}
        description={t('audit.accessRestrictedDesc')}
      />
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ADDED_PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <PlusCircle className="w-3.5 h-3.5" />
            {language === 'en' ? 'Item added' : 'Dodano produkt'}
          </span>
        );
      case 'INCREASED_QUANTITY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <PlusCircle className="w-3.5 h-3.5" />
            {language === 'en' ? 'Quantity increased' : 'Zwiększono ilość'}
          </span>
        );
      case 'UPDATED_VALUES':
      case 'EDYTOWANO_PRODUKT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Edit3 className="w-3.5 h-3.5" />
            {language === 'en' ? 'Item edited' : 'Edytowano dane'}
          </span>
        );
      case 'DECREASED_QUANTITY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <MinusCircle className="w-3.5 h-3.5" />
            {language === 'en' ? 'Quantity reduced' : 'Zmniejszono ilość'}
          </span>
        );
      case 'CONSUMED_PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <MinusCircle className="w-3.5 h-3.5" />
            {language === 'en' ? 'Fully consumed' : 'Całkowicie zużyto'}
          </span>
        );
      case 'DELETED_PRODUCT':
      case 'USUNIETO_PRODUKT':
      case 'DISCARDED_PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Trash2 className="w-3.5 h-3.5" />
            {language === 'en' ? 'Removed / Discarded' : 'Usunięto / Wyrzucono'}
          </span>
        );
      case 'TRANSFERRED_TO_PANTRY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <ShoppingCart className="w-3.5 h-3.5" />
            {language === 'en' ? 'Transferred from shopping' : 'Przeniesiono z zakupów'}
          </span>
        );
      case 'JOINED_HOUSEHOLD':
      case 'NOWY_DOMOWNIK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <UserPlus className="w-3.5 h-3.5" />
            {language === 'en' ? 'Member joined' : 'Nowy domownik'}
          </span>
        );
      case 'INVITE_CODE_GENERATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <KeyRound className="w-3.5 h-3.5" />
            {language === 'en' ? 'Invite code' : 'Kod zaproszenia'}
          </span>
        );
      case 'ROLE_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            {language === 'en' ? 'Role changed' : 'Zmiana uprawnień'}
          </span>
        );
      case 'USER_DELETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Trash2 className="w-3.5 h-3.5" />
            {language === 'en' ? 'Member removed' : 'Usunięto użytkownika'}
          </span>
        );
      case 'HOUSEHOLD_CREATED':
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
      // Plain text
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
      {/* Header */}
      <PageHeader
        icon={<ShieldAlert />}
        iconClassName="text-amber-400"
        title={t('audit.title')}
        subtitle={t('audit.desc')}
        actions={
          <Button
            icon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
            collapseLabel
            onClick={() => fetchAuditData()}
          >
            {t('common.refresh')}
          </Button>
        }
      />

      {/* Activity summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Panel className="p-3.5 rounded-2xl">
            <div className="text-[11px] font-semibold text-slate-400">
              {t('audit.events30Days')}
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">{stats.totalEvents30Days}</div>
          </Panel>
          <Panel className="p-3.5 rounded-2xl">
            <div className="text-[11px] font-semibold text-emerald-400">
              {t('audit.itemsAddedStat')}
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {(stats.actionCounts['ADDED_PRODUCT'] || 0) + (stats.actionCounts['INCREASED_QUANTITY'] || 0)}
            </div>
          </Panel>
          <Panel className="p-3.5 rounded-2xl">
            <div className="text-[11px] font-semibold text-amber-400">
              {t('audit.consumedStat')}
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {(stats.actionCounts['DECREASED_QUANTITY'] || 0) + (stats.actionCounts['CONSUMED_PRODUCT'] || 0)}
            </div>
          </Panel>
          <Panel className="p-3.5 rounded-2xl">
            <div className="text-[11px] font-semibold text-cyan-400">
              {t('audit.editsStat')}
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {(stats.actionCounts['UPDATED_VALUES'] || 0) + (stats.actionCounts['EDYTOWANO_PRODUKT'] || 0)}
            </div>
          </Panel>
        </div>
      )}

      {/* Filters */}
      <Panel className="p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Search */}
          <SearchInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('audit.searchPlaceholder')}
            className="py-2 text-xs rounded-xl bg-slate-800 border-slate-700"
          />

          {/* Action type */}
          <Select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="py-2 text-xs w-auto"
          >
            <option value="ALL">{t('audit.allActionTypes')}</option>
            <option value="ADDED_PRODUCT">{language === 'en' ? 'Item added' : 'Dodanie produktu'}</option>
            <option value="INCREASED_QUANTITY">{language === 'en' ? 'Quantity increased' : 'Zwiększenie ilości'}</option>
            <option value="UPDATED_VALUES">{language === 'en' ? 'Values edited' : 'Edycja wartości'}</option>
            <option value="DECREASED_QUANTITY">{language === 'en' ? 'Quantity reduced / Consumed' : 'Zmniejszenie ilości / Zużycie'}</option>
            <option value="CONSUMED_PRODUCT">{language === 'en' ? 'Fully consumed' : 'Całkowite zużycie'}</option>
            <option value="DELETED_PRODUCT">{language === 'en' ? 'Item deleted' : 'Usunięcie produktu'}</option>
            <option value="TRANSFERRED_TO_PANTRY">{language === 'en' ? 'Transferred from shopping' : 'Przeniesienie z zakupów'}</option>
            <option value="JOINED_HOUSEHOLD">{language === 'en' ? 'Member joined' : 'Dołączenie domownika'}</option>
            <option value="ROLE_CHANGE">{language === 'en' ? 'Role change' : 'Zmiana uprawnień'}</option>
            <option value="INVITE_CODE_GENERATED">{language === 'en' ? 'Invite code generated' : 'Wygenerowanie kodu'}</option>
          </Select>

          {/* Users */}
          <Select
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
            className="py-2 text-xs w-auto"
          >
            <option value="ALL">{t('audit.allUsers')}</option>
            {stats && Object.entries(stats.userActivity).map(([uid, u]) => (
              <option key={uid} value={uid}>
                {u.name} ({u.count} {t('audit.actionsCount')})
              </option>
            ))}
          </Select>
        </div>
      </Panel>

      {/* Event timeline */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <EmptyState title={t('audit.empty')} />
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 transition-all space-y-2.5 shadow-sm"
            >
              {/* Event header: who, what, when */}
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

              {/* Target and change details */}
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

      {/* Pagination */}
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

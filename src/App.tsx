import { useEffect, useMemo, useRef, useState } from 'react';
import { StoreProvider, useStore } from './store/store';
import { Sidebar, Topbar, type PageKey } from './components/layout';
import { ToastProvider, useToast } from './components/notifications';
import { computeAlerts } from './utils/alerts';
import { playLateAlert, playWaterAlert, setSoundEnabled } from './utils/sound';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Tenants from './pages/Tenants';
import Contracts from './pages/Contracts';
import Rents from './pages/Rents';
import Water from './pages/Water';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Backup from './pages/Backup';
import Settings from './pages/Settings';
import History from './pages/History';
import { localDateKey } from './utils/waterSchedule';

const TITLES: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue d’ensemble du patrimoine' },
  properties: { title: 'Biens', subtitle: 'Logements' },
  tenants: { title: 'Locataires', subtitle: 'Gestion des locataires' },
  contracts: { title: 'Contrats de location', subtitle: 'Baux et échéances' },
  rents: { title: 'Loyers', subtitle: 'Échéances mensuelles & retards' },
  water: { title: 'Eau / Compteurs', subtitle: 'Relevés, prélèvements et factures' },
  payments: { title: 'Paiements', subtitle: 'Encaissements et reçus' },
  maintenance: { title: 'Maintenance', subtitle: 'Interventions' },
  documents: { title: 'Documents', subtitle: 'Fichiers locaux' },
  reports: { title: 'Rapports et statistiques', subtitle: 'Analyses' },
  backup: { title: 'Sauvegarde et exportation', subtitle: 'Sécurité des données' },
  settings: { title: 'Paramètres', subtitle: 'Configuration, sons & alertes' },
  history: { title: 'Historique des actions', subtitle: 'Journal des opérations · conservation trois mois' },
};

function timeAgo(iso?: string) {
  if (!iso) return 'aucune sauvegarde auto';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `sauvegarde auto à l'instant`;
  if (s < 3600) return `sauvegarde auto il y a ${Math.floor(s / 60)} min`;
  return `sauvegarde auto ${new Date(iso).toLocaleDateString('fr-FR')} ${new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

function ShellInner() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'bailleur' | 'eau'>('bailleur');
  const [search, setSearch] = useState('');
  const [clock, setClock] = useState(() => new Date());
  const { state, rents, waters, lastSavedAt, logAction } = useStore();
  const { push } = useToast();
  const alertedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  const alerts = useMemo(() => computeAlerts(state, rents, waters, clock), [state.properties, state.tenants, state.contracts, state.waterMeters, state.waterReadings, state.settings, rents, waters, clock]);
  const currentDay = localDateKey(clock);
  const lastDay = useRef(currentDay);

  // Refresh notices when the application remains open across a due date.
  useEffect(() => {
    if (lastDay.current === currentDay) return;
    lastDay.current = currentDay;
    const late = alerts.filter(a => a.category === 'retard_loyer');
    const waterDue = alerts.filter(a => a.category === 'releve_eau');
    if (state.settings.soundEnabled && state.settings.soundOnAlerts) {
      if (late.length) playLateAlert(); else if (waterDue.length) playWaterAlert();
    }
    if (late.length) push({ severity: 'danger', title: `${late.length} loyer(s) en retard`, message: 'Consultez les échéances non soldées.' }, { sound: false });
    if (waterDue.length) push({ severity: 'water', title: `${waterDue.length} relevé(s) à effectuer`, message: 'Les dates prévues des compteurs sont arrivées.' }, { sound: false });
  }, [currentDay, alerts, state.settings.soundEnabled, state.settings.soundOnAlerts, push]);

  const navigate = (next: PageKey) => {
    if (page !== next) {
      logAction({ action: 'consultation', module: 'Navigation', target: TITLES[next].title, details: `Ouverture de la rubrique ${TITLES[next].title}.` });
      setPage(next);
    }
    setSearch('');
  };

  // Sons au démarrage : signaler retards / relevés (une seule fois)
  useEffect(() => {
    setSoundEnabled(state.settings.soundEnabled !== false);
    if (alertedRef.current) return;
    alertedRef.current = true;
    const t = setTimeout(() => {
      const late = alerts.filter(a => a.category === 'retard_loyer');
      const waterDue = alerts.filter(a => a.category === 'releve_eau');
      if (state.settings.soundEnabled && state.settings.soundOnAlerts) {
        if (late.length) playLateAlert(); else if (waterDue.length) playWaterAlert();
      }
      if (late.length) push({ severity: 'danger', title: `🚨 ${late.length} retard${late.length > 1 ? 's' : ''} de paiement signalé${late.length > 1 ? 's' : ''}`, message: late.slice(0, 2).map(a => a.title).join(' • ') }, { sound: false });
      if (waterDue.length) push({ severity: 'water', title: `💧 ${waterDue.length} prélèvement${waterDue.length > 1 ? 's' : ''} compteur à prévoir`, message: waterDue.slice(0, 2).map(a => `${a.propertyRef} — ${a.dateLabel}`).join(' • ') }, { sound: false });
      if (!late.length && !waterDue.length) push({ severity: 'success', title: 'Bienvenue — tout est à jour', message: 'Aucun retard de loyer, aucun relevé d’eau en attente.' }, { sound: false });
      if (state.settings.autoBackupEnabled) push({ severity: 'info', title: '💾 Sauvegarde automatique active', message: `Toutes les ${state.settings.autoBackupIntervalMinutes} min + à chaque paiement • ${timeAgo(state.settings.lastAutoBackup)}` });
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.length]);

  const counts = useMemo(() => {
    return {
      rents: alerts.filter(a => a.category === 'retard_loyer' || a.category === 'echeance_loyer').length,
      water: alerts.filter(a => a.category === 'releve_eau' || a.category === 'facture_eau').length,
      maintenance: state.maintenances.filter(m => m.status === 'signale' || m.status === 'en_cours').length,
      contracts: alerts.filter(a => a.category === 'contrat').length,
    } as Record<string, number>;
  }, [alerts, state.maintenances]);

  const autoLabel = state.settings.autoBackupEnabled
    ? `Sauvegarde auto : ACTIVE (toutes les ${state.settings.autoBackupIntervalMinutes} min) • ${timeAgo(state.settings.lastAutoBackup)}`
    : 'Sauvegarde auto : désactivée — activez-la dans Sauvegarde';
  const lastSavedLabel = `Enregistré ${new Date(lastSavedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  const occ = state.properties.filter(p => p.status === 'occupe').length;

  return (
    <div className="min-h-screen">
      <Sidebar page={page} setPage={navigate} counts={counts} autoBackupLabel={autoLabel} occupiedLabel={`${occ}/${state.properties.length} logements occupés`} />
      <div className="ml-[248px] min-h-screen">
        <Topbar title={TITLES[page].title} subtitle={TITLES[page].subtitle} search={search} setSearch={setSearch} landlordName={state.settings.company || state.settings.landlordName} alerts={alerts} go={navigate} autoBackupLabel={autoLabel} lastSavedLabel={lastSavedLabel} />
        <main className="fade-up mx-auto max-w-[1320px] px-6 py-5" key={page}>
          {page === 'dashboard' && <Dashboard go={navigate} alerts={alerts} />}
          {page === 'properties' && <Properties search={search} />}
          {page === 'tenants' && <Tenants search={search} />}
          {page === 'contracts' && <Contracts search={search} />}
          {page === 'rents' && <Rents search={search} />}
          {page === 'water' && <Water search={search} onScheduleSettings={() => { setSettingsTab('eau'); navigate('settings'); }} />}
          {page === 'payments' && <Payments search={search} />}
          {page === 'maintenance' && <Maintenance search={search} />}
          {page === 'documents' && <Documents search={search} />}
          {page === 'reports' && <Reports />}
          {page === 'backup' && <Backup />}
          {page === 'settings' && <Settings initialTab={settingsTab} onOpenHistory={() => navigate('history')} />}
          {page === 'history' && <History search={search} />}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-300/60 py-4 text-[11.5px] text-slate-500">
            <span>Gestion Locative • Stockage local • Hors ligne • © {new Date().getFullYear()} {state.settings.company}</span>
            <span className="font-semibold text-emerald-600">● {lastSavedLabel} • {state.settings.autoBackupEnabled ? `Auto-save ${state.settings.autoBackupIntervalMinutes} min` : 'Auto-save OFF'}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Shell() {
  const { state } = useStore();
  return <ToastProvider soundEnabled={state.settings.soundEnabled !== false}><ShellInner /></ToastProvider>;
}
export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}

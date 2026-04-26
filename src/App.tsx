import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './views/Dashboard';
import Study from './views/Study';
import Manage from './views/Manage';
import { useStore } from './store/useStore';
import { seedIfEmpty } from './lib/seed';

const App = () => {
  const loadAll = useStore((s) => s.loadAll);
  const loaded = useStore((s) => s.loaded);
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const summary = await seedIfEmpty();
        if (summary.errors.length) setSeedError(summary.errors.join('; '));
      } catch (err) {
        setSeedError(err instanceof Error ? err.message : String(err));
      }
      await loadAll();
    })();
  }, [loadAll]);

  if (!loaded) {
    return (
      <div className="study study--done">
        <div className="study__done-inner">
          <div className="mono study__done-kicker">SESSION · LÄDT</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {seedError && <div className="dash__notice mono">Seeding-Hinweis: {seedError}</div>}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/study" element={<Study />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;

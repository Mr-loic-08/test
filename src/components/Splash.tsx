import { useEffect, useState } from 'react';
import Logo from './Logo';

/** Écran de lancement animé : logo ML + barre de chargement, fondu de sortie. */
export default function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2100);
    const t2 = setTimeout(onDone, 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className={`splash-screen ${leaving ? 'splash-leaving' : ''}`}>
      <div className="splash-glow" />
      <div className="splash-card">
        <Logo size={132} rounded={28} />
        <h1 className="splash-title">ML · Gestion Locative</h1>
        <p className="splash-sub">Application du bailleur — hors-ligne</p>
        <div className="splash-bar">
          <span className="splash-bar-fill" />
        </div>
        <p className="splash-load">Chargement de vos données locales…</p>
      </div>
    </div>
  );
}

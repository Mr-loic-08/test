import { LOGO_ML_DATA_URL } from './logoData';

/**
 * Logo ML — animé (halo + flottement + reflet).
 * `size` = côté en px. `animate=false` pour l'impression / favicon statique.
 */
export default function Logo({
  size = 44,
  animate = true,
  rounded = 14,
  glow = true,
}: {
  size?: number;
  animate?: boolean;
  rounded?: number;
  glow?: boolean;
}) {
  return (
    <span
      className={`logo-ml ${animate ? 'logo-ml-animated' : ''}`}
      style={{ width: size, height: size, borderRadius: rounded }}
    >
      <img
        src={LOGO_ML_DATA_URL}
        alt="ML — Gestion Locative"
        width={size}
        height={size}
        draggable={false}
        style={{ width: size, height: size, borderRadius: rounded }}
      />
      {glow && <span className="logo-ml-shine" style={{ borderRadius: rounded }} />}
    </span>
  );
}

/** Petit monogramme vectoriel pour favicon / onglets (léger, net en 16-64px). */
export const FAVICON_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='%23070812'/><text x='32' y='40' text-anchor='middle' font-family='Georgia,serif' font-style='italic' font-size='30' fill='%23cbd5e1'>M</text><text x='40' y='46' text-anchor='middle' font-family='Georgia,serif' font-style='italic' font-size='26' fill='%2394a3b8'>L</text><text x='32' y='58' text-anchor='middle' font-family='Georgia,serif' font-size='9' letter-spacing='3' fill='%2364748b'>ML</text></svg>`;

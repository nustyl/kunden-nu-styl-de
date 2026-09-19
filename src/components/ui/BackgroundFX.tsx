// Fester Hintergrund wie auf nu-styl.de: zwei weiche orange Leuchtflächen und
// langsam umherschwebende Social-Media-Icons (Instagram, TikTok, Herz,
// Kommentar, Play, LinkedIn, Facebook, Teilen). Rein dekorativ.

interface FloatIcon {
  style: React.CSSProperties;
  children: React.ReactNode;
  strokeWidth?: number;
}

const ICONS: FloatIcon[] = [
  {
    // Instagram
    style: { top: "9%", left: "6%", width: 64, height: 64, animationDuration: "13s", animationDelay: "-1s" },
    children: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.2" />
        <circle cx="16.2" cy="7.8" r="0.6" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    // TikTok
    style: { top: "15%", right: "7%", width: 52, height: 52, animationDuration: "10s", animationDelay: "-3s" },
    children: <path d="M13 4v10.5a3 3 0 1 1-2.4-2.94M13 4c0 2.5 2 4.3 4.5 4.5" />,
  },
  {
    // Herz
    style: { top: "50%", left: "3%", width: 46, height: 46, animationDuration: "14s", animationDelay: "-5s" },
    children: <path d="M12 20s-7-4.4-9.5-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.5 5c-2.5 4.6-9.5 9-9.5 9Z" />,
  },
  {
    // Kommentar
    style: { top: "58%", right: "5%", width: 58, height: 58, animationDuration: "11s", animationDelay: "-2s" },
    children: <path d="M4 5h16v11H8l-4 4Z" />,
  },
  {
    // Play
    style: { top: "80%", left: "12%", width: 42, height: 42, animationDuration: "15s", animationDelay: "-6s" },
    children: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5v7l6-3.5Z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    // LinkedIn
    style: { top: "30%", right: "22%", width: 38, height: 38, animationDuration: "12s", animationDelay: "-4s" },
    strokeWidth: 1.8,
    children: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 10.5v5.5M8 8v.01M12 16v-3.2c0-1.4 1-2.3 2.2-2.3s2 .9 2 2.2V16" />
      </>
    ),
  },
  {
    // Facebook
    style: { top: "72%", right: "24%", width: 44, height: 44, animationDuration: "16s", animationDelay: "-7s" },
    children: <path d="M14.5 4.5h-2A3.5 3.5 0 0 0 9 8v2.5H6.5V14H9v6h3.5v-6H15l.5-3.5h-3V8a.9.9 0 0 1 .9-.9h2.1z" />,
  },
  {
    // Teilen
    style: { top: "38%", left: "16%", width: 40, height: 40, animationDuration: "17s", animationDelay: "-9s" },
    children: <path d="M20 4 3.5 10.5l6 2.5 2.5 6ZM9.5 13 20 4" />,
  },
];

export function BackgroundFX() {
  return (
    <div className="page-glow" aria-hidden="true">
      <span className="glow-blob blob-a" />
      <span className="glow-blob blob-b" />
      <div className="fx-icons">
        {ICONS.map((icon, i) => (
          <span key={i} className="fx-icon" style={icon.style}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={icon.strokeWidth ?? 1.4}
            >
              {icon.children}
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

import { useSeasonalTheme } from "@/lib/seasonal-theme-context-hooks";
import { useEffect, useState } from "react";

/* ── Snowflake animation for Christmas ── */
function Snowfall() {
  const [flakes] = useState(() =>
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 8 + Math.random() * 16,
      opacity: 0.3 + Math.random() * 0.5,
    }))
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="absolute animate-snowfall text-white select-none"
          style={{
            left: `${f.left}%`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            fontSize: `${f.size}px`,
            opacity: f.opacity,
            top: "-20px",
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}

/* ── Floating seasonal elements ── */
function FloatingElements({ elements }: { elements: string[] }) {
  const emojiMap: Record<string, string[]> = {
    "christmas-tree": ["🎄"],
    santa: ["🎅"],
    reindeer: ["🦌"],
    gifts: ["🎁"],
    snowflakes: ["❄️"],
    lightning: ["⚡"],
    "sale-tags": ["🏷️"],
    flowers: ["🌸", "🌺", "🌷"],
    butterflies: ["🦋"],
    books: ["📚"],
    pencils: ["✏️"],
    backpack: ["🎒"],
    sun: ["☀️"],
    waves: ["🌊"],
    "palm-tree": ["🌴"],
  };

  const emojis = elements.flatMap((e) => emojiMap[e] || []);
  const safeEmojis = emojis.length > 0 ? emojis : ["⭐"];
  const [items] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: safeEmojis[i % safeEmojis.length],
      left: Math.random() * 90 + 5,
      top: Math.random() * 90 + 5,
      delay: Math.random() * 4,
      duration: 10 + Math.random() * 15,
      size: 20 + Math.random() * 20,
    }))
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden" aria-hidden="true">
      {items.map((item) => (
        <span
          key={item.id}
          className="absolute animate-float select-none"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            fontSize: `${item.size}px`,
            opacity: 0.25,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}

/* ── Top promotional banner ── */
function TopBanner({ text, slug }: { text: string; slug: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const bgMap: Record<string, string> = {
    christmas: "bg-gradient-to-r from-red-600 via-red-700 to-green-700",
    "black-friday": "bg-gradient-to-r from-gray-900 via-gray-800 to-orange-600",
    "spring-deals": "bg-gradient-to-r from-pink-500 via-rose-400 to-green-400",
    "back-to-school": "bg-gradient-to-r from-blue-600 via-blue-500 to-yellow-500",
    "summer-sale": "bg-gradient-to-r from-orange-500 via-yellow-400 to-cyan-400",
  };

  return (
    <div className={`relative z-[100] flex items-center justify-center px-4 py-2 text-center text-xs sm:text-sm font-bold text-white ${bgMap[slug] || "bg-primary"}`}>
      <span className="animate-pulse">{text}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

/* ── Main decorator component ── */
export function SeasonalDecorations() {
  const { slug, decorations, isActive } = useSeasonalTheme();

  // Inject seasonal CSS variables
  useEffect(() => {
    if (isActive && decorations.colors) {
      const root = document.documentElement;
      if (decorations.colors.accent) {
        root.style.setProperty("--seasonal-accent", decorations.colors.accent);
      }
      if (decorations.colors.secondary) {
        root.style.setProperty("--seasonal-secondary", decorations.colors.secondary);
      }
      return () => {
        root.style.removeProperty("--seasonal-accent");
        root.style.removeProperty("--seasonal-secondary");
      };
    }
  }, [isActive, decorations.colors]);

  if (!isActive) return null;

  return (
    <>
      {decorations.topBanner && <TopBanner text={decorations.topBanner} slug={slug} />}
      {decorations.snowfall && <Snowfall />}
      {decorations.elements && decorations.elements.length > 0 && (
        <FloatingElements elements={decorations.elements} />
      )}
    </>
  );
}

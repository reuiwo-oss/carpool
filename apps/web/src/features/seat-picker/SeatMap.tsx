import { useId, type ReactNode } from 'react';
import { interiorOf, type Seat } from '@carpool/shared';

/**
 * Schemat auta z góry (SVG) — port 1:1 z `prototype/seat-map.js` z handoffu.
 * Geometria, kolory i glify są tam finalne, więc zmiany zaczynaj od tego pliku
 * w handoffie, nie tutaj.
 *
 * Fotel to widok z góry: zagłówek, oparcie i siedzisko z bocznymi wałkami.
 * Nadwozie ma wypełnienie papierem, żeby tło (mapa) było widoczne tylko
 * na zewnątrz auta. Za ostatnim rzędem rysujemy bagażnik — na razie tylko
 * placeholder, później wejdą w niego miejsca na bagaż.
 *
 * SVG celowo: to samo podejście zadziała w React Native (react-native-svg).
 */
export type Backdrop = 'none' | 'contours' | 'ridge' | 'map';

interface Props {
  seats: Seat[];
  /** Klucz z INTERIORS — decyduje o bagażniku i kształcie nadwozia. */
  interior?: string | null;
  /** Tło poza autem. Domyślnie „Mapa i szlak", wybrane w handoffie. */
  backdrop?: Backdrop;
  /** Miniatura na kartach: bez etykiet, tła i zawartości bagażnika. */
  mini?: boolean;
  /** Pierwszy dotyk pasażera; drugi w to samo miejsce potwierdza. */
  selectedSeatId?: string | null;
  /** Kierowca na własnym przejeździe widzi, kto gdzie siedzi. */
  showNames?: boolean;
  onSelect?: (seat: Seat) => void;
}

const C = {
  accent: 'var(--color-accent)',
  accent100: 'var(--color-accent-100)',
  accent200: 'var(--color-accent-200)',
  accent300: 'var(--color-accent-300)',
  accent700: 'var(--color-accent-700)',
  ink: 'var(--color-neutral-900)',
  paper: 'var(--color-bg)',
  n200: 'var(--color-neutral-200)',
  n300: 'var(--color-neutral-300)',
  n400: 'var(--color-neutral-400)',
  n500: 'var(--color-neutral-500)',
  n600: 'var(--color-neutral-600)',
  n800: 'var(--color-neutral-800)',
  text: 'var(--color-text)',
};

const STATUS_PL: Record<Seat['status'], string> = {
  FREE: 'wolne',
  PENDING: 'oczekuje na potwierdzenie',
  TAKEN: 'zajęte',
  MINE: 'twoje',
  DRIVER: 'kierowca',
};

const initials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();

/** Tło rysowane pod nadwoziem — auto ma własne wypełnienie, więc go nie zasłania. */
function BackdropLayer({ kind, W, H, forestId }: { kind: Backdrop; W: number; H: number; forestId: string }) {
  if (kind === 'contours') {
    return (
      <g>
        {Array.from({ length: 10 }, (_, i) => {
          const y = -24 + (i * (H + 48)) / 9;
          const a = (i % 2 ? 1 : -1) * (14 + (i % 3) * 6);
          return (
            <path key={i} fill="none" stroke={C.n400} strokeWidth={1} opacity={0.8}
              d={`M-10 ${y} Q ${W * 0.22} ${y + a} ${W * 0.45} ${y} T ${W * 0.9} ${y + a * 0.6} T ${W + 40} ${y - a * 0.4}`} />
          );
        })}
      </g>
    );
  }

  if (kind === 'ridge') {
    const p = (pts: [number, number][]) => pts.map(([x, y]) => `${x * W},${y * H}`).join(' ');
    return (
      <g>
        <circle cx={W * 0.8} cy={46} r={16} fill="none" stroke={C.n300} strokeWidth={1} />
        <polygon fill={C.n200}
          points={p([[0, 0.6], [0.16, 0.42], [0.3, 0.53], [0.5, 0.34], [0.68, 0.5], [0.84, 0.4], [1, 0.5], [1, 1], [0, 1]])} />
        <polygon fill={C.n300} opacity={0.55}
          points={p([[0, 0.8], [0.14, 0.66], [0.3, 0.74], [0.48, 0.6], [0.66, 0.72], [0.82, 0.63], [1, 0.71], [1, 1], [0, 1]])} />
        <polyline fill="none" stroke={C.n400} strokeWidth={1}
          points={p([[0, 0.8], [0.14, 0.66], [0.3, 0.74], [0.48, 0.6], [0.66, 0.72], [0.82, 0.63], [1, 0.71]])} />
      </g>
    );
  }

  if (kind === 'map') {
    const grid: ReactNode[] = [];
    for (let x = 16; x < W; x += 32) {
      grid.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke={C.n300} strokeWidth={1} opacity={0.55} />);
    }
    for (let y = 16; y < H; y += 32) {
      grid.push(<line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke={C.n300} strokeWidth={1} opacity={0.55} />);
    }
    const px = W - 30;
    const py = H * 0.28;
    const blob = (key: string, d: string) => (
      <g key={key}>
        <path d={d} fill={C.accent200} opacity={0.55} />
        <path d={d} fill={`url(#${forestId})`} stroke={C.accent300} strokeWidth={1} />
      </g>
    );
    const trees: [number, number][] = [
      [16, 0.12], [34, 0.19], [12, 0.27], [30, 0.33],
      [W - 20, 0.55], [W - 8, 0.63], [W - 24, 0.7], [W - 10, 0.8],
      [18, 0.68], [36, 0.76], [14, 0.84], [30, 0.92],
    ];
    return (
      <g>
        <defs>
          <pattern id={forestId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1={0} y1={0} x2={0} y2={6} stroke={C.accent300} strokeWidth={0.8} opacity={0.7} />
          </pattern>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill={C.accent100} opacity={0.5} />
        {grid}
        {blob('f1', `M-10 ${H * 0.08} C ${W * 0.12} ${H * 0.02} ${W * 0.2} ${H * 0.14} ${W * 0.14} ${H * 0.3} S ${W * 0.02} ${H * 0.42} -10 ${H * 0.4} Z`)}
        {blob('f2', `M${W + 10} ${H * 0.5} C ${W * 0.86} ${H * 0.46} ${W * 0.8} ${H * 0.62} ${W * 0.88} ${H * 0.74} S ${W * 0.98} ${H * 0.9} ${W + 10} ${H * 0.92} Z`)}
        {blob('f3', `M-10 ${H * 0.62} C ${W * 0.1} ${H * 0.58} ${W * 0.18} ${H * 0.74} ${W * 0.1} ${H * 0.86} S ${W * 0.02} ${H + 10} -10 ${H + 10} Z`)}
        <path d={`M${W * 0.62} -10 C ${W * 0.7} ${H * 0.03} ${W * 0.9} ${H * 0.02} ${W * 0.98} ${H * 0.06} S ${W + 10} ${H * 0.12} ${W + 10} -10 Z`}
          fill={C.accent200} opacity={0.8} stroke="none" />
        <path d={`M${W * 0.78} ${H * 0.55} q 14 -10 30 -2 t 26 4 M${W * 0.82} ${H * 0.66} q 12 -8 24 -1 t 20 6`}
          fill="none" stroke={C.accent300} strokeWidth={1} />
        {trees.map(([x, y], i) => (
          <path key={`t${i}`} fill={C.accent100} stroke={C.accent700} strokeWidth={0.9}
            d={`M${x} ${H * y - 6} l4 7 h-8 z M${x} ${H * y - 1} l4 6 h-8 z M${x} ${H * y + 5} v3`} />
        ))}
        {/* szlak: od punktu startu na dole w lewo, górą, na szczyt po prawej */}
        <path fill="none" stroke={C.n600} strokeWidth={1.4} strokeDasharray="4 4"
          d={`M10 ${H - 18} C 34 ${H * 0.78} -6 ${H * 0.58} 22 ${H * 0.42} S 6 ${H * 0.16} 64 10 L ${W - 76} 10 C ${W - 36} 10 ${W} 60 ${px} ${py}`} />
        <circle cx={10} cy={H - 18} r={4} fill={C.paper} stroke={C.n600} strokeWidth={1.4} />
        <polygon points={`${px},${py - 16} ${px + 9},${py} ${px - 9},${py}`}
          fill={C.accent100} stroke={C.n600} strokeWidth={1.4} />
      </g>
    );
  }

  return null;
}

/** Bagażnik — placeholder na kolejną fazę, dziś tylko do oglądania. */
function TrunkBox({ x, y, w, h, mini }: { x: number; y: number; w: number; h: number; mini: boolean }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={C.n400} strokeWidth={1} strokeDasharray="4 3" />
      {!mini && (
        <>
          <g stroke={C.n500} strokeWidth={1.3} fill="none" transform={`translate(${cx} ${cy - 9})`}>
            <rect x={-9} y={-6} width={18} height={15} rx={3} />
            <path d="M-4 -6 v-4 q0 -3 4 -3 q4 0 4 3 v4 M-9 3 h18" />
          </g>
          <text x={cx} y={cy + 19} textAnchor="middle" fontSize={9.5} letterSpacing={2}
            fill={C.n600} fontFamily="var(--font-body)">BAGAŻNIK</text>
        </>
      )}
    </g>
  );
}

function SeatFigure({
  seat, cx, cy, hatchId, mini, isSelected, showNames, onSelect,
}: {
  seat: Seat;
  cx: number;
  cy: number;
  hatchId: string;
  mini: boolean;
  isSelected: boolean;
  showNames: boolean;
  onSelect?: (seat: Seat) => void;
}) {
  const st = seat.status;
  const fill =
    st === 'DRIVER' ? C.ink
    : st === 'MINE' ? C.accent
    : st === 'TAKEN' ? `url(#${hatchId})`
    : st === 'PENDING' ? C.accent100
    : isSelected ? C.accent200
    : C.paper;
  const stroke = st === 'DRIVER' ? C.ink : st === 'TAKEN' ? C.n400 : C.accent;
  const sw = isSelected ? 2 : 1.5;
  const inner = st === 'DRIVER' || st === 'MINE' ? C.paper : st === 'TAKEN' ? C.n500 : C.accent700;
  // Prośba to jeszcze nie rezerwacja — obrys przerywany, jak linia pomocnicza.
  const dash = st === 'PENDING' ? '5 4' : undefined;

  const clickable = st === 'FREE' && !!onSelect;
  const select = () => onSelect?.(seat);
  const gy = cy + 18;

  const label =
    st === 'DRIVER' ? (showNames && seat.who ? seat.who : 'Kierowca')
    : st === 'TAKEN' ? (showNames && seat.who ? seat.who : 'Zajęte')
    : st === 'PENDING' ? (showNames && seat.who ? seat.who : 'Oczekuje')
    : st === 'MINE' ? 'Twoje'
    : seat.label || '';

  return (
    <g
      onClick={clickable ? select : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      } : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      aria-label={clickable ? `${seat.label || seat.id}: ${STATUS_PL[st]}` : undefined}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      {/* celem dotknięcia jest cała komórka, nie sam obrys fotela */}
      <rect x={cx - 48} y={cy - 50} width={96} height={100} fill="transparent" />
      {st === 'TAKEN' && (
        <rect x={cx - 31} y={cy - 41} width={62} height={82} rx={10} fill={C.paper} />
      )}
      <rect x={cx - 16} y={cy - 41} width={32} height={13} rx={6.5}
        fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
      <path d={`M${cx - 31} ${cy - 18} q0 -8 8 -8 h46 q8 0 8 8 v8 q0 6 -6 6 h-50 q-6 0 -6 -6 z`}
        fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
      <path d={`M${cx - 30} ${cy + 2} q0 -6 6 -6 h48 q6 0 6 6 v28 q0 11 -11 11 h-38 q-11 0 -11 -11 z`}
        fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
      <path d={`M${cx - 20} ${cy} v32 M${cx + 20} ${cy} v32`}
        stroke={inner} strokeWidth={1} opacity={0.3} fill="none" />

      {isSelected && (
        <rect className="seat-ring" x={cx - 42} y={cy - 50} width={84} height={98} rx={12}
          fill="none" stroke={C.accent} strokeWidth={1.5} strokeDasharray="5 4" />
      )}

      {st === 'DRIVER' && (
        <g stroke={inner} strokeWidth={1.5} fill="none" transform={`translate(${cx} ${gy})`}>
          <circle r={10} />
          <circle r={2.5} />
          <path d="M-10 0h7.5M2.5 0H10M0 2.5V10" />
        </g>
      )}
      {st === 'MINE' && (
        <path d={`M${cx - 8} ${gy} l5 5 l11 -11`} stroke={inner} strokeWidth={2}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {st === 'PENDING' && (
        // zegar: prośba czeka na decyzję kierowcy
        <g stroke={inner} strokeWidth={1.5} fill="none" transform={`translate(${cx} ${gy})`}>
          <circle r={9} />
          <path d="M0 -4.5 V0 L3.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {st === 'TAKEN' && showNames && seat.who && (
        <>
          <rect x={cx - 15} y={gy - 10} width={30} height={20} fill={C.paper} stroke={C.n400} strokeWidth={1} />
          <text x={cx} y={gy + 4.5} textAnchor="middle" fontSize={12} fontWeight={600}
            fill={C.n800} fontFamily="var(--font-heading)">{initials(seat.who)}</text>
        </>
      )}
      {st === 'FREE' && isSelected && (
        <text x={cx} y={gy + 4.5} textAnchor="middle" fontSize={12} fontWeight={600} letterSpacing={0.5}
          fill={inner} fontFamily="var(--font-heading)">POTWIERDŹ</text>
      )}
      {st === 'FREE' && !isSelected && (
        <path d={`M${cx - 6} ${gy} h12 M${cx} ${gy - 6} v12`} stroke={inner} strokeWidth={1.5} />
      )}

      {!mini && (
        <text x={cx} y={cy + 58} textAnchor="middle" fontSize={11}
          fill={st === 'TAKEN' ? C.n600 : C.text} fontFamily="var(--font-body)">{label}</text>
      )}
    </g>
  );
}

export default function SeatMap({
  seats,
  interior,
  backdrop = 'map',
  mini = false,
  selectedSeatId = null,
  showNames = false,
  onSelect,
}: Props) {
  // Wzorce muszą mieć unikalne id — na kartach „Moje" jest kilka schematów
  // naraz, a powtórzone id to niepoprawny dokument.
  const uid = useId().replace(/:/g, '');
  const hatchId = `cpHatch-${uid}`;
  const forestId = `cpForest-${uid}`;

  if (seats.length === 0) return null;

  const inter = interiorOf(interior);
  const hasBackdrop = !mini && backdrop !== 'none';
  const MG = hasBackdrop ? 26 : 0;
  const CELL = 100;
  const ROW = mini ? 104 : 112;
  const PAD = 26 + MG;
  const HOOD = 60;

  const rows = Math.max(0, ...seats.map((s) => s.y)) + 1;
  const W = 3 * CELL + 2 * PAD;
  const yTop = PAD + HOOD;
  const trunkY = yTop + rows * ROW + 2;
  const trunkH = inter.trunk;
  const H = trunkY + trunkH + (inter.open ? 26 : 34) + MG;

  const L = 14 + MG;
  const R = W - 14 - MG;
  const T = 14 + MG;
  const wheelTop = PAD + HOOD - 2;
  const wheelBottom = inter.open ? H - 14 - MG - 54 : trunkY - 30;

  const cross = (x: number, y: number) => (
    <path key={`c${x}-${y}`} d={`M${x - 6} ${y} h12 M${x} ${y - 6} v12`} stroke={C.n500} strokeWidth={1} />
  );

  // Rzędy są centrowane, więc rząd dwuosobowy siedzi symetrycznie względem osi.
  const byRow: Record<number, number[]> = {};
  seats.forEach((s) => {
    (byRow[s.y] = byRow[s.y] ?? []).push(s.x);
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', maxWidth: mini ? 92 : 330, margin: '0 auto', overflow: 'hidden' }}
      role="group"
      aria-label="Schemat miejsc w samochodzie"
    >
      <defs>
        <pattern id={hatchId} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={5} stroke={C.n400} strokeWidth={1.2} />
        </pattern>
      </defs>

      {hasBackdrop && <BackdropLayer kind={backdrop} W={W} H={H} forestId={forestId} />}

      {cross(7, 7)}
      {cross(W - 7, 7)}
      {cross(7, H - 7)}
      {cross(W - 7, H - 7)}

      {[[L - 6, wheelTop], [R - 4, wheelTop], [L - 6, wheelBottom], [R - 4, wheelBottom]].map(([x, y], i) => (
        <rect key={`w${i}`} x={x} y={y} width={10} height={44} fill={C.paper} stroke={C.n500} strokeWidth={1.2} />
      ))}

      {inter.open ? (
        <>
          {/* pickup: kabina i osobno otwarta skrzynia */}
          <path fill={C.paper} stroke={C.accent700} strokeWidth={1.5}
            d={`M${PAD + 14} ${T} H${R - PAD} Q${R} ${T} ${R} ${T + PAD + 14} V${trunkY - 8 - 12} Q${R} ${trunkY - 8} ${R - 12} ${trunkY - 8} H${L + 12} Q${L} ${trunkY - 8} ${L} ${trunkY - 8 - 12} V${T + PAD + 14} Q${L} ${T} ${PAD + 14} ${T} Z`} />
          <rect x={L + 4} y={trunkY} width={R - L - 8} height={H - 14 - MG - trunkY}
            fill={C.paper} stroke={C.accent700} strokeWidth={1.5} />
          <TrunkBox x={L + 16} y={trunkY + 12} w={R - L - 32} h={H - 14 - MG - trunkY - 24} mini={mini} />
        </>
      ) : (
        <>
          {/* Nadwozie ma wypełnienie papierem — tło widać tylko poza autem. */}
          <path fill={C.paper} stroke={C.accent700} strokeWidth={1.5}
            d={`M${PAD + 14} ${T} H${R - PAD} Q${R} ${T} ${R} ${T + PAD + 14} V${H - 40 - MG} Q${R} ${H - 14 - MG} ${R - 22} ${H - 14 - MG} H${L + 22} Q${L} ${H - 14 - MG} ${L} ${H - 40 - MG} V${T + PAD + 14} Q${L} ${T} ${PAD + 14} ${T} Z`} />
          <line x1={L + 10} y1={trunkY} x2={R - 10} y2={trunkY} stroke={C.n300} strokeWidth={1} />
          <path fill="none" stroke={C.accent700} strokeWidth={1} strokeDasharray="4 4"
            d={`M${L + PAD + 2} ${H - 22 - MG} Q${W / 2} ${H - 34 - MG} ${R - PAD - 2} ${H - 22 - MG}`} />
          <TrunkBox x={PAD + 12} y={trunkY + 8} w={W - 2 * (PAD + 12)} h={trunkH - 10} mini={mini} />
        </>
      )}

      <path fill="none" stroke={C.accent700} strokeWidth={1} strokeDasharray="4 4"
        d={`M${PAD + 12} ${yTop - 20} Q${W / 2} ${yTop - 36} ${W - PAD - 12} ${yTop - 20}`} />

      {!mini && (
        <text x={W / 2} y={T + 22} textAnchor="middle" fontSize={9.5} letterSpacing={2}
          fill={C.n600} fontFamily="var(--font-body)">PRZÓD</text>
      )}

      {seats.map((seat) => {
        const xs = byRow[seat.y];
        const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cx = W / 2 + (seat.x - mid) * CELL;
        const cy = yTop + seat.y * ROW + 46;
        return (
          <SeatFigure
            key={seat.id}
            seat={seat}
            cx={cx}
            cy={cy}
            hatchId={hatchId}
            mini={mini}
            isSelected={selectedSeatId === seat.id}
            showNames={showNames}
            onSelect={onSelect}
          />
        );
      })}
    </svg>
  );
}

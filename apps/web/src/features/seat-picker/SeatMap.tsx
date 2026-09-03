import { useId } from 'react';
import type { Seat } from '@carpool/shared';

/**
 * Schemat auta z góry jako rysunek techniczny (SVG).
 *
 * Wolne fotele to obrysy z „+", zajęte są zakreskowane, moje wypełnione stalą,
 * kierowca grafitem. Geometria 1:1 z prototypem: siatka 3 kolumny × N rzędów,
 * pozycje biorą się z `x`/`y` w układzie miejsc (`seat-layout.ts`).
 *
 * SVG celowo: to samo podejście zadziała w React Native (react-native-svg),
 * więc komponent przeniesie się na mobile prawie bez zmian.
 */
interface Props {
  seats: Seat[];
  /** Miniatura do kart „Moje" — bez etykiet i napisu PRZÓD. */
  mini?: boolean;
  /** Pierwszy dotyk pasażera; drugi w to samo miejsce potwierdza rezerwację. */
  selectedSeatId?: string | null;
  /** Kierowca na własnym przejeździe widzi, kto gdzie siedzi. */
  showNames?: boolean;
  onSelect?: (seat: Seat) => void;
}

const CELL = 100;
const PAD = 26;
const HOOD = 62;

const ACCENT = 'var(--color-accent)';
const INK = 'var(--color-neutral-900)';
const PAPER = 'var(--color-bg)';
const MUTED = 'var(--color-neutral-600)';

const STATUS_PL: Record<Seat['status'], string> = {
  FREE: 'wolne',
  PENDING: 'oczekuje na potwierdzenie',
  TAKEN: 'zajęte',
  MINE: 'twoje',
  DRIVER: 'kierowca',
};

const initials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();

export default function SeatMap({
  seats,
  mini = false,
  selectedSeatId = null,
  showNames = false,
  onSelect,
}: Props) {
  // Wzorzec kreskowania musi mieć unikalny id — na ekranie „Moje" jest kilka
  // schematów naraz, a powtórzone id to niepoprawny dokument.
  const hatchId = `cpHatch-${useId().replace(/:/g, '')}`;

  const rows = Math.max(...seats.map((s) => s.y)) + 1;
  const W = 3 * CELL + 2 * PAD;
  const H = rows * CELL + 2 * PAD + HOOD;

  const cross = (x: number, y: number) => (
    <g key={`cross-${x}-${y}`} stroke="var(--color-neutral-500)" strokeWidth={1}>
      <line x1={x - 6} y1={y} x2={x + 6} y2={y} />
      <line x1={x} y1={y - 6} x2={x} y2={y + 6} />
    </g>
  );

  const wheels: [number, number][] = [
    [2, PAD + HOOD - 6],
    [W - 12, PAD + HOOD - 6],
    [2, H - PAD - 48],
    [W - 12, H - PAD - 48],
  ];

  const body =
    `M${PAD + 14} 14 H${W - PAD - 14} Q${W - 14} 14 ${W - 14} ${PAD + 30} ` +
    `V${H - 34} Q${W - 14} ${H - 14} ${W - 34} ${H - 14} H34 ` +
    `Q14 ${H - 14} 14 ${H - 34} V${PAD + 30} Q14 14 ${PAD + 14} 14 Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', maxWidth: mini ? 92 : 330, margin: '0 auto', overflow: 'visible' }}
      role="group"
      aria-label="Schemat miejsc w samochodzie"
    >
      <defs>
        <pattern id={hatchId} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={5} stroke="var(--color-neutral-400)" strokeWidth={1.2} />
        </pattern>
      </defs>

      {/* znaczniki pasowania w rogach arkusza */}
      {cross(7, 7)}
      {cross(W - 7, 7)}
      {cross(7, H - 7)}
      {cross(W - 7, H - 7)}

      {wheels.map(([x, y], i) => (
        <rect key={`wheel-${i}`} x={x} y={y} width={10} height={44}
          fill={PAPER} stroke="var(--color-neutral-500)" strokeWidth={1.2} />
      ))}

      <path d={body} fill="none" stroke="var(--color-accent-700)" strokeWidth={1.5} />
      {/* przednia szyba */}
      <path d={`M${PAD + 12} ${PAD + HOOD - 22} Q${W / 2} ${PAD + HOOD - 36} ${W - PAD - 12} ${PAD + HOOD - 22}`}
        fill="none" stroke="var(--color-accent-700)" strokeWidth={1} strokeDasharray="4 4" />
      {/* tylna szyba */}
      <path d={`M${PAD + 16} ${H - 26} Q${W / 2} ${H - 40} ${W - PAD - 16} ${H - 26}`}
        fill="none" stroke="var(--color-accent-700)" strokeWidth={1} strokeDasharray="4 4" />

      {!mini && (
        <text x={W / 2} y={36} textAnchor="middle" fontSize={10} letterSpacing={2}
          fill={MUTED} fontFamily="var(--font-body)">PRZÓD</text>
      )}

      {seats.map((seat) => {
        const cx = PAD + seat.x * CELL + CELL / 2;
        const cy = PAD + HOOD + seat.y * CELL + CELL / 2 - 6;
        const isSelected = selectedSeatId === seat.id;
        const status = seat.status;

        const fill =
          status === 'DRIVER' ? INK
          : status === 'MINE' ? ACCENT
          : status === 'TAKEN' ? `url(#${hatchId})`
          : status === 'PENDING' ? 'var(--color-accent-100)'
          : isSelected ? 'var(--color-accent-200)'
          : PAPER;
        const stroke =
          status === 'DRIVER' ? INK
          : status === 'MINE' || status === 'PENDING' || isSelected ? ACCENT
          : status === 'TAKEN' ? 'var(--color-neutral-400)'
          : ACCENT;
        const glyph =
          status === 'DRIVER' || status === 'MINE' ? PAPER
          : status === 'TAKEN' ? 'var(--color-neutral-600)'
          : 'var(--color-accent-700)';
        // Prośba to jeszcze nie rezerwacja — obrys przerywany, jak linia
        // pomocnicza na rysunku, dopóki kierowca nie potwierdzi.
        const dash = status === 'PENDING' ? '5 4' : undefined;

        const clickable = status === 'FREE' && !!onSelect;
        const select = () => onSelect?.(seat);

        const label =
          status === 'DRIVER' ? (showNames && seat.who ? seat.who : 'Kierowca')
          : status === 'TAKEN' ? (showNames && seat.who ? seat.who : 'Zajęte')
          : status === 'PENDING' ? (showNames && seat.who ? seat.who : 'Oczekuje')
          : status === 'MINE' ? 'Twoje'
          : seat.label;

        return (
          <g
            key={seat.id}
            onClick={clickable ? select : undefined}
            onKeyDown={clickable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select();
              }
            } : undefined}
            tabIndex={clickable ? 0 : undefined}
            role={clickable ? 'button' : undefined}
            aria-label={clickable ? `${seat.label}: ${STATUS_PL[status]}` : undefined}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
          >
            {/* cała komórka jest celem dotknięcia, nie sam obrys fotela */}
            <rect x={cx - CELL / 2 + 4} y={cy - CELL / 2 + 2} width={CELL - 8} height={CELL - 4} fill="transparent" />
            <rect x={cx - 36} y={cy - 36} width={72} height={16} fill={fill} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray={dash} />
            <rect x={cx - 32} y={cy - 20} width={64} height={50} fill={fill} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray={dash} />

            {isSelected && (
              <rect className="seat-ring" x={cx - 44} y={cy - 44} width={88} height={84}
                fill="none" stroke={ACCENT} strokeWidth={1.5} strokeDasharray="5 4" />
            )}

            {status === 'DRIVER' && (
              <g stroke={glyph} strokeWidth={1.5} fill="none" transform={`translate(${cx} ${cy + 5})`}>
                <circle r={11} />
                <circle r={3} />
                <line x1={-11} y1={0} x2={-3} y2={0} />
                <line x1={3} y1={0} x2={11} y2={0} />
                <line x1={0} y1={3} x2={0} y2={11} />
              </g>
            )}
            {status === 'PENDING' && (
              // zegar: prośba czeka na decyzję
              <g stroke={glyph} strokeWidth={1.5} fill="none" transform={`translate(${cx} ${cy + 5})`}>
                <circle r={10} />
                <path d="M0 -5 V0 L4 3" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
            {status === 'MINE' && (
              <path d={`M${cx - 9} ${cy + 5} l6 6 l12 -12`} stroke={glyph} strokeWidth={2}
                fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {status === 'TAKEN' && showNames && seat.who && (
              <>
                <rect x={cx - 16} y={cy - 6} width={32} height={22} fill={PAPER}
                  stroke="var(--color-neutral-400)" strokeWidth={1} />
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize={13} fontWeight={600}
                  fill="var(--color-neutral-800)" fontFamily="var(--font-heading)">{initials(seat.who)}</text>
              </>
            )}
            {status === 'FREE' && isSelected && (
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize={13} fontWeight={600}
                letterSpacing={0.5} fill={glyph} fontFamily="var(--font-heading)">POTWIERDŹ</text>
            )}
            {status === 'FREE' && !isSelected && (
              <g stroke={glyph} strokeWidth={1.5}>
                <line x1={cx - 7} y1={cy + 5} x2={cx + 7} y2={cy + 5} />
                <line x1={cx} y1={cy - 2} x2={cx} y2={cy + 12} />
              </g>
            )}

            {!mini && (
              <text x={cx} y={cy + 46} textAnchor="middle" fontSize={11}
                fill={status === 'TAKEN' ? MUTED : 'var(--color-text)'} fontFamily="var(--font-body)">{label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

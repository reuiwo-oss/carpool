import type { Seat } from '@carpool/shared';

/**
 * Graficzny schemat auta z widoku z góry (SVG).
 * SVG celowo: identyczne podejście zadziała w React Native (react-native-svg),
 * więc komponent przeniesie się na mobile niemal bez zmian.
 *
 * Do doprecyzowania później: sylwetka konkretnego nadwozia zależna od modelu,
 * animacja wyboru, podgląd kto siedzi na którym miejscu (dla kierowcy).
 */
interface Props {
  seats: Seat[];
  selectedSeatId: string | null;
  onSelect: (seatId: string) => void;
}

const CELL = 84;
const PAD = 28;

export default function SeatMap({ seats, selectedSeatId, onSelect }: Props) {
  const rows = Math.max(...seats.map((s) => s.y)) + 1;
  const width = 3 * CELL + 2 * PAD;
  const height = rows * CELL + 2 * PAD + 40; // 40 na maskę przodu auta

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: 340 }} role="group" aria-label="Schemat miejsc w samochodzie">
      {/* obrys nadwozia */}
      <rect x={6} y={6} width={width - 12} height={height - 12} rx={46} fill="none" stroke="#23272b" strokeWidth={3} />
      {/* przednia szyba */}
      <line x1={PAD} y1={PAD + 30} x2={width - PAD} y2={PAD + 30} stroke="#23272b" strokeWidth={1.5} strokeDasharray="6 5" />

      {seats.map((seat) => {
        const cx = PAD + seat.x * CELL + CELL / 2;
        const cy = PAD + 40 + seat.y * CELL + CELL / 2 - 20;
        const isDriver = seat.status === 'DRIVER';
        const isTaken = seat.status === 'TAKEN';
        const isSelected = seat.id === selectedSeatId;
        const fill = isDriver ? '#23272b' : isSelected ? 'var(--seat-selected)' : isTaken ? 'var(--seat-taken)' : 'var(--seat-free)';

        return (
          <g
            key={seat.id}
            onClick={() => !isDriver && !isTaken && onSelect(seat.id)}
            style={{ cursor: isDriver || isTaken ? 'default' : 'pointer' }}
            role="button"
            aria-label={`${seat.label}: ${isDriver ? 'kierowca' : isTaken ? 'zajęte' : 'wolne'}`}
          >
            {/* siedzisko z oparciem */}
            <rect x={cx - 26} y={cy - 26} width={52} height={44} rx={12} fill={fill}
              stroke={isSelected ? 'var(--seat-selected)' : isDriver ? '#23272b' : 'var(--seat-free-border)'} strokeWidth={2} />
            <rect x={cx - 30} y={cy - 34} width={60} height={12} rx={6} fill={fill}
              stroke={isSelected ? 'var(--seat-selected)' : isDriver ? '#23272b' : 'var(--seat-free-border)'} strokeWidth={2} />
            <text x={cx} y={cy + 34} textAnchor="middle" fontSize={10} fill="#23272b">
              {isDriver ? 'Kierowca' : isTaken ? 'Zajęte' : seat.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

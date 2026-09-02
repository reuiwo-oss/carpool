/**
 * Ikony Lucide wklejone jako inline SVG (stroke 1.5, zgodnie z systemem).
 *
 * Świadomie bez zależności `lucide-react`: zestaw to dwanaście ikon, a paczki
 * w tym repo mają zablokowane skrypty instalacyjne — mniej ruchomych części.
 * Ścieżki są 1:1 z prototypem, więc podmiana na lucide-react jest bezbolesna.
 */
interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

const base = (size: number, color?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color ?? 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
});

export const CarIcon = ({ size = 22, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

export const ArmchairIcon = ({ size = 22, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>
);

export const SearchIcon = ({ size = 22, color }: IconProps) => (
  <svg {...base(size, color)}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const UsersIcon = ({ size = 22, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const PlusIcon = ({ size = 18, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

export const MinusIcon = ({ size = 18, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M5 12h14" />
  </svg>
);

export const BellIcon = ({ size = 18, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
  </svg>
);

export const CameraIcon = ({ size = 34, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

export const CheckIcon = ({ size = 22, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const ChevronLeftIcon = ({ size = 18, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ArrowRightIcon = ({ size = 24, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const ArrowLeftRightIcon = ({ size = 18, color }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </svg>
);

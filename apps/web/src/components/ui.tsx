import type { ReactNode } from 'react';
import { ChevronLeftIcon } from './icons';

/**
 * Znaczniki pasowania w rogach — każdy element z klasą `.blueprint` nosi
 * komplet czterech. System rysuje je poza obrysem, dlatego to osobne dzieci,
 * a nie pseudoelementy.
 */
export const Corners = () => (
  <>
    <i className="corner tl" />
    <i className="corner tr" />
    <i className="corner bl" />
    <i className="corner br" />
  </>
);

/** Zastępczy awatar: kwadrat z inicjałami. Zdjęć jeszcze nie mamy. */
export function Avatar({
  name,
  size = 40,
  fontSize,
  onClick,
  title,
}: {
  name: string;
  size?: number;
  fontSize?: number;
  onClick?: () => void;
  title?: string;
}) {
  const text = name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  const style = { width: size, height: size, fontSize: fontSize ?? Math.round(size * 0.39) };

  if (onClick) {
    return (
      <button type="button" className="avatar" style={style} onClick={onClick} title={title} aria-label={title}>
        {text}
      </button>
    );
  }
  return <div className="avatar" style={style} aria-hidden>{text}</div>;
}

/** Powrót w nagłówku ekranów szczegółów i publikacji. */
export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-ghost" onClick={onClick} style={{ gap: 2 }}>
      <ChevronLeftIcon size={18} />
      {label}
    </button>
  );
}

/** Karta-rysunek: przezroczysta, hairline, ze znacznikami w rogach. */
export function BlueprintCard({
  children,
  style,
  className = '',
}: {
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={`blueprint ${className}`.trim()} style={style}>
      <Corners />
      {children}
    </div>
  );
}

/**
 * Nieudane wczytanie danych. Osobny stan, bo pusta lista i brak odpowiedzi
 * wyglądają identycznie, a znaczą coś zupełnie innego — „nikt jeszcze nie
 * jedzie" kontra „serwer nie odpowiada".
 */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="blueprint" style={{
      padding: '20px 18px', margin: 6, display: 'flex', flexDirection: 'column',
      alignItems: 'center', textAlign: 'center', gap: 8, borderColor: 'var(--color-accent)',
    }}>
      <Corners />
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, lineHeight: 1.1 }}>
        Nie udało się wczytać
      </div>
      <div role="alert" style={{ fontSize: 14, color: 'var(--color-neutral-700)', textWrap: 'pretty' }}>
        {message}
      </div>
      <button type="button" className="btn btn-secondary" style={{ marginTop: 4 }} onClick={onRetry}>
        Spróbuj ponownie
      </button>
    </div>
  );
}

/** Główna akcja ekranu — jedyny pełny obiekt na planszy. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  style,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      className="btn btn-primary btn-block blueprint"
      onClick={onClick}
      disabled={disabled}
      style={{ minHeight: 50, fontSize: 16, ...style }}
    >
      <Corners />
      {children}
    </button>
  );
}

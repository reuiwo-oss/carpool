import { useEffect, useId, useRef, useState } from 'react';
import { placeSubtitle, type PlaceRef, type PlaceSuggestion } from '@carpool/shared';
import { usePlaceSearch } from './usePlaceSearch';

/**
 * Pole wyboru miejsca z podpowiedziami.
 *
 * Warstwa DOM i nic więcej — filtrowanie, ranking i debounce siedzą
 * w `usePlaceSearch`. Bez zewnętrznej biblioteki do autouzupełniania, żeby
 * przy przenoszeniu na React Native trzeba było przepisać tylko ten plik.
 *
 * Wzorzec z WAI-ARIA (combobox + listbox): pole ma `aria-expanded`,
 * `aria-controls` i `aria-activedescendant`, a wyróżniona pozycja swoje `id` —
 * dzięki temu czytnik ekranu czyta podpowiedź, mimo że fokus nie opuszcza pola.
 */
export default function PlacePicker({
  value,
  onChange,
  label,
  placeholder,
  allowCustom = true,
}: {
  value: PlaceRef | null;
  onChange: (value: PlaceRef | null) => void;
  label: string;
  placeholder?: string;
  /** Gdy `false`, wpisać można tylko to, co jest w bazie — tak działa filtr listy. */
  allowCustom?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const { results, loading } = usePlaceSearch(open ? query : '');

  const inputId = useId();
  const listId = `${inputId}-list`;
  const box = useRef<HTMLDivElement>(null);

  // „Użyj własnej nazwy" tylko wtedy, gdy wpisane naprawdę różni się od tego,
  // co już jest na liście — inaczej pod Zakopanem wisiałoby „Użyj «Zakopane»".
  const trimmed = query.trim();
  const custom =
    allowCustom &&
    trimmed.length > 0 &&
    !results.some((place) => place.name.toLowerCase() === trimmed.toLowerCase());

  const options: (PlaceSuggestion | 'custom')[] = custom ? [...results, 'custom'] : results;

  useEffect(() => setActive(0), [query]);

  // Klik poza polem zamyka listę. Bez tego lista zostaje otwarta nad resztą
  // formularza i zasłania kolejne pytania.
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const choose = (option: PlaceSuggestion | 'custom') => {
    onChange(option === 'custom' ? { placeId: null, name: trimmed } : { placeId: option.id, name: option.name });
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || !options.length) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + options.length) % options.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      choose(options[active]);
    }
  };

  // Wybrane miejsce zastępuje pole tekstowe. Zmiana wyboru to skasowanie
  // i wpisanie od nowa — jedna droga zamiast dwóch stanów naraz.
  if (value) {
    return (
      <div className="field">
        <label htmlFor={`${inputId}-chip`}>{label}</label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 44,
            padding: '6px 8px 6px 12px',
            border: '1px solid var(--color-divider)',
            borderRadius: 8,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value.name}
            {value.placeId === null && (
              <span style={{ color: 'var(--color-neutral-600)', fontSize: 12, marginLeft: 6 }}>
                własna nazwa
              </span>
            )}
          </span>
          <button
            id={`${inputId}-chip`}
            type="button"
            className="btn btn-ghost"
            aria-label={`Wyczyść: ${value.name}`}
            onClick={() => {
              onChange(null);
              setQuery('');
              setOpen(true);
            }}
            style={{ minHeight: 32, padding: '0 10px' }}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="field" ref={box} style={{ position: 'relative' }}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        className="input"
        style={{ minHeight: 44 }}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length ? `${inputId}-opt-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            margin: '4px 0 0',
            padding: 0,
            listStyle: 'none',
            maxHeight: 260,
            overflowY: 'auto',
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-divider)',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
          }}
        >
          {options.map((option, index) => (
            <li
              key={option === 'custom' ? 'custom' : option.id}
              id={`${inputId}-opt-${index}`}
              role="option"
              aria-selected={index === active}
              // Wybór na `mousedown`: `click` przychodzi po `blur`, a wtedy
              // listy już nie ma i kliknięcie trafia w pustkę.
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(index)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: index === active ? 'var(--color-neutral-100, #f2f2f2)' : 'transparent',
              }}
            >
              {option === 'custom' ? (
                <span style={{ fontSize: 14 }}>
                  Użyj „<strong>{trimmed}</strong>" jako własnej nazwy
                </span>
              ) : (
                <>
                  <div style={{ fontSize: 15 }}>{option.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
                    {placeSubtitle(option)}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && loading && options.length === 0 && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-neutral-600)' }}>Szukam…</p>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Conversation } from '@carpool/shared';
import { listConversations } from '../features/messages/messagesApi';
import { MailIcon } from '../components/icons';
import { Avatar, Corners } from '../components/ui';
import { formatWhen } from '../lib/format';

/** Krótki podgląd ostatniej wiadomości — zdarzenia opisujemy słowami. */
function preview(c: Conversation, meIsDriver: boolean) {
  const m = c.lastMessage;
  if (!m) return 'Brak wiadomości';
  const seat = c.seatLabel ?? m.seatId ?? 'miejsce';
  switch (m.kind) {
    case 'REQUEST':
      return m.body
        ? `Prośba o ${seat}: „${m.body}"`
        : `${meIsDriver ? 'Prośba o' : 'Poprosiłeś o'} ${seat}`;
    case 'ACCEPTED':
      return `Potwierdzone — ${seat}`;
    case 'REJECTED':
      return `Odrzucone — ${seat}`;
    case 'CANCELLED':
      return `Anulowane — ${seat}`;
    default:
      return m.body;
  }
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Conversation[] | null>(null);

  useEffect(() => {
    listConversations().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 0' }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>Wiadomości</h1>
        <p style={{ color: 'var(--color-neutral-700)', margin: '2px 0 0', fontSize: 14 }}>
          Prośby o miejsce i ustalenia przed przejazdem.
        </p>
      </div>

      <div className="screen-scroll" style={{ padding: '14px 0 100px' }}>
        {rows === null && (
          <p style={{ padding: '0 20px', color: 'var(--color-neutral-700)' }}>Wczytywanie…</p>
        )}

        {rows?.length === 0 && (
          <div style={{ padding: '8px 24px' }}>
            <div className="blueprint" style={{
              padding: '30px 22px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', gap: 10,
            }}>
              <Corners />
              <MailIcon size={34} color="var(--color-accent)" />
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24, lineHeight: 1.1 }}>
                Pusto tu
              </div>
              <div style={{ fontSize: 14, color: 'var(--color-neutral-700)', maxWidth: '28ch', textWrap: 'pretty' }}>
                Rozmowa zaczyna się od prośby o miejsce — twojej albo czyjejś.
              </div>
            </div>
          </div>
        )}

        {rows?.map((c) => {
          const when = formatWhen(c.ride.departureAt);
          const unread = c.unreadCount > 0;
          return (
            <button
              key={c.id}
              type="button"
              className={`thread-row ${unread ? 'unread' : ''}`.trim()}
              onClick={() => navigate(`/messages/${c.id}`)}
            >
              <Avatar name={c.withName} size={40} fontSize={15} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 8,
                  fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, lineHeight: 1.1,
                }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.withName}
                  </span>
                  {c.bookingStatus === 'PENDING' && (
                    <span className="tag tag-accent" style={{ fontSize: 10, padding: '2px 6px' }}>czeka</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                  {c.ride.origin} → {c.ride.destination} · {when.dayShort}
                </div>
                <div style={{
                  fontSize: 13, marginTop: 4,
                  color: unread ? 'var(--color-text)' : 'var(--color-neutral-600)',
                  fontWeight: unread ? 500 : 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {preview(c, false)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
                  {formatWhen(c.updatedAt).time}
                </span>
                {unread && (
                  <span className="badge" style={{ position: 'static', border: 0 }}>
                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {rows && rows.length > 0 && <div style={{ borderTop: '1px solid var(--color-divider)' }} />}
      </div>
    </div>
  );
}

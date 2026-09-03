import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Message } from '@carpool/shared';
import {
  getConversation,
  sendMessage,
  type ConversationDetail,
} from '../features/messages/messagesApi';
import { acceptBooking, rejectBooking } from '../features/rides/ridesApi';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ToastContext';
import { useUnread } from '../features/messages/UnreadContext';
import { CheckIcon, SendIcon, XIcon } from '../components/icons';
import { Avatar, BackButton, Corners } from '../components/ui';
import { formatWhen } from '../lib/format';

/** Zdarzenia rysujemy jako wpis w dzienniku, nie jako dymek rozmowy. */
function eventText(m: Message, seatLabel: string | null) {
  const seat = seatLabel ?? m.seatId ?? 'miejsce';
  switch (m.kind) {
    case 'REQUEST':
      return `${m.senderName} prosi o miejsce ${seat}`;
    case 'ACCEPTED':
      return `Prośba potwierdzona — ${seat}`;
    case 'REJECTED':
      return `Prośba odrzucona — ${seat}`;
    case 'CANCELLED':
      return `${m.senderName} rezygnuje z miejsca ${seat}`;
    default:
      return '';
  }
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const say = useToast();
  const { refresh } = useUnread();

  const [thread, setThread] = useState<ConversationDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(
    () =>
      getConversation(id!)
        .then((t) => {
          setThread(t);
          // Otwarcie wątku wyzerowało nieprzeczytane po stronie API.
          refresh();
        })
        .catch((e) => setError((e as Error).message)),
    [id, refresh],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages.length]);

  if (error) return <p style={{ padding: 20, color: 'var(--color-accent-900)' }}>{error}</p>;
  if (!thread) return <p style={{ padding: 20, color: 'var(--color-neutral-700)' }}>Wczytywanie…</p>;

  const when = formatWhen(thread.ride.departureAt);
  const pending = thread.bookingStatus === 'PENDING';

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await sendMessage(thread.id, body);
      setDraft('');
      await load();
    } catch (err) {
      say((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const decide = async (accept: boolean) => {
    if (!thread.bookingId || busy) return;
    setBusy(true);
    try {
      if (accept) {
        await acceptBooking(thread.bookingId);
        say('Prośba potwierdzona.');
      } else {
        await rejectBooking(thread.bookingId);
        say('Prośba odrzucona.');
      }
      await load();
    } catch (err) {
      say((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px 0' }}>
        <BackButton label="Wiadomości" onClick={() => navigate('/messages')} />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate(`/rides/${thread.rideId}`, {
            state: { backTo: `/messages/${thread.id}`, backLabel: 'Wątek' },
          })}
        >
          Przejazd
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 12px' }}>
        <Avatar name={thread.withName} size={44} fontSize={17} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21, lineHeight: 1.1 }}>
            {thread.withName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
            {thread.ride.origin} → {thread.ride.destination} · {when.dayShort}, {when.time}
          </div>
        </div>
      </div>

      <div className="screen-scroll thread" style={{ padding: '4px 20px 16px' }}>
        {thread.messages.map((m) => {
          if (m.kind !== 'TEXT') {
            return (
              <div key={m.id} className="event">
                <strong>{eventText(m, thread.seatLabel)}</strong>
                {m.body && m.kind === 'REQUEST' && (
                  <div style={{ marginTop: 4, color: 'var(--color-text)', fontSize: 13 }}>„{m.body}"</div>
                )}
              </div>
            );
          }
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`bubble ${mine ? 'bubble-mine' : 'bubble-theirs'}`}>
              {m.body}
              <div className="bubble-meta">{formatWhen(m.createdAt).time}</div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {/* Decyzja należy do kierowcy i tylko dopóki prośba czeka. */}
      {thread.isDriver && pending && (
        <div className="blueprint" style={{
          margin: '0 20px 10px', padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10, borderColor: 'var(--color-accent)',
        }}>
          <Corners />
          <div style={{ flex: 1, fontSize: 13 }}>
            <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 17 }}>
              {thread.seatLabel ?? 'Miejsce'}
            </strong>
            <div style={{ color: 'var(--color-neutral-700)' }}>Czeka na twoją decyzję.</div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => decide(false)} disabled={busy}>
            <XIcon size={16} />
            Odrzuć
          </button>
          <button type="button" className="btn btn-primary" onClick={() => decide(true)} disabled={busy}>
            <CheckIcon size={16} />
            Potwierdź
          </button>
        </div>
      )}

      <form className="composer" onSubmit={send}>
        <textarea
          className="input"
          placeholder="Napisz wiadomość…"
          value={draft}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter wysyła, Shift+Enter robi nową linię — jak w komunikatorach.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          aria-label="Treść wiadomości"
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !draft.trim()}
          style={{ width: 44, height: 44, padding: 0, flex: 'none' }} aria-label="Wyślij">
          <SendIcon size={18} />
        </button>
      </form>
    </div>
  );
}

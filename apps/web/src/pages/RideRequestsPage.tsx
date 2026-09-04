import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RideRequest } from '@carpool/shared';
import {
  deleteRideRequest,
  fulfillRideRequest,
  listRideRequests,
} from '../features/ride-requests/rideRequestsApi';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ToastContext';
import { BellIcon, PlusIcon } from '../components/icons';
import { Avatar, BackButton, Corners, PrimaryButton } from '../components/ui';
import { formatWhen, plural } from '../lib/format';

/**
 * Kto szuka przejazdu. Prośba nie jest przypięta do żadnej wycieczki —
 * to sygnał dla kierowców, że warto taką zorganizować.
 */
export default function RideRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const say = useToast();
  const [requests, setRequests] = useState<RideRequest[] | null>(null);

  const load = () => listRideRequests().then(setRequests).catch(() => setRequests([]));
  useEffect(() => {
    load();
  }, []);

  const act = async (action: Promise<unknown>, done: string) => {
    try {
      await action;
      say(done);
      load();
    } catch (e) {
      say((e as Error).message);
    }
  };

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px 0' }}>
        <BackButton label="Szukaj" onClick={() => navigate('/')} />
      </div>

      <div className="screen-scroll" style={{ padding: '4px 20px 40px' }}>
        <h1 style={{ fontSize: 32, margin: '0 0 6px' }}>Szukają przejazdu</h1>
        <p style={{ fontSize: 14, color: 'var(--color-neutral-700)', margin: '0 0 18px' }}>
          Nikt jeszcze nie jedzie tam, dokąd chcesz? Zostaw prośbę — zobaczy ją każdy,
          kto planuje wycieczkę.
        </p>

        {requests === null && <p style={{ color: 'var(--color-neutral-700)' }}>Wczytywanie…</p>}

        {requests?.length === 0 && (
          <div className="blueprint" style={{
            padding: '26px 20px', textAlign: 'center', margin: 6,
            display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
          }}>
            <Corners />
            <BellIcon size={30} color="var(--color-accent)" />
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24 }}>Cisza</div>
            <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>
              Nikt nie prosi o przejazd. Możesz być pierwszy.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests?.map((r) => {
            const from = formatWhen(r.dateFrom);
            const to = formatWhen(r.dateTo);
            const mine = r.userId === user?.id;
            return (
              <div key={r.id} className="blueprint" style={{
                padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, margin: 6,
              }}>
                <Corners />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={r.userName} size={36} fontSize={14} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, lineHeight: 1.1 }}>
                      {r.destination}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                      {r.userName}{mine ? ' · ty' : ''} · {r.seatsNeeded}{' '}
                      {plural(r.seatsNeeded, 'miejsce', 'miejsca', 'miejsc')}
                    </div>
                  </div>
                  <span className="tag tag-outline" style={{ fontSize: 11 }}>
                    {from.dayShort} – {to.dayShort}
                  </span>
                </div>

                {r.note && (
                  <div style={{ fontSize: 14, color: 'var(--color-neutral-700)', textWrap: 'pretty' }}>
                    {r.note}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {mine ? (
                    <>
                      <button type="button" className="btn btn-ghost"
                        onClick={() => act(deleteRideRequest(r.id), 'Prośba usunięta.')}>
                        Usuń
                      </button>
                      <button type="button" className="btn btn-secondary"
                        onClick={() => act(fulfillRideRequest(r.id), 'Zamknięte — masz czym jechać.')}>
                        Mam już przejazd
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-secondary"
                      onClick={() => navigate(`/trips/new?destination=${encodeURIComponent(r.destination)}`)}>
                      Zorganizuj taką wycieczkę
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <PrimaryButton style={{ marginTop: 22 }} onClick={() => navigate('/requests/new')}>
          <PlusIcon size={18} />
          Poproś o przejazd
        </PrimaryButton>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRideRequest } from '../features/ride-requests/rideRequestsApi';
import { useToast } from '../components/ToastContext';
import { BackButton, PrimaryButton } from '../components/ui';
import { dateKey } from '../lib/format';

/** Domyślne okno: od jutra przez tydzień — najczęstszy przypadek. */
function defaultWindow() {
  const from = new Date();
  from.setDate(from.getDate() + 1);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from: dateKey(from), to: dateKey(to) };
}

export default function CreateRideRequestPage() {
  const navigate = useNavigate();
  const say = useToast();
  const window = defaultWindow();

  const [form, setForm] = useState({
    destination: '',
    dateFrom: window.from,
    dateTo: window.to,
    seatsNeeded: 1,
    note: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createRideRequest({
        destination: form.destination.trim(),
        // Pola typu `date` dają samą datę — doba liczy się od północy do północy.
        dateFrom: new Date(`${form.dateFrom}T00:00`).toISOString(),
        dateTo: new Date(`${form.dateTo}T23:59`).toISOString(),
        seatsNeeded: form.seatsNeeded,
        note: form.note.trim() || undefined,
      });
      say('Prośba wysłana — kierowcy ją zobaczą.');
      navigate('/requests');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="screen" onSubmit={submit}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px 0' }}>
        <BackButton label="Wróć" onClick={() => navigate(-1)} />
      </div>

      <div className="screen-scroll" style={{ padding: '4px 20px 40px' }}>
        <h1 style={{ fontSize: 32, margin: '0 0 6px' }}>Poproś o przejazd</h1>
        <p style={{ fontSize: 14, color: 'var(--color-neutral-700)', margin: '0 0 18px' }}>
          Prośba nie jest przypięta do żadnej wycieczki. To sygnał, że warto taką zorganizować.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label htmlFor="r-destination">Dokąd</label>
            <input id="r-destination" className="input" placeholder="Zakopane" required
              value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label htmlFor="r-from">Od</label>
              <input id="r-from" className="input" type="date" required
                value={form.dateFrom} onChange={(e) => setForm({ ...form, dateFrom: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="r-to">Do</label>
              <input id="r-to" className="input" type="date" required
                value={form.dateTo} onChange={(e) => setForm({ ...form, dateTo: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="r-seats">Ile miejsc</label>
            <input id="r-seats" className="input" type="number" min={1} max={8}
              value={form.seatsNeeded}
              onChange={(e) => setForm({ ...form, seatsNeeded: Number(e.target.value) || 1 })} />
          </div>

          <div className="field">
            <label htmlFor="r-note">Uwagi (opcjonalnie)</label>
            <textarea id="r-note" className="input" maxLength={500}
              placeholder="np. jadę z dużym plecakiem, mogę dorzucić się do paliwa"
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>

        <PrimaryButton type="submit" disabled={busy} style={{ marginTop: 22 }}>
          Wyślij prośbę
        </PrimaryButton>

        {error && (
          <p role="alert" style={{ color: 'var(--color-accent-900)', fontSize: 14, marginTop: 12 }}>
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

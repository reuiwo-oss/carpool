import { useNavigate } from 'react-router-dom';
import { CameraIcon } from '../components/icons';
import { Corners } from '../components/ui';

/**
 * Feed zdjęć z odbytych przejazdów jest poza zakresem tej rundy —
 * zakładka istnieje, żeby społeczność nie leżała pod wynikami wyszukiwania,
 * i na razie pokazuje sam stan pusty.
 */
export default function CommunityPage() {
  const navigate = useNavigate();

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 0' }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>Społeczność</h1>
        <p style={{ color: 'var(--color-neutral-700)', margin: '2px 0 0', fontSize: 14 }}>
          Zdjęcia z odbytych przejazdów.
        </p>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '24px 30px 110px',
      }}>
        <div className="blueprint" style={{
          padding: '30px 22px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', gap: 10,
        }}>
          <Corners />
          <CameraIcon size={34} color="var(--color-accent)" />
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24, lineHeight: 1.1 }}>
            Jeszcze cicho
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-neutral-700)', maxWidth: '26ch', textWrap: 'pretty' }}>
            Pierwsze zdjęcie dodasz po odbytym przejeździe. Do tego czasu — znajdź auto.
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => navigate('/')}>
            Szukaj przejazdu
          </button>
        </div>
      </div>
    </div>
  );
}

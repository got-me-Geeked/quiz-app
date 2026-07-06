import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { colors, HEADING_FONT, BODY_FONT } from '../theme';
import NavBar from '../components/NavBar';

const labelStyle = {
  fontFamily: HEADING_FONT, fontSize: 16, color: colors.white,
  display: 'block', marginBottom: 8, textTransform: 'uppercase',
};

const fieldStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  fontFamily: BODY_FONT, fontSize: 16, color: colors.white,
  backgroundColor: colors.midPurple, border: `1px solid ${colors.lightPurple}`,
  borderRadius: 8,
};

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/profile')
      .then(({ data }) => { if (!cancelled) setProfile(data.profile); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.deepPurple, color: colors.white }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '40px 60px', gap: 24, flexWrap: 'wrap',
      }}>
        <h1 style={{ fontFamily: HEADING_FONT, fontSize: 32, margin: 0 }}>QUiZ UP!</h1>
        <NavBar current="profile" onNavigate={(k) => {
          if (k === 'dashboard') navigate('/dashboard');
          if (k === 'history') navigate('/history');
        }} />
      </header>

      <main style={{ maxWidth: 460, margin: '0 auto', padding: '0 24px 60px', textAlign: 'center' }}>
        <div style={{ fontFamily: BODY_FONT, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>
          Ваш профиль
        </div>
        <div style={{ fontFamily: BODY_FONT, fontWeight: 500, fontSize: 13, opacity: 0.8, marginBottom: 24 }}>
          Данные вашего профиля
        </div>

        <div style={{ textAlign: 'left' }}>
          <label style={labelStyle}>Name</label>
          <div style={fieldStyle}>{profile?.username || '—'}</div>

          <div style={{ height: 16 }} />

          <label style={labelStyle}>Email</label>
          <div style={fieldStyle}>{profile?.email || '—'}</div>
        </div>
      </main>
    </div>
  );
}

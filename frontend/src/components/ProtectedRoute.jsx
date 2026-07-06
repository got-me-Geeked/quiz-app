import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: colors.deepPurple,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: colors.white, fontFamily: 'system-ui, Arial, sans-serif',
      }}>
        Загрузка...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

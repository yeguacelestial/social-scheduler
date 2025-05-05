import React from 'react';
import { useNavigate } from 'react-router-dom';
// import { AuthContext } from '../context/AuthContext'; // No se usa directamente
import { useAuth } from '../context/AuthContext'; // Usar el hook
import './Dashboard.css'; // Crearemos este archivo para estilos básicos
import { useEffect, useState } from 'react';

interface InstagramAccount {
  account_id: string;
  username: string;
  account_type: string;
}

const Dashboard: React.FC = () => {
  // const { user, signOut } = useContext(AuthContext); // Cambiado
  const { user, signOut, loading, session } = useAuth(); // Usar el hook
  const navigate = useNavigate();
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Obtener cuentas conectadas
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!session) return;
      setLoadingAccounts(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/social-connections`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        if (!res.ok) throw new Error('Error al obtener cuentas');
        const data = await res.json();
        setInstagramAccounts(data.instagram || []);
      } catch {
        setInstagramAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, [session]);

  // Conectar cuenta Instagram
  const handleConnectInstagram = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/connect/instagram/start`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (!res.ok) throw new Error('Error iniciando conexión con Instagram');
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      alert('Error iniciando conexión con Instagram');
    }
  };

  // Desconectar cuenta
  const handleDisconnectInstagram = async (accountId: string) => {
    if (!window.confirm('¿Seguro que quieres desconectar esta cuenta de Instagram?')) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/disconnect/instagram/${accountId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );
      if (!res.ok) throw new Error('Error desconectando la cuenta');
      setInstagramAccounts(prev => prev.filter((acc) => acc.account_id !== accountId));
    } catch {
      alert('Error desconectando la cuenta');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login'); // Redirige a login después de cerrar sesión
    } catch (error) {
      console.error("Error signing out:", error);
      // Podrías mostrar un mensaje de error al usuario aquí
    }
  };

  // if (!user) { // Mejorado para manejar el estado de carga
  if (loading) {
    // Opcional: Mostrar un loader o redirigir si el usuario no está cargado aún
    return <div>Cargando...</div>; 
  }

  if (!user) {
    // Si no está cargando y no hay usuario, podría ser un error o estado inesperado
    // Podrías redirigir a login o mostrar un mensaje
    navigate('/login');
    return null; // Evita renderizar el resto mientras redirige
  }

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      <p>¡Bienvenido, {user.email}!</p>
      
      <button onClick={handleSignOut} className="logout-button">
        Cerrar Sesión
      </button>

      <div className="connected-accounts">
        <h2>Cuentas Conectadas</h2>
        <div>
          <h3>Instagram</h3>
          {loadingAccounts ? (
            <p>Cargando cuentas...</p>
          ) : (
            <>
              {instagramAccounts.length === 0 ? (
                <p>No hay cuentas de Instagram conectadas.</p>
              ) : (
                <ul>
                  {instagramAccounts.map((acc) => (
                    <li key={acc.account_id}>
                      @{acc.username} ({acc.account_type})
                      <button onClick={() => handleDisconnectInstagram(acc.account_id)} style={{ marginLeft: 8 }}>
                        Desconectar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button className="connect-button instagram-button" onClick={handleConnectInstagram}>
                Conectar Cuenta Instagram
              </button>
            </>
          )}
        </div>
        {/* Aquí irán otras redes sociales en el futuro */}
      </div>
    </div>
  );
};

export default Dashboard; 
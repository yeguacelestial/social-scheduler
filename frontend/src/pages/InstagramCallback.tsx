import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const InstagramCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'success' | 'error' | 'loading'>('loading');
  const [message, setMessage] = useState('Conectando con Instagram...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      setStatus('success');
      setMessage('¡Cuenta de Instagram conectada exitosamente!');
    } else if (params.get('error')) {
      setStatus('error');
      setMessage('Ocurrió un error al conectar con Instagram. Por favor, intenta nuevamente.');
    } else {
      setStatus('loading');
      setMessage('Conectando con Instagram...');
    }
  }, []);

  useEffect(() => {
    if (status !== 'loading') {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className={`instagram-callback ${status}`}> 
      <h2>{status === 'success' ? '¡Éxito!' : status === 'error' ? 'Error' : 'Conectando...'}</h2>
      <p>{message}</p>
      {status === 'error' && (
        <button onClick={() => navigate('/dashboard')} style={{ marginTop: 16 }}>
          Volver al dashboard
        </button>
      )}
      {status !== 'loading' && <p>Serás redirigido al dashboard en unos segundos...</p>}
    </div>
  );
};

export default InstagramCallback; 
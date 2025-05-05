const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;

// 1. Generar URL de autorización
function getInstagramAuthUrl(state) {
  const scope = 'instagram_business_basic'; // Scope actualizado para cuentas profesionales
  return `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(INSTAGRAM_REDIRECT_URI)}&scope=${scope}&response_type=code&state=${state}`;
}

// 2. Intercambiar código por tokens
async function exchangeCodeForToken(code) {
  const url = 'https://api.instagram.com/oauth/access_token';
  const params = new URLSearchParams();
  params.append('client_id', INSTAGRAM_CLIENT_ID);
  params.append('client_secret', INSTAGRAM_CLIENT_SECRET);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', INSTAGRAM_REDIRECT_URI);
  params.append('code', code);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Error al intercambiar código por token:', errorText);
    throw new Error('Error al intercambiar código por token');
  }
  return await res.json(); // { access_token, user_id }
}

// 3. Obtener perfil básico
async function getInstagramProfile(access_token, user_id) {
  const url = `https://graph.instagram.com/${user_id}`;
  const params = new URLSearchParams({
    fields: 'id,username,account_type',
    access_token,
  });
  const res = await fetch(`${url}?${params.toString()}`);
  if (!res.ok) throw new Error('Error al obtener perfil de Instagram');
  return await res.json(); // { id, username, account_type }
}

// 4. Crear contenedor de imagen en Instagram
async function createInstagramMediaContainer(access_token, instagram_business_account_id, image_url, caption) {
  const url = `https://graph.facebook.com/v19.0/${instagram_business_account_id}/media`;
  const params = new URLSearchParams({
    image_url,
    caption: caption || '',
    access_token,
  });
  const res = await fetch(url, { method: 'POST', body: params });
  const data = await res.json();
  if (!res.ok) {
    console.error('Error creando contenedor de imagen:', data);
    throw new Error(data.error?.message || 'Error creando contenedor de imagen');
  }
  return data; // { id }
}

// 5. Publicar el contenedor en Instagram
async function publishInstagramMediaContainer(access_token, instagram_business_account_id, creation_id) {
  const url = `https://graph.facebook.com/v19.0/${instagram_business_account_id}/media_publish`;
  const params = new URLSearchParams({
    creation_id,
    access_token,
  });
  const res = await fetch(url, { method: 'POST', body: params });
  const data = await res.json();
  if (!res.ok) {
    console.error('Error publicando contenedor:', data);
    throw new Error(data.error?.message || 'Error publicando contenedor');
  }
  return data; // { id }
}

// 6. Obtener estado de publicación
async function getInstagramMediaStatus(access_token, media_id) {
  const url = `https://graph.facebook.com/v19.0/${media_id}?fields=status_code&access_token=${access_token}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    console.error('Error obteniendo estado de publicación:', data);
    throw new Error(data.error?.message || 'Error obteniendo estado de publicación');
  }
  return data; // { status_code }
}

module.exports = {
  getInstagramAuthUrl,
  exchangeCodeForToken,
  getInstagramProfile,
  createInstagramMediaContainer,
  publishInstagramMediaContainer,
  getInstagramMediaStatus
}; 
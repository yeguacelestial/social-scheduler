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

module.exports = {
  getInstagramAuthUrl,
  exchangeCodeForToken,
  getInstagramProfile
}; 
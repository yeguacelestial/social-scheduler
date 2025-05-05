const { createClient } = require('@supabase/supabase-js');
const instagramService = require('./instagramService');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const MAX_ATTEMPTS = 3;
const CHECK_INTERVAL_MS = 60 * 1000; // 1 minuto

async function getInstagramAccessTokenAndAccountId(user_id) {
  // Busca el access_token y el account_id de la tabla social_connections
  const { data, error } = await supabase
    .from('social_connections')
    .select('access_token, account_id')
    .eq('user_id', user_id)
    .eq('provider', 'instagram')
    .maybeSingle();
  if (error || !data) throw new Error('No se encontró conexión de Instagram para el usuario');
  return data;
}

async function processScheduledPosts() {
  // Busca publicaciones programadas pendientes
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('estado', 'programada')
    .lte('fecha_programada', new Date().toISOString());
  if (error) {
    console.error('Error consultando publicaciones programadas:', error);
    return;
  }
  if (!posts || posts.length === 0) {
    console.log('No hay publicaciones pendientes.');
    return;
  }
  for (const post of posts) {
    try {
      // Solo soportamos imágenes por ahora
      const imageUrl = Array.isArray(post.archivos) ? post.archivos[0] : post.archivos;
      const caption = post.texto || '';
      console.log('Procesando post:', JSON.stringify(post, null, 2));
      const { access_token, account_id } = await getInstagramAccessTokenAndAccountId(post.user_id);
      console.log('Access token:', access_token);
      console.log('Account ID:', account_id);
      console.log('Image URL:', imageUrl);
      console.log('Caption:', caption);
      // 1. Crear contenedor de imagen
      const container = await instagramService.createInstagramMediaContainer(access_token, account_id, imageUrl, caption);
      console.log('Respuesta de createInstagramMediaContainer:', container);
      // 2. Publicar el contenedor
      const publish = await instagramService.publishInstagramMediaContainer(access_token, account_id, container.id);
      console.log('Respuesta de publishInstagramMediaContainer:', publish);
      // 3. (Opcional) Verificar estado de publicación
      // const status = await instagramService.getInstagramMediaStatus(access_token, publish.id);
      // 4. Actualizar estado a 'publicada'
      await supabase
        .from('scheduled_posts')
        .update({ estado: 'publicada', updated_at: new Date().toISOString() })
        .eq('id', post.id);
      console.log(`Publicación ${post.id} publicada exitosamente en Instagram.`);
    } catch (err) {
      console.error(`Error publicando post ${post.id}:`, err.message);
      // Manejo de reintentos
      const attempts = post.intentos || 0;
      if (attempts + 1 >= MAX_ATTEMPTS) {
        await supabase
          .from('scheduled_posts')
          .update({ estado: 'fallida', error: err.message, updated_at: new Date().toISOString(), intentos: attempts + 1 })
          .eq('id', post.id);
        console.log(`Publicación ${post.id} marcada como fallida.`);
      } else {
        await supabase
          .from('scheduled_posts')
          .update({ intentos: attempts + 1, error: err.message, updated_at: new Date().toISOString() })
          .eq('id', post.id);
        console.log(`Reintento ${attempts + 1} para publicación ${post.id}.`);
      }
    }
  }
}

// Ejecutar el worker cada minuto
timer = setInterval(processScheduledPosts, CHECK_INTERVAL_MS);
console.log('Instagram Publisher Worker iniciado.');
processScheduledPosts(); 
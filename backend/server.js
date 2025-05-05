require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const instagramService = require('./instagramService');
const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');

// Check if Supabase URL and Key are set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be defined in your .env file');
    process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
const PORT = process.env.PORT || 3001; // Backend port

// Middleware
app.use(cors({ 
    origin: 'http://localhost:5173', // Allow frontend origin (Vite default port)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
})); 
app.use(express.json()); // Parse JSON bodies

// Configuración de multer para manejo de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Validaciones de tipo y tamaño por red social
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const VALID_VIDEO_TYPES = ['video/mp4'];
const MAX_IMAGE_SIZE_MB = 8; // Instagram y TikTok aceptan hasta 8MB por imagen
const MAX_VIDEO_SIZE_MB = 100; // TikTok hasta 100MB, Instagram hasta 100MB
const MAX_VIDEO_DURATION_SEC = { instagram: 60, tiktok: 600 }; // 1 min IG, 10 min TikTok

// Utilidad para validar duración de video (usando ffprobe si está disponible)
async function getVideoDuration(buffer) {
  // Aquí podrías usar una librería como fluent-ffmpeg o similar si lo deseas
  // Por simplicidad, omitimos la validación de duración en backend (solo advertencia en frontend)
  return null;
}

// --- Basic JWT Middleware (Placeholder) ---
// This is a very basic example. We'll likely enhance this.
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if there isn't any token

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            console.error('JWT Error:', error);
            return res.sendStatus(403); // Token is no longer valid or user not found
        }
        req.user = user; // Add user object to the request
        next(); // proceed to the next middleware or route handler
    } catch (err) {
        console.error('Token validation error:', err);
        return res.sendStatus(500);
    }
};

// --- Routes ---
app.get('/', (req, res) => {
    res.send('Social Scheduler Backend API');
});

// Example protected route (using the middleware)
app.get('/api/protected-test', authenticateToken, (req, res) => {
    // Access user info via req.user added by the middleware
    res.json({ message: 'This is a protected route!', userId: req.user.id, email: req.user.email });
});

// --- Instagram OAuth ---
// 1. Iniciar flujo OAuth
app.get('/api/connect/instagram/start', authenticateToken, (req, res) => {
    // Usamos el user id como state para CSRF protection
    const state = req.user.id;
    const url = instagramService.getInstagramAuthUrl(state);
    res.json({ url });
});

// 2. Callback de Instagram
app.get('/api/connect/instagram/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) {
        return res.redirect('http://localhost:5173/instagram/callback?error=1');
    }
    try {
        // Intercambiar código por token
        const tokenData = await instagramService.exchangeCodeForToken(code);
        // Obtener perfil básico
        const profile = await instagramService.getInstagramProfile(tokenData.access_token, tokenData.user_id);
        // Guardar en Supabase
        const { data, error } = await supabase
            .from('social_connections')
            .upsert([
                {
                    user_id: state,
                    provider: 'instagram',
                    account_id: profile.id,
                    access_token: tokenData.access_token,
                    username: profile.username,
                    account_type: profile.account_type,
                    connected_at: new Date().toISOString()
                }
            ], { onConflict: ['user_id', 'provider', 'account_id'] });
        if (error) {
            console.error('Error guardando conexión en Supabase:', error);
            return res.redirect('http://localhost:5173/instagram/callback?error=1');
        }
        // Redirigir a éxito
        return res.redirect('http://localhost:5173/instagram/callback?success=1');
    } catch (err) {
        console.error('Error en callback de Instagram:', err);
        return res.redirect('http://localhost:5173/instagram/callback?error=1');
    }
});

// 3. Desconectar cuenta de Instagram
app.delete('/api/disconnect/instagram/:accountId', authenticateToken, async (req, res) => {
    const { accountId } = req.params;
    const userId = req.user.id;
    try {
        const { error } = await supabase
            .from('social_connections')
            .delete()
            .eq('user_id', userId)
            .eq('provider', 'instagram')
            .eq('account_id', accountId);
        if (error) {
            console.error('Error eliminando conexión:', error);
            return res.status(500).json({ error: 'Error eliminando conexión.' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error en desconexión:', err);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

// Endpoint para obtener cuentas sociales conectadas
app.get('/api/social-connections', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const { data, error } = await supabase
            .from('social_connections')
            .select('*')
            .eq('user_id', userId);
        if (error) {
            console.error('Error obteniendo conexiones:', error);
            return res.status(500).json({ error: 'Error obteniendo conexiones.' });
        }
        // Agrupar por proveedor
        const grouped = {
            instagram: data.filter(conn => conn.provider === 'instagram'),
            // facebook: [], tiktok: [], x: [] // Para el futuro
        };
        res.json(grouped);
    } catch (err) {
        console.error('Error en /api/social-connections:', err);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

// --- NUEVAS RUTAS PARA SUBIDA Y PROGRAMACIÓN DE PUBLICACIONES ---

// POST /api/posts/upload
app.post('/api/posts/upload', authenticateToken, upload.array('archivos', 10), async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('--- /api/posts/upload ---');
    console.log('userId:', userId);
    const redes = req.body.redes_destino ? JSON.parse(req.body.redes_destino) : [];
    console.log('redes_destino:', redes);
    const files = req.files;
    console.log('archivos recibidos:', files && files.length);
    if (!files || files.length === 0) {
      console.log('No se enviaron archivos.');
      return res.status(400).json({ error: 'No se enviaron archivos.' });
    }
    // Validar cantidad de archivos según red
    if (redes.includes('tiktok') && files.length > 1) {
      console.log('Demasiados archivos para TikTok.');
      return res.status(400).json({ error: 'Solo se permite un archivo para TikTok.' });
    }
    // Validar tipo y tamaño
    for (const file of files) {
      console.log('Validando archivo:', file.originalname, file.mimetype, file.size);
      if (!VALID_IMAGE_TYPES.includes(file.mimetype) && !VALID_VIDEO_TYPES.includes(file.mimetype)) {
        console.log('Tipo de archivo no permitido:', file.originalname);
        return res.status(400).json({ error: `Tipo de archivo no permitido: ${file.originalname}` });
      }
      const sizeMB = file.size / (1024 * 1024);
      if (VALID_IMAGE_TYPES.includes(file.mimetype) && sizeMB > MAX_IMAGE_SIZE_MB) {
        console.log('Imagen demasiado grande:', file.originalname);
        return res.status(400).json({ error: `Imagen demasiado grande: ${file.originalname}` });
      }
      if (VALID_VIDEO_TYPES.includes(file.mimetype) && sizeMB > MAX_VIDEO_SIZE_MB) {
        console.log('Video demasiado grande:', file.originalname);
        return res.status(400).json({ error: `Video demasiado grande: ${file.originalname}` });
      }
    }
    // Subir archivos a Supabase Storage
    const urls = [];
    for (const file of files) {
      const ext = path.extname(file.originalname);
      const filename = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      console.log('Subiendo archivo a Supabase Storage:', filename);
      const { data, error } = await supabase.storage.from('publicaciones').upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });
      if (error) {
        console.error('Error subiendo archivo:', file.originalname, error);
        return res.status(500).json({ error: `Error subiendo archivo: ${file.originalname}` });
      }
      // Obtener URL pública
      const { data: publicUrl } = supabase.storage.from('publicaciones').getPublicUrl(filename);
      urls.push(publicUrl.publicUrl);
      console.log('Archivo subido y URL pública:', publicUrl.publicUrl);
    }
    console.log('Todos los archivos subidos correctamente. URLs:', urls);
    return res.json({ urls });
  } catch (err) {
    console.error('Error en /api/posts/upload:', err);
    if (err && err.stack) console.error(err.stack);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/posts/schedule
app.post('/api/posts/schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { redes_destino, archivos, texto, fecha_programada, zona_horaria } = req.body;
    if (!redes_destino || !archivos || !fecha_programada) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    // Insertar en Supabase
    const { data, error } = await supabase.from('scheduled_posts').insert([
      {
        user_id: userId,
        redes_destino,
        archivos,
        texto,
        fecha_programada,
        zona_horaria: zona_horaria || null,
        estado: 'programada',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ]).select();
    if (error) {
      console.error('Error insertando publicación:', error);
      return res.status(500).json({ error: 'Error guardando publicación.' });
    }
    // TODO: Enviar notificación de programación exitosa
    return res.json({ success: true, post: data[0] });
  } catch (err) {
    console.error('Error en /api/posts/schedule:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/posts - Listar publicaciones programadas del usuario
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('GET /api/posts - userId:', userId);
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', userId)
      .order('fecha_programada', { ascending: false });
    if (error) {
      console.error('Error obteniendo publicaciones:', error);
      return res.status(500).json({ error: 'Error obteniendo publicaciones.' });
    }
    res.json({ posts: data });
  } catch (err) {
    console.error('Error en GET /api/posts:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/posts/:id - Cancelar publicación programada (borrado lógico)
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    // Solo cancelar si es del usuario y está en estado 'programada'
    const { data: post, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('estado', 'programada')
      .single();
    if (fetchError || !post) {
      return res.status(404).json({ error: 'Publicación no encontrada o no cancelable.' });
    }
    const { error } = await supabase
      .from('scheduled_posts')
      .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error cancelando publicación:', error);
      return res.status(500).json({ error: 'Error cancelando publicación.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error en DELETE /api/posts/:id:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// --- Authentication routes will go here ---
// (Supabase handles direct auth, but we might need routes for specific actions)

// --- Social connection routes will go here (Step 7) ---
// app.get('/api/connect/x/start', authenticateToken, ...);
// app.get('/api/connect/x/callback', ...); // Callback needs careful handling
// app.delete('/api/disconnect/x', authenticateToken, ...);


// Start the server
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
}); 
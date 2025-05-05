require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const instagramService = require('./instagramService');

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
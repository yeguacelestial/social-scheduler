import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../context/AuthContext'; // Import supabase client directly
import { AuthError } from '@supabase/supabase-js'; // Import AuthError type

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
            // AuthProvider will detect the session change and handle redirect via ProtectedRoute
            // No need to navigate explicitly here unless you want a specific landing page after login
            // navigate('/dashboard'); // Or let ProtectedRoute handle it
        } catch (err) {
            console.error("Login error:", err);
            if (err instanceof AuthError) {
                 setError(err.message || "Failed to log in");
            } else if (err instanceof Error) {
                 setError(err.message || "An unexpected error occurred");
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ padding: '10px 15px', width: '100%' }}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p style={{ marginTop: '15px', textAlign: 'center' }}>
                Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
        </div>
    );
};

export default Login; 
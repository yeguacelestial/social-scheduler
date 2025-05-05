import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../context/AuthContext'; // Import supabase client directly
import { AuthError } from '@supabase/supabase-js'; // Import AuthError type

const Signup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null); // For success/info messages
    const navigate = useNavigate();

    const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                // options: { // Optional: Add email confirmation redirect
                //     emailRedirectTo: window.location.origin + '/login',
                // }
            });

            if (error) throw error;

            if (data.user && data.user.identities && data.user.identities.length === 0) {
                 // This usually means email confirmation is required.
                 setMessage("Signup successful! Please check your email to confirm your account.");
                 // Don't redirect immediately, let the user see the message.
                 // Optional: Redirect after a delay or provide a button to go to login
                 // setTimeout(() => navigate('/login'), 5000); 
            } else if (data.user) {
                // User created and potentially auto-confirmed (if disabled in Supabase)
                setMessage("Signup successful! Redirecting to login...");
                setTimeout(() => navigate('/login'), 2000); // Redirect to login after a short delay
            } else {
                 setMessage("Signup successful! Please check your email."); // Generic message
            }

        } catch (err) {
            console.error("Signup error:", err);
             if (err instanceof AuthError) {
                 setError(err.message || "Failed to sign up");
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
            <h2>Sign Up</h2>
            <form onSubmit={handleSignup}>
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
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px' }}>Confirm Password:</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {message && <p style={{ color: 'green' }}>{message}</p>}
                <button type="submit" disabled={loading} style={{ padding: '10px 15px', width: '100%' }}>
                    {loading ? 'Signing up...' : 'Sign Up'}
                </button>
            </form>
            <p style={{ marginTop: '15px', textAlign: 'center' }}>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
};

export default Signup; 
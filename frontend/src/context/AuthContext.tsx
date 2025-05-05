import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

// Get Supabase URL and Anon Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided in environment variables (.env file)");
}

// Initialize Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Define the shape of the context value
interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define props for the AuthProvider component
interface AuthProviderProps {
    children: ReactNode;
}

// Create the AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch the initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false); // Ensure loading is set to false on updates too
        });

        // Cleanup listener on component unmount
        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // Function to sign out
    const signOut = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
            // Optionally handle error (e.g., show a notification)
        }
        // State updates will be handled by onAuthStateChange listener
        // setLoading(false); // No need to set loading false here, listener will do it
    };

    const value: AuthContextType = {
        session,
        user,
        loading,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the Auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 
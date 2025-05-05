import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { session, loading } = useAuth();

    if (loading) {
        // Show a loading indicator while checking auth status
        // You can replace this with a more sophisticated loading spinner component
        return <div>Cargando...</div>; 
    }

    if (!session) {
        // If no session and not loading, redirect to login
        return <Navigate to="/login" replace />; 
    }

    // If session exists and loading is finished, render the child routes
    return <Outlet />; 
};

export default ProtectedRoute; 
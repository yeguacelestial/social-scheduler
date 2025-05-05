import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard'; // We'll create this in the next step
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import InstagramCallback from './pages/InstagramCallback';
import './App.css'; // Keep existing styles

function App() {
  const { session, loading } = useAuth(); // Use auth context to check session for initial redirect

  // Optional: Redirect logged-in users trying to access login/signup
  // This prevents showing login page momentarily if already logged in
  const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    if (loading) return <div>Loading...</div>; // Prevent flash of content
    return session ? <Navigate to="/dashboard" replace /> : children;
  };

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          {/* Dashboard will be the main protected route for now */}
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Callback de Instagram */}
          <Route path="/instagram/callback" element={<InstagramCallback />} />
          {/* Add other protected routes here as needed */}
        </Route>

        {/* Redirect root path */}
        {/* If loading, show nothing or loading indicator */}
        {/* If logged in, redirect to dashboard */}
        {/* If not logged in, redirect to login */}
        <Route 
            path="/"
            element={
                loading ? <div>Loading...</div> : session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            }
        />

        {/* Optional: Catch-all route for 404 Not Found */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;

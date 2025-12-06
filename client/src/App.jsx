import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import EntryEditor from "./pages/EntryEditor";
import AllEntries from "./pages/AllEntries";

function ProtectedRoute({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        // Check if user is authenticated by trying to fetch entries
        fetch('/api/entries/?page=1', { credentials: 'include' })
            .then(response => {
                if (response.ok) {
                    setIsAuthenticated(true);
                } else if (response.status === 403 || response.status === 401) {
                    setIsAuthenticated(false);
                } else {
                    setIsAuthenticated(false);
                }
            })
            .catch(() => setIsAuthenticated(false));
    }, []);

    if (isAuthenticated === null) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    return isAuthenticated ? children : <Navigate to="/registration/sign_in" replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/registration/sign_in" element={<SignIn />} />
            <Route path="/registration/sign_up" element={<SignUp />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/entries" element={<ProtectedRoute><AllEntries /></ProtectedRoute>} />
                <Route path="/entries/:id/edit" element={<ProtectedRoute><EntryEditor /></ProtectedRoute>} />
                <Route path="/entries/new" element={<ProtectedRoute><EntryEditor /></ProtectedRoute>} />
        </Routes>
    );
}
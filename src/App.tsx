import React, { useState, useEffect } from 'react';
import './App.css';
import './styles/Login.css';
import Login from './components/Login';
import Header from './Header';
import Question from './Question';
import ActivityImage from './ActivityImage';
import Controls from './Controls';
import Feedback from './Feedback';
import { VoiceSettingsProvider } from './contexts/VoiceSettingsContext';
import { VoiceSettingsDialog } from './components/VoiceSettingsDialog';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminPage } from './components/admin/AdminPage';
import { WeekManager } from './components/admin/WeekManager';
import { GamePage } from './components/game/GamePage';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from './firebaseConfig';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const auth = getAuth(app);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsLoggedIn(!!user);
            setLoading(false);
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, [auth]);

    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-lg">Loading...</p>
            </div>
        );
    }

    return (
        <VoiceSettingsProvider>
            <Router>
                <div className="app">
                    <VoiceSettingsDialog />
                    <Routes>
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/admin/week/:weekId" element={<WeekManager />} />
                        <Route
                            path="/"
                            element={
                                !isLoggedIn ? (
                                    <Login onLogin={handleLogin} />
                                ) : (<GamePage />)
                            }
                        />
                    </Routes>
                </div>
            </Router>
        </VoiceSettingsProvider>
    );
}

export default App;

import React, { useState } from 'react';
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
import { GamePage } from './components/game/GamePage';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    return (
        <VoiceSettingsProvider>
            <Router>
                <div className="app">
                    <VoiceSettingsDialog />
                    <Routes>
                        <Route 
                            path="/admin/*" 
                            element={<AdminPage />} 
                        />
                        <Route
                            path="/"
                            element={
                                !isLoggedIn ? (
                                    <Login onLogin={handleLogin} />
                                ) : (<GamePage /> )
                            }
                        />
                    </Routes>
                </div>
            </Router>
        </VoiceSettingsProvider>
    );
}

export default App;

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

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    return (
        <VoiceSettingsProvider>
            <div className="app">
                <VoiceSettingsDialog />
                {!isLoggedIn ? (
                    <Login onLogin={handleLogin} />
                ) : (
                    <div>
                        <Header />
                        <Question />
                        <ActivityImage src="" />
                        <Controls onNext={() => {}} onMicClick={() => {}} />
                        <Feedback />
                    </div>
                )}
            </div>
        </VoiceSettingsProvider>
    );
}

export default App;

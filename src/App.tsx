import { useState } from 'react';
import './App.css';
import './styles/Login.css';
import Login from './components/Login';
import Header from './Header';
import Question from './Question';
import ActivityImage from './ActivityImage';
import Controls from './Controls';
import Feedback from './Feedback';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div>
            <Header />
            <Question />
            <ActivityImage src="" />
            <Controls onNext={() => {}} onMicClick={() => {}} />
            <Feedback />
        </div>
    );
}

export default App;

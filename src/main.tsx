import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import VisualComponents from './VisualComponents';
import Header from './Header';
import Question from './Question';
import ActivityImage from './ActivityImage';
import Controls from './Controls';
import Feedback from './Feedback';

const App = () => {
    const handleNext = () => {
        // Logic for next activity
    };

    const handleMicClick = () => {
        // Logic for mic click
    };

    return (
        <div>
            <Header />
            <Question />
            <ActivityImage src="" />
            <Controls onNext={handleNext} onMicClick={handleMicClick} />
            <Feedback />
        </div>
    );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

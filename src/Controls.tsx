import React from 'react';

const Controls = ({ onNext, onMicClick }: { onNext: () => void; onMicClick: () => void; }) => {
    return (
        <div className="controls">
            <button className="mic-button" onClick={onMicClick} id="micButton"></button>
            <button className="button" onClick={onNext}>Nächste Aktivität</button>
        </div>
    );
};

export default Controls;

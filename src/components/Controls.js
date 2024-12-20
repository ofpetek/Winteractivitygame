import React from 'react';

const Controls = ({ onSpeechRecognition, onNextActivity }) => {
  return (
    <div className="controls">
      <button className="mic-button" onClick={onSpeechRecognition}></button>
      <button className="button" onClick={onNextActivity}>Nächste Aktivität</button>
    </div>
  );
};

export default Controls;

import React from 'react';
import { Button } from 'antd';

const Controls = ({ onSpeechRecognition, onNextActivity }) => {
  return (
    <div className="controls">
      <Button className="mic-button" onClick={onSpeechRecognition}></Button>
      <Button className="button" onClick={onNextActivity}>Nächste Aktivität</Button>
    </div>
  );
};

export default Controls;

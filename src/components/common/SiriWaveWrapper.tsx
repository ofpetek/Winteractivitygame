import Siriwave from 'react-siriwave';
import { useVoiceLevel } from '../../contexts/VoiceLevelContext';
import { useEffect } from 'react';


export function SiriWaveWrapper() {
  const { audioLevel } = useVoiceLevel();
  
  // useEffect(() => {
  //   console.log('audioLevel', audioLevel);
  // }, [audioLevel]);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/20 to-transparent">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <Siriwave
          theme="ios9"
          amplitude={audioLevel}
          speed={0.2}
          frequency={1}
          style={{ width: '800px', height: '60px' }}
        />
      </div>
    </div>
  );
}

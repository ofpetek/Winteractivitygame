import Siriwave from 'react-siriwave';

interface SiriWaveWrapperProps {
  speaking?: boolean;
}

export function SiriWaveWrapper({ speaking = false }: SiriWaveWrapperProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/20 to-transparent">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <Siriwave
          theme="ios9"
          amplitude={speaking ? 1 : 0.5}
          speed={0.2}
          frequency={6}
          style={{ width: '800px', height: '60px' }}
        />
      </div>
    </div>
  );
}

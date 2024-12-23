import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebaseConfig';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isListening, setIsListening] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [silenceThreshold, setSilenceThreshold] = useState(-2); // New state for silence threshold
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isListeningRef = useRef(false); // Add this ref to track current listening state

    // Initialize Firebase function
    const functions = getFunctions(app);
    const transcribeAudio = httpsCallable(functions, 'processAudio');
    const auth = getAuth(app);

    useEffect(() => {
        // Get audio input devices
        navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
            const audioDevices = deviceInfos.filter(device => device.kind === 'audioinput');
            setDevices(audioDevices);
            if (audioDevices.length > 0) {
                setSelectedDeviceId(audioDevices[0].deviceId);
            }
        });

        return () => {
            // Cleanup
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (listeningTimeoutRef.current) {
                clearTimeout(listeningTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        console.log('Silence threshold set to:', silenceThreshold);
    }, [silenceThreshold]);
        
    const startListening = useCallback(async () => {
        const processAudio = async (audioBlob: Blob) => {
            try {
                console.log('Processing audio...');
                // Convert blob to base64
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    
                    // Log the payload to verify
                    console.log('Sending payload to transcribeAudio:', {
                        mimeType: 'audio/wav',
                        data: base64Audio
                    });

                    // Call Firebase function
                    const result = await transcribeAudio({
                        mimeType: 'audio/wav',
                        data: base64Audio
                    });

                    console.log('result', result);

                    setTranscribedText(result.data);
                    setFeedback('Transcription successful. Logging in...');
                    

                    // Log in with fixed email and transcribed passphrase
                    const fixedEmail = 'ae@winteractivitygame.firebase.app';
                    const passphrase = "" + result.data;

                    try {
                        await signInWithEmailAndPassword(auth, fixedEmail, passphrase);
                        setFeedback('Login successful!');
                        setTimeout(onLogin, 1500);
                    } catch (loginError) {
                        console.error('Error logging in:', loginError);
                        setFeedback('Login failed. Please try again.');
                    }
                };
                reader.readAsDataURL(audioBlob);
            } catch (error) {
                console.error('Error processing audio:', error);
                setFeedback('Error processing audio. Please try again.');
            }
        };

        const detectSilence = (analyser: AnalyserNode) => {
            const bufferLength = analyser.fftSize;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);

            // Calculate RMS (root mean square) value
            let sumSquares = 0;
            for (let i = 0; i < bufferLength; i++) {
                const value = dataArray[i] - 128; // Center the values around 0
                sumSquares += value * value;
            }
            const rms = Math.sqrt(sumSquares / bufferLength);
            setAudioLevel(rms); // Update audio level state
            console.log('Real-time audio level (RMS):', rms); // Real-time logging

            if (rms < Math.abs(silenceThreshold)) { // Use silenceThreshold state
                if (silenceTimeoutRef.current === null) {
                    console.log('Silence detected. Starting silence timeout...');
                    silenceTimeoutRef.current = setTimeout(() => {
                        console.log('Silence timeout reached. Stopping listening...');
                        stopListening();
                    }, 3000);
                }
            } else {
                if (silenceTimeoutRef.current) {
                    console.log('Sound detected. Clearing silence timeout...');
                    clearTimeout(silenceTimeoutRef.current);
                    silenceTimeoutRef.current = null;
                }
            }
        };

        try {
            console.log('Requesting audio stream...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined } 
            });
            console.log('Audio stream received:', stream);
            
            // Set up audio context and analyser
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            console.log('Audio context and analyser set up.');
            
            // Configure analyser
            analyserRef.current.fftSize = 2048;
            analyserRef.current.minDecibels = -90;
            analyserRef.current.maxDecibels = -10;
            analyserRef.current.smoothingTimeConstant = 0.85;

            // Set up media recorder
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                await processAudio(audioBlob);
            };

            // Start recording
            mediaRecorderRef.current.start();
            setIsListening(true);
            isListeningRef.current = true; // Update ref when starting
            setFeedback('Listening...');
            console.log('Recording started.');

            // Start silence detection
            const checkSilence = () => {
                console.log('Checking silence...', analyserRef.current, isListeningRef.current);
                if (analyserRef.current && isListeningRef.current) {
                    detectSilence(analyserRef.current);
                    console.log('Real-time audio level:', audioLevel); // Real-time logging
                    requestAnimationFrame(checkSilence);
                }
            };
            requestAnimationFrame(checkSilence); // Ensure it runs continuously

        } catch (error) {
            console.error('Error accessing microphone:', error);
            setFeedback('Error accessing microphone. Please check permissions.');
        }
    }, [selectedDeviceId, isListening, audioLevel, silenceThreshold, transcribeAudio, auth, onLogin, setFeedback]);

    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
            isListeningRef.current = false; // Update ref when stopping
            setFeedback('Processing...');
            console.log('Recording stopped.');
        }
    };

    

    return (
        <div className="login-container">
            <h2>Welcome to Winter Activity Game</h2>
            <p>Please speak the secret word to continue</p>
            
            <select 
                value={selectedDeviceId} 
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={isListening}
            >
                {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId}`}
                    </option>
                ))}
            </select>
            
            <label>
                Silence Threshold:
                <input 
                    type="number" 
                    value={silenceThreshold} 
                    onChange={(e) => setSilenceThreshold(Number(e.target.value))} 
                    disabled={isListening}
                />
            </label>
            
            <button 
                className={`mic-button ${isListening ? 'recording' : ''}`}
                onClick={startListening}
                disabled={isListening}
            >
                {isListening ? 'Listening...' : 'Say the password to login'}
            </button>
            
            {isListening && (
                <div className="audio-level-indicator">
                    <p>Audio Level: {audioLevel}</p>
                    <div 
                        className="audio-level-bar" 
                        style={{ width: `${audioLevel}%`, height: '10px', background: 'green' }}
                    />
                </div>
            )}
            
            {transcribedText && (
                <p className="spoken-text">You said: {transcribedText}</p>
            )}
            
            {feedback && (
                <p className={`feedback ${feedback.includes('successful') ? 'success' : 'error'}`}>
                    {feedback}
                </p>
            )}
        </div>
    );
};

export default Login;

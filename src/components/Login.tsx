import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isListening, setIsListening] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    // Initialize Firebase function
    const functions = getFunctions(app);
    const validateSecretWord = httpsCallable(functions, 'validateSecretWord');

    useEffect(() => {
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
        };
    }, []);

    const detectSilence = (analyser: AnalyserNode, minDecibels = -48) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (average < Math.abs(minDecibels)) {
            if (silenceTimeoutRef.current === null) {
                silenceTimeoutRef.current = setTimeout(() => {
                    stopListening();
                }, 1000); // Stop after 1 second of silence
            }
        } else {
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
        }
    };

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Set up audio context and analyser
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            
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
            setFeedback('Listening...');

            // Start silence detection
            const checkSilence = () => {
                if (analyserRef.current && isListening) {
                    detectSilence(analyserRef.current);
                    requestAnimationFrame(checkSilence);
                }
            };
            checkSilence();

        } catch (error) {
            console.error('Error accessing microphone:', error);
            setFeedback('Error accessing microphone. Please check permissions.');
        }
    };

    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
            setFeedback('Processing...');
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        try {
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                
                // Call Firebase function
                const result = await validateSecretWord({
                    spokenWord: '', // We'll let the function handle the transcription
                    audioFile: {
                        mimeType: 'audio/wav',
                        data: base64Audio
                    }
                });
                
                // Firebase function result is in result.data
                const response = result.data as {
                    passphrase: {
                        text: string;
                        confidence: number;
                        language: string;
                        isValid: boolean;
                    };
                    message: string;
                };

                setTranscribedText(response.passphrase.text);
                setFeedback(response.message);
                
                if (response.passphrase.isValid) {
                    setTimeout(onLogin, 1500);
                }
            };
            reader.readAsDataURL(audioBlob);
        } catch (error) {
            console.error('Error processing audio:', error);
            setFeedback('Error processing audio. Please try again.');
        }
    };

    return (
        <div className="login-container">
            <h2>Welcome to Winter Activity Game</h2>
            <p>Please speak the secret word to continue</p>
            
            <button 
                className={`mic-button ${isListening ? 'recording' : ''}`}
                onClick={startListening}
                disabled={isListening}
            >
                {isListening ? 'Listening...' : 'Click to Speak'}
            </button>
            
            {transcribedText && (
                <p className="spoken-text">You said: {transcribedText}</p>
            )}
            
            {feedback && (
                <p className={`feedback ${feedback.includes('Correct') ? 'success' : 'error'}`}>
                    {feedback}
                </p>
            )}
        </div>
    );
};

export default Login;

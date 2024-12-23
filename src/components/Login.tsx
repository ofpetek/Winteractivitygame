import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Mic } from 'lucide-react';

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center text-blue-900">
                        Welcome to Winter Activity Game
                    </CardTitle>
                    <CardDescription className="text-center text-gray-600 mt-2">
                        Say the password to login and start your adventure!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Microphone</label>
                            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a microphone" />
                                </SelectTrigger>
                                <SelectContent>
                                    {devices.map((device) => (
                                        <SelectItem key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Microphone ${device.deviceId}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Silence Threshold</label>
                            <input
                                type="range"
                                min="-10"
                                max="0"
                                step="1"
                                value={silenceThreshold}
                                onChange={(e) => setSilenceThreshold(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-sm text-gray-500 text-center">{silenceThreshold}</div>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <Button
                                onClick={isListening ? stopListening : startListening}
                                className={`w-32 h-32 rounded-full transition-all ${
                                    isListening 
                                        ? 'bg-red-500 hover:bg-red-600' 
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                            >
                                <Mic className={`w-8 h-8 ${isListening ? 'animate-pulse' : ''}`} />
                            </Button>
                            <p className="text-sm font-medium text-gray-700">
                                {isListening ? 'Listening...' : 'Click to Start'}
                            </p>
                        </div>

                        {feedback && (
                            <div className={`text-center p-3 rounded-lg ${
                                feedback.includes('successful') 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {feedback}
                            </div>
                        )}

                        {transcribedText && (
                            <div className="text-center text-sm text-gray-600">
                                Transcribed: {transcribedText}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;

const activities = [
    { image: 'schlittschuh_fahren.jpeg', answer: ['Sie fahren Schlittschuh.', 'Schlittschuh fahren'] },
    { image: 'schlitten_fahren.jpeg', answer: ['Sie fahren Schlitten.', 'Schlitten fahren'] },
    { image: 'schneeballschlacht.jpeg', answer: ['Sie machen eine Schneeballschlacht.', 'Schneeballschlacht'] },
    { image: 'weihnachtsbaum_schmuecken.jpeg', answer: ['Sie schmücken einen Weihnachtsbaum.', 'Weihnachtsbaum schmücken'] },
    { image: 'Ski fahren.jpeg', answer: ['Sie fahren Ski.', 'Ski fahren'] },
    { image: 'schneemann_machen.jpeg', answer: ['Sie bauen einen Schneemann.', 'Schneemann bauen'] },
    { image: 'caraoussel_fahren.jpeg', answer: ['Sie fahren Karussell.', 'Karussell fahren'] },
    { image: 'einkaufen_gehen.jpeg', answer: ['Sie gehen einkaufen.', 'Einkaufen gehen'] },
    { image: 'eishockey_spielen.jpeg', answer: ['Sie spielen Eishockey.', 'Eishockey spielen'] },
    { image: 'santa_sprechen.jpeg', answer: ['Sie sprechen mit dem Weihnachtsmann.', 'Mit dem Weihnachtsmann sprechen'] },
    { image: 'weihnachtsbaum_heimtragen.jpeg', answer: ['Sie tragen den Weihnachtsbaum nach Hause.', 'Weihnachtsbaum nach Hause tragen'] }
];

let currentActivityIndex = -1;
let previousActivityIndex = -1;

// Function to get random activity index (different from previous)
function getRandomActivityIndex() {
    const availableIndices = Array.from({ length: activities.length }, (_, i) => i).filter(i => i !== currentActivityIndex);
    currentActivityIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    console.log(`Chosen activity index: ${currentActivityIndex}`); // Log the chosen index
    return currentActivityIndex;
}

// Function to start speech recognition
function startSpeechRecognition() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'de-DE'; // Set to German
    recognition.start();

    recognition.onstart = function() {
        console.log("Spracherkennung gestartet...");
    };

    recognition.onresult = function(event) {
        const spokenAnswer = event.results[0][0].transcript;
        console.log("Erkannte Antwort:", spokenAnswer);
        checkAnswer(spokenAnswer);
    };

    recognition.onerror = function(event) {
        console.error("Fehler bei der Spracherkennung:", event.error);
    };
}

// Function to check the spoken or typed answer
function checkAnswer(spokenAnswer) {
    const correctAnswers = activities[currentActivityIndex].answer;
    const cleanSpokenAnswer = spokenAnswer.replace(/[.?!,;:]/g, '').toLowerCase();
    const isCorrect = correctAnswers.some(answer => answer.toLowerCase() === cleanSpokenAnswer);

    if (isCorrect) {
        document.getElementById('feedback').innerText = 'Richtig! Gut gemacht.';
        speak("Richtig! Gut gemacht.");
    } else {
        document.getElementById('feedback').innerText = `Falsch! Die richtige Antwort ist: ${correctAnswers[0]}`;
        speak(`Falsch! Die richtige Antwort ist: ${correctAnswers[0]}`);
    }
}

// Function to change to the next image
function nextImage() {
    // Clear previous feedback
    document.getElementById('feedback').innerText = '';
    
    // Get random activity index
    getRandomActivityIndex();
    
    // Update image
    document.getElementById('activityImage').src = activities[currentActivityIndex].image;
    
    // Ask the question aloud
    speak("Was machen diese Leute?");
}

// Function for text-to-speech with German voice
function speak(text) {
    const speech = new SpeechSynthesisUtterance();
    speech.lang = 'de-DE'; // Set language to German
    speech.text = text;
    
    // Select a German voice explicitly (if available)
    const voices = window.speechSynthesis.getVoices();
    const germanVoice = voices.find(voice => voice.lang === 'de-DE');
    
    if (germanVoice) {
        speech.voice = germanVoice;
    }
    
    window.speechSynthesis.speak(speech);
}

document.addEventListener('DOMContentLoaded', () => {
  // Add event listener for Enter key on text input
  document.getElementById('textInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      checkTextInput();
    }
  });

  // Add event listener for submit button
  document.getElementById('submitBtn').addEventListener('click', () => {
    checkTextInput();
  });

  // Initialize game
  startGame();
});

// Function to update progress
function updateProgress() {
  // Implementation here
}

// Function to start speech recognition
function startSpeechRecognition() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'de-DE'; // Set language to German

  recognition.onresult = (event) => {
    const userAnswer = event.results[0][0].transcript;
    checkAnswer(userAnswer); // Process the answer
  };

  recognition.start(); // Start listening
}

// Function for text-to-speech with German voice
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE'; // Set language to German
  
  // Get the selected voice from dropdown
  const voiceSelect = document.getElementById('voiceSelect');
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find(voice => voice.name === voiceSelect.value);
  
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}

// Function to populate voice list
function populateVoiceList() {
  const voiceSelect = document.getElementById('voiceSelect');
  voiceSelect.innerHTML = ''; // Clear existing options
  
  const voices = window.speechSynthesis.getVoices();
  
  // Filter and add German voices
  voices.forEach(voice => {
    if (voice.lang.startsWith('de')) { // Include all German voices
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.appendChild(option);
    }
  });
  
  // Select the first voice by default if available
  if (voiceSelect.options.length > 0) {
    voiceSelect.selectedIndex = 0;
  }
}

// Initialize voice list when voices are loaded
window.speechSynthesis.onvoiceschanged = populateVoiceList;

// Function to start the game
function startGame() {
  const questionText = 'Was ist Ihre Lieblingswinteraktivität?';
  document.querySelector('.question').textContent = questionText;
  speak(questionText); // Speak the question
  startSpeechRecognition(); // Start listening for user answer
}

// Function to check the spoken or typed answer (allow short answers)
function checkAnswer(spokenAnswer) {
  // Implementation here
}

// Function to check the text input answer
function checkTextInput() {
  const textInput = document.getElementById('textInput').value;
  if (textInput) {
    checkAnswer(textInput);
  }
}

// Function to change to the next image
function nextImage() {
  // Implementation here
}

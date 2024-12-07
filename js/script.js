document.addEventListener('DOMContentLoaded', () => {
  // Initialize game
  startGame();
});

// Function to start speech recognition
function startSpeechRecognition() {
  const micButton = document.getElementById('micButton');
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'de-DE'; // Set language to German

  // Add recording class for visual feedback
  micButton.classList.add('recording');

  recognition.onstart = () => {
    console.log("Spracherkennung gestartet...");
  };

  recognition.onresult = (event) => {
    const userAnswer = event.results[0][0].transcript;
    checkAnswer(userAnswer); // Process the answer
    micButton.classList.remove('recording');
  };

  recognition.onerror = (event) => {
    console.error("Fehler bei der Spracherkennung:", event.error);
    micButton.classList.remove('recording');
  };

  recognition.onend = () => {
    micButton.classList.remove('recording');
  };

  recognition.start(); // Start listening
}

// Function for text-to-speech with German voice
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE'; // Set language to German
  window.speechSynthesis.speak(utterance);
}

// Function to start the game
function startGame() {
  nextImage(); // Show first image
}

// Function to check the spoken answer
function checkAnswer(spokenAnswer) {
  const currentActivity = activities[currentActivityIndex];
  const correctAnswers = currentActivity.answer;
  const feedback = document.getElementById('feedback');
  
  const isCorrect = correctAnswers.some(answer => 
    spokenAnswer.toLowerCase().includes(answer.toLowerCase())
  );

  if (isCorrect) {
    feedback.textContent = "Richtig! 👏";
    feedback.style.color = "#27ae60";
    setTimeout(() => {
      nextImage();
    }, 1500);
  } else {
    feedback.textContent = "Versuchen Sie es noch einmal! 🤔";
    feedback.style.color = "#e74c3c";
  }
}

// Function to change to the next image
function nextImage() {
  // Clear previous feedback
  document.getElementById('feedback').textContent = '';
  
  // Move to next activity
  currentActivityIndex = (currentActivityIndex + 1) % activities.length;
  
  // Update image and speak question
  const currentActivity = activities[currentActivityIndex];
  document.getElementById('activityImage').src = currentActivity.image;
  speak("Was machen diese Leute?");
}

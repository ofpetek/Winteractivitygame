export function startSpeechRecognition() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'de-DE'; // Set to German
  recognition.start();

  recognition.onstart = function() {
    console.log("Spracherkennung gestartet...");
  };

  recognition.onresult = function(event) {
    const spokenAnswer = event.results[0][0].transcript;
    console.log("Erkannte Antwort:", spokenAnswer);
    // Assuming checkAnswer is a function that will be implemented elsewhere
    checkAnswer(spokenAnswer);
  };

  recognition.onerror = function(event) {
    console.error("Fehler bei der Spracherkennung:", event.error);
  };
}

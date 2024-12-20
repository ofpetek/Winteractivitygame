export function speak(text) {
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

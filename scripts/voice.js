// Voice input module
const Voice = {
    recognition: null,
    isListening: false,
    
    init() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.setupEventListeners();
        } else {
            console.warn('Web Speech API not supported');
            document.getElementById('voice-button').style.display = 'none';
        }
    },
    
    setupEventListeners() {
        const voiceButton = document.getElementById('voice-button');
        const voiceOrb = document.getElementById('voice-orb');
        const messageInput = document.getElementById('message-input');
        
        voiceButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });
        
        if (this.recognition) {
            this.recognition.onstart = () => {
                this.isListening = true;
                voiceButton.classList.add('listening');
                voiceOrb.style.animation = 'glow 0.5s infinite alternate';
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                voiceButton.classList.remove('listening');
                voiceOrb.style.animation = 'glow 2s infinite alternate';
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                this.isListening = false;
                voiceButton.classList.remove('listening');
                voiceOrb.style.animation = 'glow 2s infinite alternate';
                
                if (event.error === 'not-allowed') {
                    alert('Microphone access denied. Please allow microphone access in your browser settings.');
                }
            };
            
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Update input field with the final transcript
                if (finalTranscript) {
                    messageInput.value += (messageInput.value ? ' ' : '') + finalTranscript;
                    
                    // Trigger input event for auto-resize
                    const inputEvent = new Event('input', { bubbles: true });
                    messageInput.dispatchEvent(inputEvent);
                }
            };
        }
    },
    
    startListening() {
        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
            }
        }
    },
    
    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }
};
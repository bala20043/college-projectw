// ================= CHATBOT MAIN STATE =================
let currentState = 'ai_assistant';
let messages = [];
let isChatbotOpen = false;
let isProcessingClick = false;

// ================= CHATBOT OPEN & CLOSE =================
function openChatbot() {
    document.getElementById('chatbot-box').style.display = 'block';
    isChatbotOpen = true;
    if (currentState !== 'ai_assistant') resetChat();
}

function closeChatbot() {
    document.getElementById('chatbot-box').style.display = 'none';
    isChatbotOpen = false;
}

document.getElementById('chatbot-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    isChatbotOpen ? closeChatbot() : openChatbot();
});

document.getElementById('closeChat').addEventListener('click', function (e) {
    e.stopPropagation();
    closeChatbot();
});

// Header back button (goes to college login options or main AI)
const chatBackEl = document.getElementById('chatBack');
if (chatBackEl) {
    chatBackEl.addEventListener('click', function (e) {
        e.stopPropagation();
        // If currently on college_login (options), go back to AI assistant
        if (currentState === 'college_login') {
            goBackToStarte();
            return;
        }
        // Otherwise go to college login options
        convertToCollegeChatbot();
    });
}

document.getElementById('chatbot-box').addEventListener('click', function (e) {
    e.stopPropagation();
    isProcessingClick = true;
});

document.addEventListener('click', function (e) {
    if (isProcessingClick) {
        isProcessingClick = false;
        return;
    }
    const box = document.getElementById('chatbot-box');
    const btn = document.getElementById('chatbot-btn');
    if (isChatbotOpen && !box.contains(e.target) && !btn.contains(e.target)) closeChatbot();
});

// ================= SENDING MESSAGES =================
function handleKeyPress(event) {
    if (event.key === "Enter") sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    addMessage(message, "user");
    input.value = "";

    showTypingIndicator();

    if (currentState === "ai_assistant") {

        // =================== 📡 SEND TO AI BACKEND ===================
        try {
            const res = await fetch("/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message })
            });

            const data = await res.json();
            hideTypingIndicator();
            addMessage(data.reply, "bot");
        } catch (err) {
            hideTypingIndicator();
            addMessage("❌ AI Error: Unable to get response.", "bot");
        }
        // =============================================================

    } else if (currentState === "college_chatbot") {
        try {
            const res = await fetch("/college-ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message })
            });
            const data = await res.json();
            hideTypingIndicator();
            addMessage(data.reply, "bot");
        } catch (err) {
            hideTypingIndicator();
            addMessage("❌ Error fetching response. Try again.", "bot");
        }
    }
}

function addMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const msg = document.createElement("div");
    msg.className = `message-container ${sender === "user" ? "justify-content-end" : ""}`;
    msg.innerHTML = `<div class="${sender === "user" ? "user-message" : "bot-message"}">${text}</div>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// ================= SWITCH TO COLLEGE CHATBOT =================
function goBackToStarte() {
    currentState = "ai_assistant";
    document.getElementById("chatMessages").innerHTML = `
        <div class="welcome-screen">
            <h4>Welcome to AI Assistant</h4>
            <p>Hello! I'm your AI assistant. How can I help you?</p>
            <button class="convert-btn" onclick="convertToCollegeChatbot()">Convert to College Chatbot</button>
        </div>
    `;
    document.getElementById("chatTitle").textContent = "AI Assistant";
    document.querySelector('.mic-btn').style.display = 'flex';
    updateBackButton();
}

// ================= SWITCH TO COLLEGE CHATBOT =================
function convertToCollegeChatbot() {
    currentState = "college_login";
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = "";
    addMessage("Welcome to College Chatbot. Please select login type:", "bot");

    const options = document.createElement("div");
    options.className = "message-container";
    options.innerHTML = `
        <div class="bot-message">
            <div class="options-container">
                <button class="option-btn" onclick="showUserLogin()">User Login</button>
                <button class="option-btn" onclick="showAdminLogin()">Admin Login</button>
                <button class="back-btn" onclick="goBackToStarte()">← Back</button>
            </div>
        </div>
    `;
    chatMessages.appendChild(options);
    document.getElementById('chatTitle').textContent = "College Assistant";
    document.querySelector('.mic-btn').style.display = 'none';
    updateBackButton();
}

// ================= USER LOGIN =================
function showUserLogin() {
    currentState = "user_login";
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = "";
    addMessage("Please enter your credentials:", "bot");

    const loginForm = document.createElement("div");
    loginForm.className = "message-container";
    loginForm.innerHTML = `
        <div class="bot-message">
            <div class="login-form">
                <div class="form-group"><label>Email</label><input id="username" type="text" class="form-control"></div>
                <div class="form-group"><label>Password</label><input id="password" type="password" class="form-control"></div>
                <button class="login-submit-btn" onclick="submitUserLogin()">Login</button>
                <button class="back-btn" onclick="convertToCollegeChatbot()">Back</button>
            </div>
        </div>
    `;
    chatMessages.appendChild(loginForm);
    updateBackButton();
}

async function submitUserLogin() {
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (!email || !password) return addMessage("Please fill in all fields", "bot");

    try {
        const res = await fetch("/user_login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            showCollegeChatbot();
        } else {
            addMessage("Invalid credentials. Try again.", "bot");
        }
    } catch (err) {
        addMessage("❌ Login error. Try again.", "bot");
    }
}

// ================= ADMIN LOGIN =================
function showAdminLogin() {
    currentState = "admin_login";
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = "";
    addMessage("Please enter admin credentials:", "bot");

    const loginForm = document.createElement("div");
    loginForm.className = "message-container";
    loginForm.innerHTML = `
        <div class="bot-message">
            <div class="login-form">
                <div class="form-group"><label>Email</label><input id="adminUsername" type="text" class="form-control"></div>
                <div class="form-group"><label>Password</label><input id="adminPassword" type="password" class="form-control"></div>
                <button class="login-submit-btn" onclick="submitAdminLogin()">Login</button>
                <button class="back-btn" onclick="convertToCollegeChatbot()">Back</button>
            </div>
        </div>
    `;
    chatMessages.appendChild(loginForm);
    updateBackButton();
}

async function submitAdminLogin() {
    const email = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    if (!email || !password) return addMessage("Please fill all fields", "bot");

    try {
        const res = await fetch("/admin_login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            closeChatbot();
            window.location.href = "/admin_dashboard";
        } else {
            addMessage("Invalid admin credentials. Try again.", "bot");
        }
    } catch (err) {
        addMessage("❌ Login error. Try again.", "bot");
    }
}

// ================= COLLEGE CHATBOT AFTER LOGIN =================
function showCollegeChatbot() {
    currentState = "college_chatbot";
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = "";
    addMessage("Welcome to College Chatbot! How can I assist you?", "bot");
    updateBackButton();
}

// ================= RESET CHAT =================
function resetChat() {
    currentState = "ai_assistant";
    document.getElementById("chatMessages").innerHTML = `
        <div class="welcome-screen">
            <h4>Welcome to AI Assistant</h4>
            <p>Hello! I'm your AI assistant. How can I help you?</p>
            <button class="convert-btn" onclick="convertToCollegeChatbot()">Convert to College Chatbot</button>
        </div>
    `;
    document.getElementById("chatTitle").textContent = "AI Assistant";
    updateBackButton();
}
function showTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'flex';
        typingIndicator.style.visibility = 'visible';
        const chatMessages = document.getElementById('chatMessages');
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
    }
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
        typingIndicator.style.visibility = 'hidden';
    }
}

// Show/hide header back button based on current state
function updateBackButton() {
    const btn = document.getElementById('chatBack');
    if (!btn) return;
    // hide for main AI assistant
    if (currentState === 'ai_assistant') {
        btn.style.display = 'none';
        return;
    }
    // when on college login options, show back (go to AI assistant)
    if (currentState === 'college_login') {
        btn.style.display = 'flex';
        return;
    }
    // for login forms and college_chatbot, show back to go to college options
    btn.style.display = 'flex';
}

// Example usage when sending a bot message
function sendBotMessage(message) {
    showTypingIndicator();
    setTimeout(() => {
        hideTypingIndicator();
        const chatMessages = document.getElementById('chatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('bot-message');
        msgDiv.textContent = message;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1500); // Adjust typing duration
}

// ================= ADMIN LOGOUT =================
function logoutAdmin() {
    window.location.href = "/";
}

// ================= VOICE CHAT MODE IN CHATBOT =================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isVoiceRecording = false;
let currentVoiceQuestion = '';
let femaleVoice = null;

// Initialize voices and select female voice
function initializeVoices() {
    const voices = speechSynthesis.getVoices();
    console.log('Available voices:', voices.length);
    
    // Try to find female voice
    femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('victoria') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('moira')
    );
    
    // Fallback to any voice with index 1 or 0
    if (!femaleVoice && voices.length > 1) {
        femaleVoice = voices[1];
    } else if (!femaleVoice && voices.length > 0) {
        femaleVoice = voices[0];
    }
    
    console.log('Selected voice:', femaleVoice?.name);
}

// Load voices when they become available
speechSynthesis.onvoiceschanged = initializeVoices;
window.addEventListener('load', initializeVoices);
initializeVoices();

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = function () {
        isVoiceRecording = true;
        document.getElementById('voiceRecordBtn').classList.add('recording');
        document.getElementById('voiceStatus').textContent = '🎤 Listening...';
    };

    recognition.onresult = function (event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        currentVoiceQuestion = transcript.trim();
        document.getElementById('voiceTranscript').textContent = 'You said: ' + currentVoiceQuestion;
        document.getElementById('voiceTranscript').classList.add('show');
    };

    recognition.onerror = function (event) {
        document.getElementById('voiceStatus').textContent = '❌ Error: ' + event.error;
        document.getElementById('voiceRecordBtn').classList.remove('recording');
        isVoiceRecording = false;
    };

    recognition.onend = function () {
        isVoiceRecording = false;
        document.getElementById('voiceRecordBtn').classList.remove('recording');
        
        if (currentVoiceQuestion) {
            document.getElementById('voiceStatus').textContent = '⏳ Processing...';
            sendVoiceQuestion(currentVoiceQuestion);
        } else {
            document.getElementById('voiceStatus').textContent = 'No speech detected. Try again.';
        }
    };
}

function toggleVoiceMode() {
    const voiceMode = document.getElementById('voiceChatMode');
    if (voiceMode.classList.contains('show')) {
        closeVoiceMode();
    } else {
        voiceMode.classList.add('show');
        document.getElementById('voiceTranscript').classList.remove('show');
        document.getElementById('voiceStatus').textContent = 'Click the microphone to speak';
    }
}

function closeVoiceMode() {
    const voiceMode = document.getElementById('voiceChatMode');
    voiceMode.classList.remove('show');
    if (isVoiceRecording && recognition) {
        recognition.stop();
    }
}

function toggleVoiceRecording() {
    if (!recognition) {
        alert('Speech Recognition not supported in this browser. Use Chrome, Edge, or Safari.');
        return;
    }

    if (isVoiceRecording) {
        recognition.stop();
    } else {
        currentVoiceQuestion = '';
        document.getElementById('voiceTranscript').style.display = 'none';
        recognition.start();
    }
}

async function sendVoiceQuestion(question) {
    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: question })
        });

        const data = await response.json();
        const answer = data.reply || 'Sorry, I could not understand your question.';
        
        // Add messages to chat history
        addMessage(question, 'user');
        addMessage(answer, 'bot');
        
        // Show answer and speak it automatically (stay in voice mode)
        document.getElementById('voiceStatus').textContent = '✅ Got response. Speaking...';
        
        // Automatically speak the answer
        speakVoiceAnswer(answer);
    } catch (error) {
        document.getElementById('voiceStatus').textContent = '❌ Error: ' + error.message;
        addMessage('Error: Unable to get response from server.', 'bot');
    }
}

function speakVoiceAnswer(text) {
    if (!window.SpeechSynthesisUtterance) {
        alert('Text-to-speech not available');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1.5;
    utterance.volume = 1;
    
    // Use the pre-loaded female voice
    if (femaleVoice) {
        utterance.voice = femaleVoice;
    }
    
    utterance.onend = function () {
        document.getElementById('voiceStatus').textContent = '🎤 Ready for next question. Click mic to continue.';
        isVoiceRecording = false;
        document.getElementById('voiceRecordBtn').classList.remove('recording');
    };
    
    speechSynthesis.speak(utterance);
}

// Open voice chat mode in chatbot
function goToVoiceChat() {
    toggleVoiceMode();
}

// Default
closeChatbot();

// Main application logic
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize modules
    await Storage.init();
    await OllamaAPI.init();
    Voice.init();
    FileReader.init();
    setInterval(rotatePlaceholder, 3000);
    setupInputCounter();
    
    // Load saved theme
    loadTheme();
    
    // Load chat history
    loadChatHistorySelector();
    
    // Load model selector
    loadModelSelector();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check Ollama connection
    checkOllamaConnection();
    
    // Create a new chat by default
    newChat();
});

// Theme management
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (savedTheme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (newTheme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Model selector
async function loadModelSelector() {
    const modelSelector = document.getElementById('model-selector');
    const savedModel = localStorage.getItem('selectedModel') || 'llama3';
    
    try {
        const models = await OllamaAPI.listModels();
        modelSelector.innerHTML = '';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelector.appendChild(option);
        });
        
        modelSelector.value = savedModel;
    } catch (error) {
        console.error('Failed to load models:', error);
        modelSelector.value = savedModel;
    }
}

// Smart Placeholder Rotation
const placeholders = [
  "Ask me anything...",
  "How can I help?",
  "Type your query...",
  "Pro tip: Try voice input! 🎤"
];
let currentPlaceholder = 0;

function rotatePlaceholder() {
  const messageInput = document.getElementById('message-input');
  messageInput.placeholder = placeholders[currentPlaceholder];
  currentPlaceholder = (currentPlaceholder + 1) % placeholders.length;
}

// Character Counter
function setupInputCounter() {
  const messageInput = document.getElementById('message-input');
  const charCount = document.getElementById('char-count');
  
  messageInput.addEventListener('input', () => {
    charCount.textContent = messageInput.value.length;
  });
}

function saveSelectedModel(model) {
    localStorage.setItem('selectedModel', model);
}

// Chat history management
let currentChatId = null;

// Notification Badges
let isWindowFocused = true;

window.addEventListener('blur', () => isWindowFocused = false);
window.addEventListener('focus', () => isWindowFocused = true);

function notifyNewMessage() {
  if (!isWindowFocused) {
    const originalTitle = document.title;
    let flashCount = 0;
    
    const flashInterval = setInterval(() => {
      document.title = flashCount % 2 === 0 
        ? "✨ New message!" 
        : originalTitle;
      
      flashCount++;
      
      if (flashCount > 6) {
        clearInterval(flashInterval);
        document.title = originalTitle;
      }
    }, 500);
  }
}

async function loadChatHistorySelector() {
    const selector = document.getElementById('chat-history-selector');
    selector.innerHTML = '<option value="">New Chat</option>';
    
    const chats = await Storage.getAllChats();
    chats.forEach(chat => {
        const option = document.createElement('option');
        option.value = chat.id;
        option.textContent = chat.name || `Chat ${new Date(chat.createdAt).toLocaleString()}`;
        selector.appendChild(option);
    });
}

async function newChat() {
    currentChatId = null;
    document.getElementById('chat-history').innerHTML = '';
    document.getElementById('chat-history-selector').value = '';
}

async function loadChat(chatId) {
    const chat = await Storage.getChat(chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML = '';
    
    chat.messages.forEach(message => {
        addMessageToChat(message.role, message.content, message.timestamp, false);
    });
    
    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Message handling
function addMessageToChat(role, content, timestamp = new Date().toISOString(), saveToStorage = true) {
    const chatHistory = document.getElementById('chat-history');
    
    // Remove typing indicator if present
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) typingIndicator.remove();
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    // Format content with line breaks and code blocks
    const formattedContent = formatMessageContent(content);
    
    messageDiv.innerHTML = `
        <div class="message-content">${formattedContent}</div>
        <span class="message-timestamp">${new Date(timestamp).toLocaleString()}</span>
        <button class="message-edit" aria-label="Edit message"><i class="fas fa-edit"></i></button>
    `;
    
    // Add reactions for AI messages
    if (role === 'ai') {
        messageDiv.innerHTML += `
            <div class="reactions">
                <button class="reaction-btn">👍</button>
                <button class="reaction-btn">👎</button>
                <button class="reaction-btn">🔁</button>
            </div>
        `;
        
        messageDiv.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                btn.classList.toggle('active');
            });
        });
        
        notifyNewMessage();
    }
    
    // Add edit functionality
    const editButton = messageDiv.querySelector('.message-edit');
    editButton.addEventListener('click', () => editMessage(messageDiv, role, content, timestamp));
    
    chatHistory.appendChild(messageDiv);
    
    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Save to storage if needed
    if (saveToStorage && currentChatId) {
        Storage.addMessageToChat(currentChatId, role, content, timestamp);
    }
}

function formatMessageContent(content) {
    // Convert markdown code blocks to HTML
    let formatted = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, language, code) => {
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });
    
    // Convert inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Convert bold and italic
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

function editMessage(messageDiv, role, originalContent, originalTimestamp) {
    const contentDiv = messageDiv.querySelector('.message-content');
    const currentContent = contentDiv.textContent;
    
    const textarea = document.createElement('textarea');
    textarea.value = currentContent;
    textarea.rows = Math.min(10, currentContent.split('\n').length + 1);
    
    contentDiv.replaceWith(textarea);
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'save-edit-button';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'cancel-edit-button';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'edit-buttons';
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    
    messageDiv.appendChild(buttonContainer);
    
    saveButton.addEventListener('click', () => {
        const newContent = textarea.value;
        contentDiv.textContent = newContent;
        textarea.replaceWith(contentDiv);
        buttonContainer.remove();
        
        // Update in storage
        if (currentChatId) {
            Storage.updateMessage(currentChatId, originalTimestamp, newContent);
        }
    });
    
    cancelButton.addEventListener('click', () => {
        contentDiv.textContent = originalContent;
        textarea.replaceWith(contentDiv);
        buttonContainer.remove();
    });
}

function showTypingIndicator() {
    const chatHistory = document.getElementById('chat-history');
    
    // Remove existing typing indicator if present
    const existingIndicator = document.querySelector('.typing-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator ai-message';
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Event listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Model selector
    document.getElementById('model-selector').addEventListener('change', (e) => {
        saveSelectedModel(e.target.value);
    });
    
    // Chat history selector
    document.getElementById('chat-history-selector').addEventListener('change', (e) => {
        if (e.target.value === '') {
            newChat();
        } else {
            loadChat(e.target.value);
        }
    });
    
    // Message input
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
        
        // Auto-resize textarea
        messageInput.style.height = 'auto';
        messageInput.style.height = `${messageInput.scrollHeight}px`;
    });
    
    sendButton.addEventListener('click', sendMessage);
    
    // Export chat
    document.getElementById('export-chat').addEventListener('click', exportChat);
}

async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    if (!message) return;

    // UI State: Disable send button
    const sendButton = document.getElementById('send-button');
    const voiceButton = document.getElementById('voice-button');
    sendButton.disabled = true;
    voiceButton.disabled = true;
    messageInput.disabled = true;

    // Add user message to chat
    addMessageToChat('user', message);
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Create temporary AI message container
    const chatHistory = document.getElementById('chat-history');
    const tempMessageDiv = document.createElement('div');
    tempMessageDiv.className = 'message ai-message';
    
    // Add progress bar to temp message
    tempMessageDiv.innerHTML = `
        <div class="message-content"></div>
        <div class="progress-bar"><div class="progress"></div></div>
        <span class="message-timestamp">${new Date().toLocaleString()}</span>
        <button class="message-edit" aria-label="Edit message"><i class="fas fa-edit"></i></button>
    `;
    
    chatHistory.appendChild(tempMessageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        // Get context from documents (your existing logic)
        const documents = await Storage.getDocuments();
        let context = '';
        
        if (documents.length > 0) {
            const relevantDocs = documents.filter(doc => 
                doc.text.toLowerCase().includes(message.toLowerCase()) || 
                message.toLowerCase().includes(doc.name.toLowerCase())
            );
            
            if (relevantDocs.length > 0) {
                context = '\n\nContext from documents:\n';
                relevantDocs.forEach(doc => {
                    const startIndex = Math.max(0, doc.text.toLowerCase().indexOf(message.toLowerCase()) - 50);
                    const endIndex = Math.min(doc.text.length, startIndex + 200);
                    const snippet = doc.text.slice(startIndex, endIndex);
                    
                    context += `\nDocument: ${doc.name}\n`;
                    context += `Relevant section: ${snippet}\n`;
                });
            }
        }

        // Get selected model
        const model = document.getElementById('model-selector').value;
        const fullPrompt = `${message}${context}`;

        // Stream the response
        let fullResponse = '';
        await OllamaAPI.generateResponse(model, fullPrompt, (partialResponse) => {
            fullResponse = partialResponse;
            tempMessageDiv.querySelector('.message-content').innerHTML = 
                formatMessageContent(fullResponse);
            
            // Auto-scroll if near bottom
            const isNearBottom = chatHistory.scrollHeight - chatHistory.clientHeight <= chatHistory.scrollTop + 100;
            if (isNearBottom) {
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
        });

        // Replace temp div with final message (makes it editable)
        tempMessageDiv.outerHTML = `
            <div class="message ai-message">
                <div class="message-content">${formatMessageContent(fullResponse)}</div>
                <span class="message-timestamp">${new Date().toLocaleString()}</span>
                <button class="message-edit" aria-label="Edit message"><i class="fas fa-edit"></i></button>
            </div>
        `;

        // Save to storage
        if (!currentChatId) {
            currentChatId = await Storage.createChat();
            loadChatHistorySelector();
        }
        await Storage.addMessageToChat(currentChatId, 'ai', fullResponse);

    } catch (error) {
        // Error handling
        console.error('Error generating response:', error);
        
        // Remove temp message if error occurs
        tempMessageDiv.remove();
        
        // Show error message with retry button
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message ai-message error-message';
        errorDiv.innerHTML = `
            <div class="message-content">
                Failed to generate response. 
                <button class="retry-button">Retry</button>
            </div>
        `;
        chatHistory.appendChild(errorDiv);
        
        errorDiv.querySelector('.retry-button').addEventListener('click', sendMessage);
    } finally {
        // Re-enable UI
        sendButton.disabled = false;
        voiceButton.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

async function checkOllamaConnection() {
    try {
        await OllamaAPI.listModels();
        document.getElementById('ollama-status').textContent = 'Connected';
        document.getElementById('ollama-status').style.color = 'var(--success)';
    } catch (error) {
        console.error('Ollama connection error:', error);
        document.getElementById('ollama-status').textContent = 'Disconnected';
        document.getElementById('ollama-status').style.color = 'var(--error)';
    }
}

async function exportChat() {
    if (!currentChatId) {
        alert('No chat to export');
        return;
    }
    
    const chat = await Storage.getChat(currentChatId);
    if (!chat || chat.messages.length === 0) {
        alert('No messages to export');
        return;
    }
    
    // Create markdown content
    let markdown = `# Chat Export\n\n`;
    markdown += `**Date:** ${new Date(chat.createdAt).toLocaleString()}\n`;
    markdown += `**Model:** ${document.getElementById('model-selector').value}\n\n`;
    
    chat.messages.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'Atlas AI';
        markdown += `**${role}** (${new Date(msg.timestamp).toLocaleTimeString()}):\n`;
        markdown += `${msg.content}\n\n`;
    });
    
    // Create a blob and download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Atlas-Chat-${new Date(chat.createdAt).toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // TODO: Add PDF export option
    alert('Markdown exported successfully!');
}
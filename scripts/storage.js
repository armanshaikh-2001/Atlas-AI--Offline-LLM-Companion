// IndexedDB storage module
const Storage = {
    db: null,
    dbName: 'AtlasAIDB',
    dbVersion: 1,
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database initialized');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create chats store
                if (!db.objectStoreNames.contains('chats')) {
                    const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
                    chatsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // Create messages store
                if (!db.objectStoreNames.contains('messages')) {
                    const messagesStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                    messagesStore.createIndex('chatId', 'chatId', { unique: false });
                    messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // Create documents store
                if (!db.objectStoreNames.contains('documents')) {
                    const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });
                    documentsStore.createIndex('name', 'name', { unique: false });
                    documentsStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
                }
            };
        });
    },
    
    async createChat(name = '') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chats'], 'readwrite');
            const store = transaction.objectStore('chats');
            
            const chat = {
                id: crypto.randomUUID(),
                name: name || `Chat ${new Date().toLocaleString()}`,
                createdAt: new Date().toISOString(),
                model: document.getElementById('model-selector').value
            };
            
            const request = store.add(chat);
            
            request.onsuccess = () => {
                resolve(chat.id);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    async getAllChats() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chats'], 'readonly');
            const store = transaction.objectStore('chats');
            const index = store.index('createdAt');
            const request = index.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    async getChat(chatId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chats', 'messages'], 'readonly');
            const chatsStore = transaction.objectStore('chats');
            const messagesStore = transaction.objectStore('messages');
            
            const chatRequest = chatsStore.get(chatId);
            const messagesRequest = messagesStore.index('chatId').getAll(chatId);
            
            let chat = null;
            let messages = [];
            
            chatRequest.onsuccess = () => {
                chat = chatRequest.result;
                
                if (!chat) {
                    resolve(null);
                }
            };
            
            messagesRequest.onsuccess = () => {
                messages = messagesRequest.result || [];
                
                if (chat) {
                    chat.messages = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    resolve(chat);
                }
            };
            
            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    async addMessageToChat(chatId, role, content, timestamp = new Date().toISOString()) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            
            const message = {
                chatId,
                role,
                content,
                timestamp
            };
            
            const request = store.add(message);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    async updateMessage(chatId, originalTimestamp, newContent) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const index = store.index('chatId');
            
            const request = index.openCursor(IDBKeyRange.only(chatId));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.timestamp === originalTimestamp) {
                        const updateData = cursor.value;
                        updateData.content = newContent;
                        
                        const updateRequest = cursor.update(updateData);
                        updateRequest.onsuccess = () => resolve();
                        updateRequest.onerror = (e) => reject(e.target.error);
                        return;
                    }
                    cursor.continue();
                } else {
                    resolve(); // Message not found
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    async addDocument(name, text, file) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readwrite');
            const store = transaction.objectStore('documents');
            
            const document = {
                id: crypto.randomUUID(),
                name,
                text,
                file,
                uploadedAt: new Date().toISOString()
            };
            
            const request = store.add(document);
            
            request.onsuccess = () => {
                resolve(document.id);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    async getDocuments() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readonly');
            const store = transaction.objectStore('documents');
            const index = store.index('uploadedAt');
            const request = index.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    async deleteDocument(documentId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readwrite');
            const store = transaction.objectStore('documents');
            
            const request = store.delete(documentId);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
};
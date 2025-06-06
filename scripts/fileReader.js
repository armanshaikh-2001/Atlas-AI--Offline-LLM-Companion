// File reader and document processing module
const FileReader = {
    init() {
        this.setupEventListeners();
        this.loadDocuments();
    },
    
    async setupEventListeners() {
        const fileInput = document.getElementById('file-input');
        const filePreview = document.getElementById('file-preview');
        const documentsList = document.getElementById('documents-list');
        
        fileInput.addEventListener('change', async (event) => {
            const files = Array.from(event.target.files);
            
            for (const file of files) {
                await this.processFile(file);
            }
            
            // Reset input to allow selecting same files again
            fileInput.value = '';
        });
        
        // Handle drag and drop
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            document.body.classList.add('dragover');
        });
        
        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            document.body.classList.remove('dragover');
        });
        
        document.addEventListener('drop', async (e) => {
            e.preventDefault();
            document.body.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type === 'application/pdf' || 
                file.type === 'text/plain' ||
                file.name.endsWith('.pdf') || 
                file.name.endsWith('.txt')
            );
            
            for (const file of files) {
                await this.processFile(file);
            }
        });
    },
    
    async processFile(file) {
        try {
            let text = '';
            const fileName = file.name;
            
            if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
                text = await this.extractTextFromPDF(file);
            } else if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
                text = await this.readTextFile(file);
            } else {
                throw new Error('Unsupported file type');
            }
            
            // Simple summarization - first 200 chars
            const summary = text.length > 200 ? text.substring(0, 200) + '...' : text;
            
            // Add to storage
            const docId = await Storage.addDocument(fileName, text, file);
            
            // Update UI
            this.addDocumentToUI(docId, fileName, summary);
            this.addFilePreview(fileName);
            
            console.log(`Processed file: ${fileName}`);
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            alert(`Error processing ${file.name}: ${error.message}`);
        }
    },
    
    async extractTextFromPDF(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            
            fileReader.onload = async (event) => {
                try {
                    const typedArray = new Uint8Array(event.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    let text = '';
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const strings = content.items.map(item => item.str);
                        text += strings.join(' ') + '\n';
                    }
                    
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };
            
            fileReader.onerror = (error) => {
                reject(error);
            };
            
            fileReader.readAsArrayBuffer(file);
        });
    },
    
    async readTextFile(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            
            fileReader.onload = (event) => {
                resolve(event.target.result);
            };
            
            fileReader.onerror = (error) => {
                reject(error);
            };
            
            fileReader.readAsText(file);
        });
    },
    
    addFilePreview(fileName) {
        const filePreview = document.getElementById('file-preview');
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <span>${fileName}</span>
            <button aria-label="Remove file"><i class="fas fa-times"></i></button>
        `;
        
        fileCard.querySelector('button').addEventListener('click', () => {
            fileCard.remove();
        });
        
        filePreview.appendChild(fileCard);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (fileCard.parentNode) {
                fileCard.remove();
            }
        }, 5000);
    },
    
    async loadDocuments() {
        try {
            const documents = await Storage.getDocuments();
            const documentsList = document.getElementById('documents-list');
            documentsList.innerHTML = '';
            
            documents.forEach(doc => {
                this.addDocumentToUI(doc.id, doc.name, doc.text.substring(0, 100) + '...');
            });
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    },
    
    addDocumentToUI(docId, name, summary) {
        const documentsList = document.getElementById('documents-list');
        const docElement = document.createElement('div');
        docElement.className = 'document-item';
        docElement.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <div>
                <strong>${name}</strong>
                <p>${summary}</p>
            </div>
            <button aria-label="Delete document"><i class="fas fa-trash"></i></button>
        `;
        
        docElement.querySelector('button').addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await Storage.deleteDocument(docId);
                docElement.remove();
            } catch (error) {
                console.error('Error deleting document:', error);
                alert('Failed to delete document');
            }
        });
        
        documentsList.appendChild(docElement);
    }
};
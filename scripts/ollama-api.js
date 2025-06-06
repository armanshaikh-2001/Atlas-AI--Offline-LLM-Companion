// Ollama API interface
const OllamaAPI = {
    baseUrl: 'http://localhost:11434/api',
    
    async init() {
        // Check connection
        try {
            await this.listModels();
            console.log('Ollama connection successful');
        } catch (error) {
            console.error('Ollama connection failed:', error);
            document.getElementById('model-status').textContent = 'Disconnected';
            document.getElementById('model-status').style.backgroundColor = 'var(--error)';
        }
    },
    
    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/tags`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching models:', error);
            // Return default models if API fails
            return [
                { name: 'llama3' },
                { name: 'mistral' },
                { name: 'gemma' }
            ];
        }
    },
    
    async generateResponse(model, prompt) {
        const response = await fetch(`${this.baseUrl}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                prompt,
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response;
    },
    
    // In ollama-api.js
				async generateResponse(model, prompt, onToken) {
				  try {
				    const response = await fetch(`${this.baseUrl}/generate`, {
				      method: 'POST',
				      headers: { 'Content-Type': 'application/json' },
				      body: JSON.stringify({
				        model,
				        prompt,
				        stream: true  // Enable streaming
				      })
				    });

				    if (!response.ok) {
				      throw new Error(`Ollama error: ${response.status}`);
				    }

				    const reader = response.body.getReader();
				    const decoder = new TextDecoder();
				    let fullResponse = '';

				    while (true) {
				      const { done, value } = await reader.read();
				      if (done) break;
				      
				      const chunk = decoder.decode(value);
				      const lines = chunk.split('\n').filter(line => line.trim());
				      
				      for (const line of lines) {
				        try {
				          const parsed = JSON.parse(line);
				          if (parsed.response) {
				            fullResponse += parsed.response;
				            onToken(fullResponse); // Send updates
				          }
				        } catch (e) {
				          console.error('Failed to parse chunk:', e);
				        }
				      }
				    }
				    
				    return fullResponse;
				  } catch (error) {
				    console.error('Generation failed:', error);
				    throw error; // Rethrow for error handling in app.js
				  }
				}
            }
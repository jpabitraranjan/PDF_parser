import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);

  
  const messagesEndRef = useRef(null);

  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  
  useEffect(() => {
    if (selectedFile) {
      handleUpload();
    }
  }, [selectedFile]);

  
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadedFileName(file.name);
      setError('');
      setIsPdfLoaded(false);
      setMessages([]);
      setQuestion('');
    }
  };

  
  const handleUpload = async () => {
    if (!selectedFile || loading) {
      return;
    }

    setLoading(true);
    setError('');
    setMessages((prevMessages) => [...prevMessages, { sender: 'system', text: `Processing document: "${selectedFile.name}"...` }]);
    setIsPdfLoaded(false);

    const formData = new FormData(); 
    formData.append('file', selectedFile); 

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload PDF.');
      }

      setIsPdfLoaded(true);
      setMessages((prevMessages) => prevMessages.filter(msg => !msg.text.includes("Processing document"))
        .concat({ sender: 'system', text: `Document "${selectedFile.name}" uploaded and processed successfully! You can now ask questions.` }));
    } catch (err) {
      setError(`Upload error: ${err.message}`);
      setIsPdfLoaded(false);
      setUploadedFileName('');
      setMessages((prevMessages) => prevMessages.filter(msg => !msg.text.includes("Processing document"))
        .concat({ sender: 'error', text: `Error uploading "${selectedFile?.name || 'file'}": ${err.message}. Please try again.` }));
    } finally {
      setLoading(false); 
    }
  };

  const handleAskQuestion = async (event) => {
    event.preventDefault();

    if (!isPdfLoaded) {
      setError('Please upload a PDF document before asking questions.');
      return;
    }
    if (!question.trim()) {
      setError('Please enter a question.');
      return;
    }

    setLoading(true);
    setError(''); 

    const newUserMessage = { sender: 'user', text: question };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setQuestion('');

    const formData = new FormData();
    formData.append('question', newUserMessage.text);

    try {
      const response = await fetch('/ask', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get answer.');
      }

      const data = await response.json();
      const llmAnswer = data.answer || "I couldn't find an answer for that in the document.";
      setMessages((prevMessages) => [...prevMessages, { sender: 'ai', text: llmAnswer }]); 
    } catch (err) {
      setError(`Question error: ${err.message}`);
      setMessages((prevMessages) => [...prevMessages, { sender: 'error', text: `Error answering question: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="top-bar">
        <div className="logo-placeholder">
          <img src="/logo.PNG" alt="App Logo" className="logo-img" />
        </div>
        <div className="upload-section">
          <input
            type="file"
            id="pdf-upload"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {selectedFile && (
            <span className={`file-name ${isPdfLoaded ? 'uploaded' : ''} ${loading ? 'processing' : ''}`}>
              {loading ? `Processing: ${uploadedFileName}...` : `${uploadedFileName} ${isPdfLoaded ? '✓' : ''}`}
            </span>
          )}
          <label htmlFor="pdf-upload" className="upload-button" tabIndex="0" role="button">
            Upload PDF
          </label>
        </div>
      </header>

      {/* Main chat display area */}
      <main className="chat-container"> {/* This will be the scrollable area */}
        <div className="messages-area">
          {messages.length === 0 && (
            <div className="welcome-message">
              <p>Upload a PDF to start asking questions about its content.</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.sender}`}>
              {msg.sender === 'ai' || msg.sender === 'system' || msg.sender === 'error' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              ) : (
                <p>{msg.text}</p>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* This error display can remain as an overlay or be integrated into chat */}
        {error && <p style={{ color: 'red', position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>{error}</p>}

        {/* Input form fixed at the bottom */}
        <form onSubmit={handleAskQuestion} className="message-input-form">
          {/* --- NEW WRAPPER DIV FOR INPUT AND BUTTON --- */}
          <div className="input-button-wrapper">
            <input
              type="text"
              placeholder={isPdfLoaded ? "Send a message..." : "Upload a PDF to enable chat..."}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading || !isPdfLoaded}
              className="message-input"
            />
            <button type="submit" disabled={loading || !isPdfLoaded || !question.trim()} className="send-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send-horizontal">
                <path d="m3 3 3 9-3 9 19-9Z"/><path d="M14 5l6 6"/>
              </svg>
            </button>
          </div>
        </form>
      </main> {/* Closing tag for chat-container */}
    </div>
  );
}

export default App;
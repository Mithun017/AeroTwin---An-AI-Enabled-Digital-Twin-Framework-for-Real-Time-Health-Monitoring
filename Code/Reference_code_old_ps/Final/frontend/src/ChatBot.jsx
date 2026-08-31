import { useState, useEffect, useRef } from 'react'

const API_BASE = 'http://localhost:8000'

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: 'Hello! I am your AeroTwin AI Advisor powered by local Ollama Qwen 3 4B. How can I help you with your Aero Piston Engine diagnostics today?', source: 'system' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState('unknown') // 'online' | 'offline' | 'unknown'
  const scrollRef = useRef(null)

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory, isLoading])

  // Ping backend health on open
  useEffect(() => {
    if (!isOpen) return
    fetch(`${API_BASE}/api/health`)
      .then(r => r.ok ? setBackendStatus('online') : setBackendStatus('offline'))
      .catch(() => setBackendStatus('offline'))
  }, [isOpen])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const userMsg = { role: 'user', content: message }
    setChatHistory(prev => [...prev, userMsg])
    const sentMessage = message
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: sentMessage,
          history: chatHistory.filter(m => m.role !== 'system'),
          session_id: window.sessionId || 'default',
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 100)}`)
      }

      const data = await response.json()
      const isFallback = data.source === 'fallback' || data.source === 'offline_fallback'
      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          source: data.source || 'api',
          isFallback,
          apiError: data.api_error,
        }
      ])
    } catch (err) {
      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Could not reach the backend. Make sure the server is running at ${API_BASE}.\n\nError: ${err.message}`,
          source: 'error',
          isFallback: true,
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`chatbot-wrapper ${isOpen ? 'open' : ''}`}>
      <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)} title="AI Advisor">
        {isOpen ? '×' : '💬'}
      </button>

      <div className="chatbot-window card">
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-icon">🤖</div>
            <div>
              <h3>AI Advisor</h3>
              <p>Ollama · Qwen 3 4B · Aero Engine</p>
            </div>
          </div>
          <div className="chatbot-status">
            <span
              className="chat-status-dot"
              style={{
                background: backendStatus === 'online'
                  ? 'var(--accent-emerald)'
                  : backendStatus === 'offline'
                    ? 'var(--accent-red)'
                    : 'var(--accent-yellow)',
              }}
            />
            {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Connecting…'}
          </div>
        </div>

        <div className="chatbot-messages" ref={scrollRef}>
          {chatHistory.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className={`message-bubble ${msg.isFallback ? 'fallback-bubble' : ''}`}>
                {msg.content}
                {msg.source === 'groq' && (
                  <div className="groq-badge">⚡ Groq · LLaMA 3.3</div>
                )}
                {msg.source === 'ollama' && (
                  <div className="groq-badge" style={{ background: 'linear-gradient(135deg, var(--accent-yellow) 0%, #ff9800 100%)', color: '#000', fontWeight: 'bold' }}>🦙 Ollama · Qwen 3 4B</div>
                )}
                {msg.isFallback && msg.source !== 'system' && (
                  <div className="fallback-badge">📡 Offline mode</div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="message-bubble loading">
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick suggestion chips */}
        {chatHistory.length <= 1 && !isLoading && (
          <div className="chat-suggestions">
            {['What are the 6 leak zones?', 'Explain Energy Field', 'Current sensor status'].map(q => (
              <button
                key={q}
                className="chat-chip"
                onClick={() => {
                  setMessage(q)
                  // Submit programmatically via timeout so state is set
                  setTimeout(() => {
                    document.querySelector('.chatbot-input button[type="submit"]')?.click()
                  }, 50)
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form className="chatbot-input" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Ask about sensors, leaks, zones…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !message.trim()}>🚀</button>
        </form>
      </div>
    </div>
  )
}

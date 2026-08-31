// ChatBot.jsx — Floating AI Copilot Engine Advisor
import { useState, useEffect, useRef } from 'react'
import { BrainIcon } from './Icons'

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content: 'AeroTwin AI Diagnostic Copilot active. How can I assist with your engine health analysis today?'
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory, isLoading])

  async function handleSend(customMsg) {
    const textToSend = customMsg || message
    if (!textToSend.trim() || isLoading) return

    const userMsg = { role: 'user', content: textToSend }
    setChatHistory(prev => [...prev, userMsg])
    if (!customMsg) setMessage('')
    setIsLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      })
      const data = await res.json()
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: data.response || 'Telemetry analyzed.' }
      ])
    } catch (e) {
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: 'Connection offline — could not reach AeroTwin backend server.' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 120 }}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: 52, height: 52, borderRadius: 26,
            background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
            border: 'none', color: '#fff', cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s',
          }}
          title="Open AI Engine Copilot"
        >
          <BrainIcon size={24} color="#fff" />
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div style={{
          width: 360, height: 480, background: '#0f172a',
          border: '1px solid #1e293b', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', background: '#0b1329', borderBottom: '1px solid #1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#38bdf820', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainIcon size={16} color="#38bdf8" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>AeroTwin Copilot</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>AI Engine Diagnostic Advisor</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Chat Messages */}
          <div ref={scrollRef} style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatHistory.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%', padding: '10px 12px', borderRadius: 10,
                  fontSize: 12, lineHeight: 1.4,
                  background: m.role === 'user' ? '#2563eb' : '#1e293b',
                  color: m.role === 'user' ? '#fff' : '#cbd5e1',
                  border: m.role === 'user' ? 'none' : '1px solid #334155',
                }}
              >
                {m.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: '#1e293b', borderRadius: 10, fontSize: 11, color: '#38bdf8' }}>
                Analyzing engine telemetry…
              </div>
            )}
          </div>

          {/* Quick Suggestions */}
          <div style={{ padding: '6px 10px', background: '#0b1329', borderTop: '1px solid #1e293b', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {['Current engine health', 'Explain EGT rise', 'Misfire diagnostic'].map(q => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                style={{
                  whiteSpace: 'nowrap', padding: '4px 8px', borderRadius: 6,
                  background: '#1e293b', border: '1px solid #334155',
                  color: '#94a3b8', fontSize: 10, cursor: 'pointer',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ padding: 10, background: '#0b1329', borderTop: '1px solid #1e293b', display: 'flex', gap: 8 }}
          >
            <input
              type="text"
              placeholder="Ask Copilot about engine health..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{
                flex: 1, background: '#1e293b', border: '1px solid #334155',
                borderRadius: 8, padding: '8px 12px', color: '#f8fafc', fontSize: 12, outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              style={{
                padding: '8px 14px', borderRadius: 8, background: '#38bdf8',
                border: 'none', color: '#0f172a', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

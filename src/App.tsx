import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

const sampleResponses = [
  "That's a great question! Let me think about this...\n\nBased on my understanding, I'd say the key factors to consider are context, clarity, and creativity. Each of these plays an important role in how we approach problems and communicate ideas.\n\nWould you like me to elaborate on any specific aspect?",
  "I'd be happy to help with that! Here's what I think:\n\nThe approach you're describing is quite common and there are several ways to tackle it. The most effective method usually depends on your specific use case and constraints.\n\nLet me know if you'd like more detailed guidance on any particular step.",
  "Interesting thought! Here's my perspective:\n\nThere are multiple angles to consider here. The most important thing is to balance efficiency with quality. In practice, this means starting with a clear goal and iterating based on feedback.\n\nIs there a specific part you'd like to dive deeper into?",
  "Great question! Let me break this down:\n\n1. **First**, consider the fundamentals - understanding the basics is crucial\n2. **Second**, look at real-world examples to see how theory applies in practice\n3. **Third**, experiment and iterate - learning by doing is often the most effective approach\n\nWould you like me to go into more detail on any of these points?",
  "I appreciate you asking! Here's what I know:\n\nThis is a topic that has evolved significantly over time. The current best practices emphasize adaptability and continuous learning. The landscape is always changing, so staying up-to-date is important.\n\nFeel free to ask follow-up questions if you'd like more specifics!",
]

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentConversation = conversations.find(c => c.id === activeConversation)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConversation?.messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date()
    }
    setConversations(prev => [newConv, ...prev])
    setActiveConversation(newConv.id)
    return newConv.id
  }

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return

    let convId = activeConversation
    if (!convId) {
      convId = createNewConversation()
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        const updatedMessages = [...c.messages, userMessage]
        return {
          ...c,
          messages: updatedMessages,
          title: c.messages.length === 0 ? input.trim().slice(0, 40) + (input.trim().length > 40 ? '...' : '') : c.title
        }
      }
      return c
    }))

    setInput('')
    setIsTyping(true)

    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: sampleResponses[Math.floor(Math.random() * sampleResponses.length)],
      timestamp: new Date()
    }

    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return { ...c, messages: [...c.messages, aiResponse] }
      }
      return c
    }))

    setIsTyping(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConversation === id) {
      setActiveConversation(null)
    }
  }

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-white overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-[#1a1a1a] border-r border-gray-800 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-200 text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                activeConversation === conv.id
                  ? 'bg-gray-700/50 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="flex-1 text-sm truncate">{conv.title}</span>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
              U
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">User</p>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#0d0d0d]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-violet-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold">Qwen</h1>
                <p className="text-xs text-gray-500">General Assistant</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
              ● Online
            </span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!currentConversation || currentConversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-blue-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                <span className="text-white font-bold text-3xl">Q</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                How can I help you today?
              </h2>
              <p className="text-gray-500 text-center max-w-md mb-8">
                I'm Qwen, your AI assistant. Ask me anything — from creative writing to code, analysis to advice.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  { icon: '💡', text: 'Explain quantum computing simply' },
                  { icon: '✍️', text: 'Help me write a creative story' },
                  { icon: '🔍', text: 'Analyze the pros and cons of...' },
                  { icon: '💻', text: 'Debug my code and explain why' },
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion.text)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-purple-500/40 hover:bg-gray-800/50 transition-all duration-200 text-left group"
                  >
                    <span className="text-xl">{suggestion.icon}</span>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {currentConversation.messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white font-bold text-xs">Q</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-purple-600/20 border border-purple-500/30 rounded-2xl rounded-tr-sm px-4 py-3'
                      : 'bg-gray-800/50 border border-gray-700/50 rounded-2xl rounded-tl-sm px-4 py-3'
                  }`}>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content.split('**').map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-purple-300">{part}</strong> : <span key={i}>{part}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white font-bold text-xs">U</span>
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-xs">Q</span>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 p-4 bg-[#0d0d0d]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 focus-within:border-purple-500/50 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Qwen..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none max-h-[200px]"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  input.trim() && !isTyping
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-600 text-center mt-2">
              Qwen can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

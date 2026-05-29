import React, { useState, useEffect, useRef, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlobalStateContext } from '../context/GlobalStateContext'
import './CSS/Voice.css'

const VoiceAssistant = () => {
  const { setTogg, Togg, foodData, updateQuantity, logout } = useContext(GlobalStateContext)
  const navigate = useNavigate()
  
  const [assistantResponse, setAssistantResponse] = useState('How can I help you?')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [permissionError, setPermissionError] = useState(false)
  
  const recognitionRef = useRef(null)

  // ── Browser Compatibility Check ──
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const isBrowserSupported = typeof SpeechRecognition !== 'undefined'

  // ── Text-to-Speech Synthesis ──
  const speakResponse = useCallback((text) => {
    if (!window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel() // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.05
      utterance.pitch = 1.0
      
      // Select an English voice if available
      const voices = window.speechSynthesis.getVoices()
      const englishVoice = voices.find(v => v.lang.startsWith('en-'))
      if (englishVoice) {
        utterance.voice = englishVoice
      }
      
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.error('Speech synthesis error:', err)
    }
  }, [])

  // ── Action Handlers for AI commands ──
  const handleCommand = useCallback(async (aiData) => {
    const { command, page, category, item_id, quantity, response } = aiData
    
    if (response) {
      setAssistantResponse(response)
      speakResponse(response)
    }

    switch (command) {
      case 'NAVIGATE':
        if (page === 'checkout') {
          // If we navigate to checkout, let's navigate to cart page and automatically trigger checkout
          const itemsInCart = foodData.filter(i => i.Quantity > 0)
          navigate('/payment', { state: { cartItems: itemsInCart, total: itemsInCart.reduce((s, i) => s + i.Price * i.Quantity, 0) } })
        } else if (page === 'menu' || page === 'items') {
          navigate('/')
          setTimeout(() => {
            document.getElementById('items')?.scrollIntoView({ behavior: 'smooth' })
          }, 300)
        } else if (page) {
          navigate(page === 'home' ? '/' : `/${page}`)
        }
        break;

      case 'ORDER':
        if (item_id) {
          const item = foodData.find(f => f.FoodID === parseInt(item_id))
          if (item) {
            await updateQuantity(item.FoodID, quantity || 1)
            setStatusMessage(`Added ${quantity || 1} ${item.FoodName} to cart`)
            setTimeout(() => setStatusMessage(''), 3500)
          } else {
            const errorMsg = 'I couldn\'t find that item in our menu.'
            setAssistantResponse(errorMsg)
            speakResponse(errorMsg)
          }
        }
        break;

      case 'REMOVE':
        if (item_id) {
          const item = foodData.find(f => f.FoodID === parseInt(item_id))
          if (item && item.Quantity > 0) {
            const removeQty = Math.min(item.Quantity, quantity || 1)
            await updateQuantity(item.FoodID, -removeQty)
            setStatusMessage(`Removed ${removeQty} ${item.FoodName} from cart`)
            setTimeout(() => setStatusMessage(''), 3500)
          } else {
            const errorMsg = 'That item is not in your cart.'
            setAssistantResponse(errorMsg)
            speakResponse(errorMsg)
          }
        }
        break;

      case 'FILTER':
        if (category) {
          navigate('/')
          // Scroller trigger category focus
          setTimeout(() => {
            const catBtn = document.evaluate(
              `//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${category.toLowerCase()}')]`,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
            if (catBtn) {
              catBtn.click();
              catBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 400)
        }
        break;

      case 'LOGOUT':
        await logout()
        break;

      default:
        break;
    }
  }, [navigate, foodData, updateQuantity, logout, speakResponse])

  // ── Processing voice text using Groq LLM API ──
  const processTranscriptText = useCallback(async (text) => {
    if (!text || text.trim() === '') return
    setIsProcessing(true)
    setStatusMessage('Thinking...')

    try {
      const res = await fetch('/voice/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const data = await res.json()
      
      if (data.aiResponse) {
        await handleCommand(data.aiResponse)
      } else {
        throw new Error('No AI response')
      }
    } catch (error) {
      console.error('Voice Processing Error:', error)
      const errorMsg = 'I had trouble connecting to the brain. Please check your network connection.'
      setAssistantResponse(errorMsg)
      speakResponse(errorMsg)
    } finally {
      setIsProcessing(false)
      setStatusMessage('')
      setTranscript('')
    }
  }, [handleCommand, speakResponse])

  // ── Setup Native Speech Recognition ──
  useEffect(() => {
    if (!isBrowserSupported) return

    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-IN'

    rec.onstart = () => {
      setIsListening(true)
      setPermissionError(false)
      setAssistantResponse('Listening...')
      setTranscript('')
    }

    rec.onresult = (event) => {
      const resultText = event.results[0][0].transcript
      setTranscript(resultText)
      setAssistantResponse(`"${resultText}"`)
    }

    rec.onerror = (event) => {
      console.error('Speech recognition error event:', event.error)
      setIsListening(false)
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionError(true)
        const blockMsg = 'Microphone access denied. Please click the camera/mic icon in the browser address bar to allow permissions.'
        setAssistantResponse(blockMsg)
        speakResponse('Microphone access denied. Please enable microphone permissions in your browser.')
      } else {
        setAssistantResponse('Sorry, I couldn\'t hear that clearly. Tap to speak again.')
      }
    }

    rec.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = rec

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {}
      }
    }
  }, [isBrowserSupported, speakResponse])

  // Process transcript once listening ends
  useEffect(() => {
    if (!isListening && transcript && transcript.length > 0) {
      processTranscriptText(transcript)
    }
  }, [isListening, transcript, processTranscriptText])

  const toggleListening = () => {
    if (!isBrowserSupported) return

    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
    } else {
      try {
        // Cancel any pending speaking speech
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel()
        }
        recognitionRef.current.start()
      } catch (err) {
        console.error('Error starting recognition:', err)
      }
    }
  }

  // Floating mic button render when overlay is toggled off
  if (!Togg) {
    return (
      <div className="voice-assistant-floating">
        <button className="floating-voice-button" onClick={() => setTogg(true)} title="Open Voice Assistant">
          <span className="mic-icon">🎤</span>
        </button>
      </div>
    )
  }

  return (
    <div className="voice-assistant-overlay">
      <div className="voice-assistant-card glass-panel">
        <button className="close-assistant" onClick={() => {
          if (isListening) {
            try { recognitionRef.current.abort() } catch(e){}
          }
          setTogg(false)
        }}>×</button>
        
        <div className="assistant-header">
          <div className={`mic-status-ring ${isListening ? 'active' : ''}`}>
             <div className="inner-mic-circle">🎤</div>
          </div>
          <h3>EchoEats Assistant</h3>
        </div>

        {!isBrowserSupported ? (
          <div className="unsupported-browser-panel">
            <p>⚠️ <strong>Voice Ordering Unavailable</strong></p>
            <span>Voice command features are not fully supported in this browser. Please try Google Chrome, Microsoft Edge, or Safari for the full hands-free ordering experience.</span>
          </div>
        ) : (
          <div className="assistant-display">
            {isListening && (
              <div className="audio-wave-animation">
                <span className="stroke"></span>
                <span className="stroke"></span>
                <span className="stroke"></span>
                <span className="stroke"></span>
                <span className="stroke"></span>
              </div>
            )}
            
            <p className="transcript-text">
              {transcript || (isListening ? 'Listening to your cravings...' : 'Say something like: "Order 2 Farmhouse Pizza"')}
            </p>
            
            <div className={`response-box ${permissionError ? 'error-accent' : ''}`}>
               <p className="response-text">{assistantResponse}</p>
            </div>
            
            {statusMessage && <div className="status-toast animate-fade">{statusMessage}</div>}
          </div>
        )}

        {isBrowserSupported && (
          <button 
            className={`action-button ${isListening ? 'listening' : ''}`} 
            onClick={toggleListening}
            disabled={isProcessing}
          >
            {isProcessing ? 'Thinking...' : (isListening ? 'Stop Listening' : 'Tap to Command')}
          </button>
        )}
      </div>
    </div>
  )
}

export default VoiceAssistant

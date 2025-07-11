import React, { useState, useEffect } from 'react';
import './App.css';

interface ChatMessage {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

function App() {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [email, setEmail] = useState('');

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    // Save preference
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const examplePrompts = [
    "Weekend in Tokyo with kids",
    "Best foodie experiences in Barcelona?",
    "Plan a 5-day adventure in Peru"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  const handleSubmit = (message: string) => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      text: message,
      isBot: false,
      timestamp: new Date()
    };

    setChatMessages([...chatMessages, newMessage]);
    setInputValue('');
    setShowChat(true);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        text: "I'd love to help you plan that adventure! Let me create a personalized itinerary based on your preferences. What's your travel style - relaxed exploration, action-packed adventures, or cultural immersion?",
        isBot: true,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
  };

  const handleExampleClick = (prompt: string) => {
    setInputValue(prompt);
    handleSubmit(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(inputValue);
    }
  };

  const handleSubscribe = () => {
    if (email.trim()) {
      alert(`Thank you for subscribing with ${email}!`);
      setEmail('');
    }
  };

  return (
    <div className="App">
      {/* Background Elements */}
      <div className="background-shape"></div>
      <div className="background-globe">
        <svg viewBox="0 0 100 100" className="globe-svg">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
          <path d="M10 50 Q30 30 50 50 Q70 70 90 50" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
          <path d="M10 50 Q30 70 50 50 Q70 30 90 50" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
          <circle cx="50" cy="50" r="2" fill="currentColor" opacity="0.4"/>
        </svg>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <span className="logo-text">BARABULA</span>
          </div>
          <nav className="navigation">
            <a href="#explore" className="nav-link active">Explore</a>
            <a href="#destinations" className="nav-link">Destinations</a>
            <a href="#experiences" className="nav-link">Experiences</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#contact" className="nav-link">Contact</a>
          </nav>
          <div className="header-actions">
            <button 
              className="dark-mode-toggle"
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button className="auth-button sign-in">Sign In</button>
            <button className="auth-button sign-up">Sign Up</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {!showChat ? (
          <>
            {/* Hero Section */}
            <section className="hero-section">
              <div className="hero-content">
                <h1 className="hero-title">Where will your wander take you?</h1>
                
                <div className={`input-container ${isInputFocused ? 'focused' : ''}`}>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask BARABULA..."
                    className="main-input"
                  />
                  <button 
                    className="send-button"
                    onClick={() => handleSubmit(inputValue)}
                    disabled={!inputValue.trim()}
                  >
                    <svg viewBox="0 0 24 24" className="send-icon">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>

                <div className="example-prompts">
                  {examplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      className="example-prompt"
                      onClick={() => handleExampleClick(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Secondary CTA */}
            <section className="secondary-cta">
              <div className="cta-content">
                <span className="cta-text">Not sure where to go?</span>
                <button className="inspire-button">Let BARABULA Inspire Me</button>
              </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
              <div className="features-container">
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg viewBox="0 0 24 24" className="icon">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <h3 className="feature-title">Smart AI Recommendations</h3>
                  <p className="feature-description">Personalized suggestions based on your preferences, budget, and travel style.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <svg viewBox="0 0 24 24" className="icon">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      <polyline points="9,22 9,12 15,12 15,22" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <h3 className="feature-title">Real-time Itinerary Updates</h3>
                  <p className="feature-description">Dynamic plans that adapt to weather, availability, and your changing preferences.</p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <svg viewBox="0 0 24 24" className="icon">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <h3 className="feature-title">Conversational Travel Assistant</h3>
                  <p className="feature-description">Chat naturally with AI to refine plans, ask questions, and get instant advice.</p>
                </div>
              </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works">
              <div className="how-it-works-container">
                <h2 className="section-title">How It Works</h2>
                <div className="steps-container">
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3 className="step-title">Describe Your Dream Trip</h3>
                      <p className="step-description">Tell us where you want to go, your interests, and travel style</p>
                    </div>
                  </div>
                  <div className="step-connector"></div>
                  <div className="step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3 className="step-title">Get Personalized Plans Instantly</h3>
                      <p className="step-description">Our AI creates detailed itineraries tailored just for you</p>
                    </div>
                  </div>
                  <div className="step-connector"></div>
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3 className="step-title">Explore, Book, and Enjoy</h3>
                      <p className="step-description">Follow your personalized plan and make memories</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Chat View */
          <div className="chat-view">
            <button 
              className="back-button"
              onClick={() => setShowChat(false)}
            >
              ← Back to search
            </button>
            
            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.map((message, index) => (
                  <div key={index} className={`message ${message.isBot ? 'bot' : 'user'}`}>
                    <div className="message-content">
                      {message.text}
                    </div>
                    <div className="message-time">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="message bot typing">
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="chat-input-container">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Continue your conversation..."
                  className="chat-input"
                />
                <button 
                  className="send-button"
                  onClick={() => handleSubmit(inputValue)}
                  disabled={!inputValue.trim()}
                >
                  <svg viewBox="0 0 24 24" className="send-icon">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-left">
            <div className="social-icons">
              <button className="social-icon" aria-label="Twitter">
                <svg viewBox="0 0 24 24" className="social-svg">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </button>
              <button className="social-icon" aria-label="Instagram">
                <svg viewBox="0 0 24 24" className="social-svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </button>
              <button className="social-icon" aria-label="Facebook">
                <svg viewBox="0 0 24 24" className="social-svg">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="footer-center">
            <div className="footer-links">
              <a href="#privacy">Privacy Policy</a>
              <span className="separator">·</span>
              <a href="#terms">Terms of Service</a>
              <span className="separator">·</span>
              <a href="#contact">Contact Us</a>
            </div>
          </div>
          
          <div className="footer-right">
            <div className="newsletter-signup">
              <span className="newsletter-label">Subscribe:</span>
              <div className="newsletter-input-container">
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email"
                  className="newsletter-input"
                />
                <button 
                  className="newsletter-button"
                  onClick={handleSubscribe}
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

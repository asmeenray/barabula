import React, { useState, useEffect } from 'react';
import './App.css';

interface ChatMessage {
  text: string;
  isBot: boolean;
}

interface Testimonial {
  text: string;
  name: string;
  avatar: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { text: "Hi! I'm your AI travel assistant. Where would you like to explore?", isBot: true }
  ]);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [scrollY, setScrollY] = useState(0);

  const testimonials: Testimonial[] = [
    { text: "BARABULA transformed my trip to Tokyo. The AI suggestions were spot-on!", name: "Sarah Chen", avatar: "👩‍💼" },
    { text: "Finally, a travel app that understands my preferences and adapts in real-time.", name: "Marcus Rodriguez", avatar: "👨‍🎨" },
    { text: "The conversational AI feels like having a local guide everywhere I go.", name: "Emma Thompson", avatar: "👩‍🔬" },
    { text: "Best travel planning experience I've ever had. Highly recommend!", name: "David Kim", avatar: "👨‍💻" },
    { text: "The real-time adjustments saved my vacation when weather changed.", name: "Lisa Wang", avatar: "👩‍🚀" }
  ];

  const quizQuestions: QuizQuestion[] = [
    {
      question: "What's your ideal vacation pace?",
      options: ["Relaxed and slow", "Balanced mix", "Action-packed adventure"]
    },
    {
      question: "Your preferred accommodation?",
      options: ["Luxury hotels", "Local experiences", "Budget-friendly"]
    },
    {
      question: "Travel style preference?",
      options: ["Solo explorer", "Group adventures", "Romantic getaways"]
    }
  ];

  // Scroll tracking for parallax and active section
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      setScrollY(scrolled);

      // Update active section
      const sections = ['hero', 'features', 'how-it-works', 'testimonials'];
      const currentSection = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      if (currentSection) setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll animations and number counters
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -10% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          
          // Trigger number counter animation
          if (entry.target.classList.contains('counter')) {
            const counter = entry.target as HTMLElement;
            const target = parseInt(counter.getAttribute('data-target') || '0');
            let count = 0;
            const increment = target / 30; // Animate over ~1 second
            
            const timer = setInterval(() => {
              count += increment;
              if (count >= target) {
                counter.textContent = target.toString();
                clearInterval(timer);
              } else {
                counter.textContent = Math.floor(count).toString();
              }
            }, 33); // ~30 FPS
          }
        }
      });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll, .counter').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
  };

  const handleChatSubmit = (message: string) => {
    setChatMessages([...chatMessages, 
      { text: message, isBot: false },
      { text: "That sounds amazing! I can help you plan the perfect itinerary. Let me show you some personalized recommendations...", isBot: true }
    ]);
  };

  const handleQuizAnswer = (answer: string) => {
    const newAnswers = { ...quizAnswers, [quizStep]: answer };
    setQuizAnswers(newAnswers);
    
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      // Quiz completed, show results
      alert("Great! Based on your answers, I'd recommend exploring cultural destinations with a balanced pace and mid-range accommodations. Ready to start planning?");
      setQuizStep(0);
      setQuizAnswers({});
    }
  };

  const smoothScrollTo = (elementId: string) => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <h2>BARABULA</h2>
          </div>
          <div className="nav-links">
            <a 
              href="#features" 
              className={activeSection === 'features' ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); smoothScrollTo('features'); }}
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              className={activeSection === 'how-it-works' ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); smoothScrollTo('how-it-works'); }}
            >
              How It Works
            </a>
            <a 
              href="#testimonials" 
              className={activeSection === 'testimonials' ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); smoothScrollTo('testimonials'); }}
            >
              Testimonials
            </a>
            <button className="nav-cta">Get Started</button>
            <button className="dark-mode-toggle" onClick={toggleDarkMode}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="hero">
        <div className="hero-background" style={{ transform: `translateY(${scrollY * 0.5}px)` }}>
          <div className="travel-shapes">
            <div className="shape shape-1">✈️</div>
            <div className="shape shape-2">🗺️</div>
            <div className="shape shape-3">📍</div>
            <div className="shape shape-4">🧳</div>
            <div className="shape shape-5">🌍</div>
            <div className="shape shape-6">📸</div>
            <div className="shape shape-7">🏔️</div>
            <div className="shape shape-8">🏖️</div>
          </div>
          <div className="hero-gradient"></div>
        </div>
        <div className="hero-container">
          <div className="hero-content animate-on-scroll">
            <h1 className="hero-title">WANDER SMARTER WITH BARABULA</h1>
            <p className="hero-subtitle">
              Your AI-powered travel companion for personalized, context-aware journeys.
            </p>
            <button className="hero-cta" onClick={() => smoothScrollTo('demo')}>
              Start Exploring
            </button>
          </div>
          <div className="hero-visual">
            <div className="travel-illustration">
              <div className="destination-card card-1">
                <div className="card-image">🗼</div>
                <div className="card-title">Paris</div>
              </div>
              <div className="destination-card card-2">
                <div className="card-image">🌸</div>
                <div className="card-title">Tokyo</div>
              </div>
              <div className="destination-card card-3">
                <div className="card-image">🗽</div>
                <div className="card-title">New York</div>
              </div>
              <div className="connecting-lines">
                <div className="line line-1"></div>
                <div className="line line-2"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="features-container">
          <div className="feature-card animate-on-scroll" data-delay="0">
            <div className="feature-icon calendar-icon animated-icon">📅</div>
            <h3>Real-time Itinerary Adjustments</h3>
            <p>Adapt your plans instantly based on weather, crowds, and preferences.</p>
          </div>
          <div className="feature-card animate-on-scroll" data-delay="200">
            <div className="feature-icon map-icon animated-icon">🗺️</div>
            <h3>Geo-aware Recommendations</h3>
            <p>Discover hidden gems and local favorites wherever you are.</p>
          </div>
          <div className="feature-card animate-on-scroll" data-delay="400">
            <div className="feature-icon chat-icon animated-icon">💬</div>
            <h3>Conversational AI Assistance</h3>
            <p>Get instant answers and personalized suggestions through natural conversation.</p>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="demo-section">
        <div className="demo-container">
          <div className="demo-chat animate-on-scroll">
            <h3>Try Our AI Assistant</h3>
            <div className="chat-window">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.isBot ? 'bot' : 'user'}`}>
                  <div className="message-bubble">
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="chat-input-container">
              <input 
                type="text" 
                placeholder="Ask me about your next destination..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      handleChatSubmit(input.value);
                      input.value = '';
                    }
                  }
                }}
              />
              <button className="chat-send">Send</button>
            </div>
          </div>

          <div className="quiz-section animate-on-scroll">
            <h3>Discover Your Travel Style</h3>
            <div className="quiz-container">
              <div className="quiz-progress">
                <div 
                  className="quiz-progress-bar"
                  style={{ width: `${((quizStep + 1) / quizQuestions.length) * 100}%` }}
                ></div>
              </div>
              <div className="quiz-question">
                <h4>{quizQuestions[quizStep].question}</h4>
                <div className="quiz-options">
                  {quizQuestions[quizStep].options.map((option, index) => (
                    <button 
                      key={index}
                      className="quiz-option"
                      onClick={() => handleQuizAnswer(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="how-it-works-container">
          <h2 className="animate-on-scroll">How It Works</h2>
          <div className="steps">
            <div className="step animate-on-scroll" data-delay="0">
              <div className="step-number counter" data-target="1">1</div>
              <div className="step-icon preferences-icon">⚙️</div>
              <h3>Tell us your preferences</h3>
              <p>Share your travel style, interests, and budget.</p>
            </div>
            <div className="step animate-on-scroll" data-delay="200">
              <div className="step-number counter" data-target="2">2</div>
              <div className="step-icon suggestions-icon">🎯</div>
              <h3>Get personalized suggestions</h3>
              <p>Receive curated recommendations tailored just for you.</p>
            </div>
            <div className="step animate-on-scroll" data-delay="400">
              <div className="step-number counter" data-target="3">3</div>
              <div className="step-icon travel-icon-step">✈️</div>
              <h3>Travel effortlessly</h3>
              <p>Enjoy seamless journeys with real-time assistance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials">
        <div className="testimonials-container">
          <h2 className="animate-on-scroll">What Travelers Say</h2>
          <div className="testimonials-grid">
            {testimonials.slice(0, 3).map((testimonial, index) => (
              <div key={index} className="testimonial-card animate-on-scroll" data-delay={index * 100}>
                <div className="testimonial-avatar">{testimonial.avatar}</div>
                <p>"{testimonial.text}"</p>
                <span className="testimonial-name">{testimonial.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="partners">
        <div className="partners-container animate-on-scroll">
          <div className="partner-logo">Expedia</div>
          <div className="partner-logo">Booking</div>
          <div className="partner-logo">Google Maps</div>
          <div className="partner-logo">TripAdvisor</div>
          <div className="partner-logo">Airbnb</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-social">
            <div className="social-icon twitter">🐦</div>
            <div className="social-icon instagram">📷</div>
            <div className="social-icon facebook">📘</div>
          </div>
          <div className="footer-links">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-subscribe">
            <input type="email" placeholder="Subscribe to updates" className="subscribe-input" />
            <button className="subscribe-btn">Subscribe</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

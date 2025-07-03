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

interface City {
  id: string;
  name: string;
  country: string;
  icon: string;
  color: string;
  description: string;
  highlights: string[];
}

interface ItineraryDay {
  day: number;
  title: string;
  activities: {
    time: string;
    activity: string;
    location: string;
    description: string;
  }[];
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
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [currentCityIndex, setCurrentCityIndex] = useState(0);
  const [showItinerary, setShowItinerary] = useState(false);
  const [carouselRotation, setCarouselRotation] = useState(0);

  const cities: City[] = [
    {
      id: 'paris',
      name: 'Paris',
      country: 'France',
      icon: '🗼',
      color: '#FF6B6B',
      description: 'The City of Light',
      highlights: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame', 'Champs-Élysées']
    },
    {
      id: 'tokyo',
      name: 'Tokyo',
      country: 'Japan',
      icon: '🌸',
      color: '#FF9FF3',
      description: 'Modern meets Traditional',
      highlights: ['Shibuya Crossing', 'Tokyo Tower', 'Senso-ji Temple', 'Harajuku']
    },
    {
      id: 'newyork',
      name: 'New York',
      country: 'USA',
      icon: '🗽',
      color: '#54C7EC',
      description: 'The Big Apple',
      highlights: ['Times Square', 'Central Park', 'Brooklyn Bridge', 'Empire State']
    },
    {
      id: 'london',
      name: 'London',
      country: 'England',
      icon: '🏰',
      color: '#95E1D3',
      description: 'Royal Heritage',
      highlights: ['Big Ben', 'London Eye', 'Tower Bridge', 'Buckingham Palace']
    },
    {
      id: 'sydney',
      name: 'Sydney',
      country: 'Australia',
      icon: '🏛️',
      color: '#F38BA8',
      description: 'Harbor City',
      highlights: ['Opera House', 'Harbor Bridge', 'Bondi Beach', 'Darling Harbour']
    },
    {
      id: 'dubai',
      name: 'Dubai',
      country: 'UAE',
      icon: '🏙️',
      color: '#FFD23F',
      description: 'Future Metropolis',
      highlights: ['Burj Khalifa', 'Palm Jumeirah', 'Gold Souk', 'Dubai Mall']
    },
    {
      id: 'rome',
      name: 'Rome',
      country: 'Italy',
      icon: '🏛️',
      color: '#A8E6CF',
      description: 'Eternal City',
      highlights: ['Colosseum', 'Vatican City', 'Trevi Fountain', 'Roman Forum']
    },
    {
      id: 'bali',
      name: 'Bali',
      country: 'Indonesia',
      icon: '🌺',
      color: '#FFB3BA',
      description: 'Island Paradise',
      highlights: ['Ubud Rice Terraces', 'Tanah Lot', 'Mount Batur', 'Seminyak Beach']
    },
    {
      id: 'bangkok',
      name: 'Bangkok',
      country: 'Thailand',
      icon: '🛕',
      color: '#BFCFFF',
      description: 'Temple City',
      highlights: ['Grand Palace', 'Wat Pho', 'Floating Markets', 'Khao San Road']
    },
    {
      id: 'santorini',
      name: 'Santorini',
      country: 'Greece',
      icon: '🏖️',
      color: '#C7CEEA',
      description: 'Aegean Gem',
      highlights: ['Oia Sunset', 'Blue Domes', 'Red Beach', 'Fira Caldera']
    }
  ];

  const sampleItineraries: Record<string, ItineraryDay[]> = {
    paris: [
      {
        day: 1,
        title: "Classic Paris",
        activities: [
          { time: "9:00 AM", activity: "Eiffel Tower Visit", location: "Champ de Mars", description: "Start with the iconic symbol of Paris" },
          { time: "11:30 AM", activity: "Seine River Cruise", location: "Pont Neuf", description: "See Paris from the water" },
          { time: "2:00 PM", activity: "Louvre Museum", location: "Rue de Rivoli", description: "World's largest art museum" },
          { time: "6:00 PM", activity: "Sunset at Sacré-Cœur", location: "Montmartre", description: "Panoramic city views" }
        ]
      },
      {
        day: 2,
        title: "Art & Culture",
        activities: [
          { time: "10:00 AM", activity: "Musée d'Orsay", location: "Left Bank", description: "Impressionist masterpieces" },
          { time: "1:00 PM", activity: "Latin Quarter Walk", location: "5th Arrondissement", description: "Historic student quarter" },
          { time: "3:30 PM", activity: "Notre-Dame Area", location: "Île de la Cité", description: "Gothic architecture" },
          { time: "7:00 PM", activity: "Evening Seine Stroll", location: "Quai de Seine", description: "Romantic riverside walk" }
        ]
      }
    ],
    tokyo: [
      {
        day: 1,
        title: "Modern Tokyo",
        activities: [
          { time: "9:00 AM", activity: "Shibuya Crossing", location: "Shibuya", description: "World's busiest intersection" },
          { time: "11:00 AM", activity: "Harajuku Fashion District", location: "Harajuku", description: "Youth culture and fashion" },
          { time: "2:00 PM", activity: "Meiji Shrine", location: "Shibuya", description: "Peaceful Shinto shrine" },
          { time: "5:00 PM", activity: "Tokyo Tower", location: "Minato", description: "City skyline views" }
        ]
      },
      {
        day: 2,
        title: "Traditional Tokyo",
        activities: [
          { time: "8:00 AM", activity: "Tsukiji Fish Market", location: "Chuo", description: "Fresh sushi breakfast" },
          { time: "10:30 AM", activity: "Senso-ji Temple", location: "Asakusa", description: "Tokyo's oldest temple" },
          { time: "1:00 PM", activity: "Imperial Palace Gardens", location: "Chiyoda", description: "Royal gardens" },
          { time: "4:00 PM", activity: "Ginza Shopping", location: "Ginza", description: "Luxury shopping district" }
        ]
      }
    ],
    newyork: [
      {
        day: 1,
        title: "Manhattan Highlights",
        activities: [
          { time: "9:00 AM", activity: "Central Park Walk", location: "Central Park", description: "Morning in the green heart of NYC" },
          { time: "11:00 AM", activity: "Metropolitan Museum", location: "Upper East Side", description: "World-class art collection" },
          { time: "2:00 PM", activity: "Times Square", location: "Midtown", description: "The crossroads of the world" },
          { time: "5:00 PM", activity: "Empire State Building", location: "Midtown", description: "Iconic city views" }
        ]
      }
    ],
    london: [
      {
        day: 1,
        title: "Royal London",
        activities: [
          { time: "9:00 AM", activity: "Tower of London", location: "Tower Hill", description: "Historic royal fortress" },
          { time: "12:00 PM", activity: "Tower Bridge Walk", location: "South Bank", description: "Iconic bridge crossing" },
          { time: "2:30 PM", activity: "Westminster Abbey", location: "Westminster", description: "Royal church and history" },
          { time: "5:00 PM", activity: "Big Ben & Parliament", location: "Westminster", description: "Political heart of Britain" }
        ]
      }
    ]
  };

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

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setShowItinerary(true);
  };

  const closeItinerary = () => {
    setShowItinerary(false);
    setSelectedCity(null);
  };

  const nextCity = () => {
    const nextIndex = (currentCityIndex + 1) % cities.length;
    setCurrentCityIndex(nextIndex);
    setCarouselRotation(-(nextIndex * (360 / cities.length)));
  };

  const prevCity = () => {
    const prevIndex = currentCityIndex === 0 ? cities.length - 1 : currentCityIndex - 1;
    setCurrentCityIndex(prevIndex);
    setCarouselRotation(-(prevIndex * (360 / cities.length)));
  };

  const selectCityByIndex = (index: number) => {
    setCurrentCityIndex(index);
    setCarouselRotation(-(index * (360 / cities.length)));
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
          
          {/* Interactive City Carousel */}
          <div className="city-carousel-container">
            <h3 className="carousel-title">Explore Popular Destinations</h3>
            <div className="carousel-wrapper">
              <button className="carousel-nav prev" onClick={prevCity} aria-label="Previous city">
                <span>←</span>
              </button>
              
              <div className="city-carousel">
                <div 
                  className="carousel-circle" 
                  style={{ transform: `rotate(${carouselRotation}deg)` }}
                >
                  {cities.map((city, index) => {
                    const angle = (index * 360) / cities.length;
                    const isActive = index === currentCityIndex;
                    
                    return (
                      <div
                        key={city.id}
                        className={`city-card ${isActive ? 'active' : ''}`}
                        style={{
                          transform: `rotate(${angle}deg) translateX(180px) rotate(-${angle + carouselRotation}deg)`,
                        }}
                        onClick={() => {
                          selectCityByIndex(index);
                          handleCitySelect(city);
                        }}
                      >
                        <div className="city-icon" style={{ backgroundColor: city.color }}>
                          {city.icon}
                        </div>
                        <div className="city-info">
                          <h4>{city.name}</h4>
                          <p>{city.country}</p>
                          <span className="city-description">{city.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Center Info Display */}
                <div className="carousel-center">
                  <div className="featured-city">
                    <div className="featured-icon" style={{ backgroundColor: cities[currentCityIndex].color }}>
                      {cities[currentCityIndex].icon}
                    </div>
                    <h3>{cities[currentCityIndex].name}</h3>
                    <p>{cities[currentCityIndex].description}</p>
                    <div className="city-highlights">
                      {cities[currentCityIndex].highlights.slice(0, 2).map((highlight, idx) => (
                        <span key={idx} className="highlight-tag">{highlight}</span>
                      ))}
                    </div>
                    <button 
                      className="view-itinerary-btn"
                      onClick={() => handleCitySelect(cities[currentCityIndex])}
                    >
                      View Sample Itinerary
                    </button>
                  </div>
                </div>
              </div>
              
              <button className="carousel-nav next" onClick={nextCity} aria-label="Next city">
                <span>→</span>
              </button>
            </div>
            
            {/* City Dots Navigation */}
            <div className="carousel-dots">
              {cities.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === currentCityIndex ? 'active' : ''}`}
                  onClick={() => selectCityByIndex(index)}
                  aria-label={`Go to ${cities[index].name}`}
                />
              ))}
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

      {/* Itinerary Modal */}
      {showItinerary && selectedCity && (
        <div className="itinerary-modal-overlay" onClick={closeItinerary}>
          <div className="itinerary-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeItinerary}>×</button>
            <div className="modal-header">
              <div className="modal-city-icon" style={{ backgroundColor: selectedCity.color }}>
                {selectedCity.icon}
              </div>
              <div className="modal-city-info">
                <h2>{selectedCity.name}, {selectedCity.country}</h2>
                <p>{selectedCity.description}</p>
                <div className="modal-highlights">
                  {selectedCity.highlights.map((highlight, idx) => (
                    <span key={idx} className="highlight-tag">{highlight}</span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-content">
              <h3>Sample Itinerary</h3>
              {sampleItineraries[selectedCity.id] ? (
                <div className="itinerary-days">
                  {sampleItineraries[selectedCity.id].map((day) => (
                    <div key={day.day} className="day-card">
                      <h4>Day {day.day}: {day.title}</h4>
                      <div className="activities">
                        {day.activities.map((activity, idx) => (
                          <div key={idx} className="activity">
                            <div className="activity-time">{activity.time}</div>
                            <div className="activity-details">
                              <h5>{activity.activity}</h5>
                              <p className="activity-location">📍 {activity.location}</p>
                              <p className="activity-description">{activity.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-itinerary">
                  <p>Sample itinerary coming soon for {selectedCity.name}!</p>
                </div>
              )}
              
              <div className="modal-actions">
                <button className="btn-secondary" onClick={closeItinerary}>
                  Close
                </button>
                <button className="btn-primary">
                  Create Custom Itinerary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

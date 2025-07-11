import React, { useState, useEffect } from 'react';
import './App.css';

interface ChatMessage {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface TripPlan {
  destination: string;
  days: string;
  personalizations: string[];
}

function App() {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [email, setEmail] = useState('');
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [activeSection, setActiveSection] = useState('explore');
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  
  // Trip planning form state
  const [tripPlan, setTripPlan] = useState<TripPlan>({
    destination: '',
    days: '',
    personalizations: []
  });
  const [newPersonalization, setNewPersonalization] = useState('');

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

  // Smooth scroll navigation
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Intersection observer for active section detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    const sections = document.querySelectorAll('.full-page-section');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

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

  const handleTripPlanChange = (field: keyof TripPlan, value: string | string[]) => {
    setTripPlan(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPersonalization = () => {
    if (newPersonalization.trim() && tripPlan.personalizations.length < 5) {
      setTripPlan(prev => ({
        ...prev,
        personalizations: [...prev.personalizations, newPersonalization.trim()]
      }));
      setNewPersonalization('');
    }
  };

  const removePersonalization = (index: number) => {
    setTripPlan(prev => ({
      ...prev,
      personalizations: prev.personalizations.filter((_, i) => i !== index)
    }));
  };

  const handlePlanTrip = () => {
    const tripMessage = `Plan a ${tripPlan.days}-day trip to ${tripPlan.destination}${
      tripPlan.personalizations.length > 0 
        ? `. Preferences: ${tripPlan.personalizations.join(', ')}` 
        : ''
    }`;
    handleSubmit(tripMessage);
    setShowAdvancedForm(false);
    // Reset form
    setTripPlan({
      destination: '',
      days: '',
      personalizations: []
    });
  };

  const toggleAdvancedForm = () => {
    setShowAdvancedForm(!showAdvancedForm);
  };

  const handleDestinationClick = (destination: string) => {
    setSelectedDestination(destination);
  };

  const closeDestinationPopup = () => {
    setSelectedDestination(null);
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
            <button 
              onClick={() => scrollToSection('explore')} 
              className={`nav-link ${activeSection === 'explore' ? 'active' : ''}`}
            >
              Explore
            </button>
            <button 
              onClick={() => scrollToSection('destinations')} 
              className={`nav-link ${activeSection === 'destinations' ? 'active' : ''}`}
            >
              Destinations
            </button>
            <button 
              onClick={() => scrollToSection('experiences')} 
              className={`nav-link ${activeSection === 'experiences' ? 'active' : ''}`}
            >
              Experiences
            </button>
            <button 
              onClick={() => scrollToSection('pricing')} 
              className={`nav-link ${activeSection === 'pricing' ? 'active' : ''}`}
            >
              Pricing
            </button>
            <button 
              onClick={() => scrollToSection('about')} 
              className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
            >
              About
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`}
            >
              Contact
            </button>
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
            {/* Explore Section (Hero) */}
            <section id="explore" className="full-page-section hero-section">
              <div className="hero-content">
                <h1 className="hero-title">Where will your wander take you?</h1>
                
                {!showAdvancedForm ? (
                  // Simple Input Mode
                  <>
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
                        className="advanced-form-toggle"
                        onClick={toggleAdvancedForm}
                        title="Plan a detailed trip"
                      >
                        <svg viewBox="0 0 24 24" className="form-icon">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L10.3 16.5a2 2 0 01-2.83-2.83l7.07-7.07" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
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
                  </>
                ) : (
                  // Advanced Trip Planning Form
                  <div className="trip-planning-form">
                    <div className="form-header">
                      <h3>Plan Your Perfect Trip</h3>
                      <button 
                        className="close-form-btn"
                        onClick={toggleAdvancedForm}
                      >
                        ←
                      </button>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="destination">Destination</label>
                        <input
                          id="destination"
                          type="text"
                          value={tripPlan.destination}
                          onChange={(e) => handleTripPlanChange('destination', e.target.value)}
                          placeholder="London"
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="days">How many days?</label>
                        <input
                          id="days"
                          type="number"
                          value={tripPlan.days}
                          onChange={(e) => handleTripPlanChange('days', e.target.value)}
                          placeholder="3"
                          className="form-input"
                          min="1"
                          max="30"
                        />
                      </div>

                      <div className="form-group personalize-group">
                        <label>Personalize? (optional)</label>
                        <div className="personalization-input">
                          <input
                            type="text"
                            value={newPersonalization}
                            onChange={(e) => setNewPersonalization(e.target.value)}
                            placeholder='e.g. "Make it family friendly"'
                            className="form-input"
                            onKeyPress={(e) => e.key === 'Enter' && addPersonalization()}
                          />
                          <button 
                            className="add-personalization-btn"
                            onClick={addPersonalization}
                            disabled={!newPersonalization.trim() || tripPlan.personalizations.length >= 5}
                          >
                            +
                          </button>
                        </div>
                        
                        {tripPlan.personalizations.length > 0 && (
                          <div className="personalizations-list">
                            {tripPlan.personalizations.map((item, index) => (
                              <span key={index} className="personalization-tag">
                                {item}
                                <button 
                                  onClick={() => removePersonalization(index)}
                                  className="remove-tag"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="personalization-note">
                          You can add up to 5 customizations
                        </div>

                        <div className="example-personalizations">
                          <span className="examples-label">Examples:</span>
                          <div className="example-tags">
                            {[
                              "Make it family friendly",
                              "Make it pet friendly", 
                              "Makes it wheelchair friendly",
                              "I want to travel at a relaxed pace",
                              "I travel at a fast pace",
                              "Exclude museums",
                              "Include parks and green spaces",
                              "Exclude religious places"
                            ].map((example, index) => (
                              <button
                                key={index}
                                className="example-tag"
                                onClick={() => {
                                  if (tripPlan.personalizations.length < 5 && !tripPlan.personalizations.includes(example)) {
                                    setTripPlan(prev => ({
                                      ...prev,
                                      personalizations: [...prev.personalizations, example]
                                    }));
                                  }
                                }}
                                disabled={tripPlan.personalizations.includes(example) || tripPlan.personalizations.length >= 5}
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      className="plan-trip-btn"
                      onClick={handlePlanTrip}
                      disabled={!tripPlan.destination.trim() || !tripPlan.days.trim()}
                    >
                      Plan a trip
                    </button>
                  </div>
                )}

                {/* Secondary CTA */}
                <div className="secondary-cta">
                  <div className="cta-content">
                    <div className="cta-wrapper">
                      <div className="cta-icon">
                        <svg viewBox="0 0 24 24" className="inspire-icon">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div className="cta-text-wrapper">
                        <span className="cta-text">Feeling adventurous?</span>
                        <span className="cta-subtext">Let our AI discover hidden gems just for you</span>
                      </div>
                      <button 
                        className="inspire-button"
                        onClick={() => setShowAdvancedForm(true)}
                      >
                        <span className="button-text">Inspire Me</span>
                        <svg viewBox="0 0 24 24" className="button-arrow">
                          <path d="M7 17l9.2-9.2M17 17V7H7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Destinations Section */}
            <section id="destinations" className="full-page-section destinations-section">
              <div className="section-content">
                <div className="section-header">
                  <h2 className="section-title">Popular Destinations</h2>
                  <p className="section-subtitle">Discover amazing places around the world</p>
                </div>
                
                <div className="destinations-grid">
                  <div className="destination-card" onClick={() => handleDestinationClick('Paris')}>
                    <div className="destination-image paris">
                      <div className="destination-overlay">
                        <h3>Paris, France</h3>
                        <p>City of Light & Romance</p>
                        <button className="explore-btn" onClick={(e) => { e.stopPropagation(); handleDestinationClick('Paris'); }}>Explore Paris</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="destination-card" onClick={() => handleDestinationClick('Tokyo')}>
                    <div className="destination-image tokyo">
                      <div className="destination-overlay">
                        <h3>Tokyo, Japan</h3>
                        <p>Modern Metropolis & Tradition</p>
                        <button className="explore-btn" onClick={(e) => { e.stopPropagation(); handleDestinationClick('Tokyo'); }}>Explore Tokyo</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="destination-card" onClick={() => handleDestinationClick('Bali')}>
                    <div className="destination-image bali">
                      <div className="destination-overlay">
                        <h3>Bali, Indonesia</h3>
                        <p>Tropical Paradise</p>
                        <button className="explore-btn" onClick={(e) => { e.stopPropagation(); handleDestinationClick('Bali'); }}>Explore Bali</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="destination-card" onClick={() => handleDestinationClick('New York')}>
                    <div className="destination-image newyork">
                      <div className="destination-overlay">
                        <h3>New York, USA</h3>
                        <p>The City That Never Sleeps</p>
                        <button className="explore-btn" onClick={(e) => { e.stopPropagation(); handleDestinationClick('New York'); }}>Explore New York</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="destination-card" onClick={() => handleDestinationClick('Santorini')}>
                    <div className="destination-image santorini">
                      <div className="destination-overlay">
                        <h3>Santorini, Greece</h3>
                        <p>Aegean Beauty</p>
                        <button className="explore-btn" onClick={(e) => { e.stopPropagation(); handleDestinationClick('Santorini'); }}>Explore Santorini</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="destination-card" onClick={() => handleDestinationClick('Dubai')}>
                    <div className="destination-image dubai">
                      <div className="destination-overlay">
                        <h3>Dubai, UAE</h3>
                        <p>Luxury & Innovation</p>
                        <button className="explore-btn" onClick={(e) => { e.stopPropagation(); handleDestinationClick('Dubai'); }}>Explore Dubai</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Experiences Section */}
            <section id="experiences" className="full-page-section experiences-section">
              <div className="section-content">
                <div className="section-header">
                  <h2 className="section-title">Unique Experiences</h2>
                  <p className="section-subtitle">Create unforgettable memories</p>
                </div>
                
                <div className="experiences-grid">
                  <div className="experience-card">
                    <div className="experience-icon">
                      <svg viewBox="0 0 24 24" className="icon">
                        <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <h3>Adventure Tours</h3>
                    <p>Thrilling activities for adrenaline seekers</p>
                    <ul>
                      <li>Mountain climbing expeditions</li>
                      <li>White water rafting</li>
                      <li>Skydiving experiences</li>
                      <li>Desert safaris</li>
                    </ul>
                  </div>
                  
                  <div className="experience-card">
                    <div className="experience-icon">
                      <svg viewBox="0 0 24 24" className="icon">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <h3>Cultural Immersion</h3>
                    <p>Deep dive into local traditions and customs</p>
                    <ul>
                      <li>Cooking classes with locals</li>
                      <li>Traditional craft workshops</li>
                      <li>Historical walking tours</li>
                      <li>Festival participation</li>
                    </ul>
                  </div>
                  
                  <div className="experience-card">
                    <div className="experience-icon">
                      <svg viewBox="0 0 24 24" className="icon">
                        <path d="M12 19l7-7 3 3-7 7-3-3z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2 2l7.586 7.586" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="11" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <h3>Wellness & Relaxation</h3>
                    <p>Rejuvenate your mind, body, and soul</p>
                    <ul>
                      <li>Spa retreats</li>
                      <li>Yoga and meditation</li>
                      <li>Hot springs visits</li>
                      <li>Wellness resorts</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="full-page-section pricing-section">
              <div className="section-content">
                <div className="section-header">
                  <h2 className="section-title">Choose Your Plan</h2>
                  <p className="section-subtitle">Simple, transparent pricing for every traveler</p>
                </div>
                
                <div className="pricing-grid">
                  <div className="pricing-card">
                    <div className="plan-header">
                      <h3 className="plan-name">Explorer</h3>
                      <div className="plan-price">
                        <span className="price">Free</span>
                      </div>
                    </div>
                    <ul className="plan-features">
                      <li>✓ Basic trip planning</li>
                      <li>✓ AI-powered recommendations</li>
                      <li>✓ 3 itineraries per month</li>
                      <li>✓ Community support</li>
                    </ul>
                    <button className="plan-button">Get Started</button>
                  </div>
                  
                  <div className="pricing-card featured">
                    <div className="plan-badge">Most Popular</div>
                    <div className="plan-header">
                      <h3 className="plan-name">Adventurer</h3>
                      <div className="plan-price">
                        <span className="price">$9.99</span>
                        <span className="period">/month</span>
                      </div>
                    </div>
                    <ul className="plan-features">
                      <li>✓ Unlimited trip planning</li>
                      <li>✓ Advanced AI customization</li>
                      <li>✓ Real-time updates</li>
                      <li>✓ Priority support</li>
                      <li>✓ Offline access</li>
                    </ul>
                    <button className="plan-button primary">Start Free Trial</button>
                  </div>
                  
                  <div className="pricing-card">
                    <div className="plan-header">
                      <h3 className="plan-name">Globetrotter</h3>
                      <div className="plan-price">
                        <span className="price">$19.99</span>
                        <span className="period">/month</span>
                      </div>
                    </div>
                    <ul className="plan-features">
                      <li>✓ Everything in Adventurer</li>
                      <li>✓ Personal travel concierge</li>
                      <li>✓ Exclusive deals & discounts</li>
                      <li>✓ Group trip planning</li>
                      <li>✓ 24/7 travel assistance</li>
                    </ul>
                    <button className="plan-button">Upgrade Now</button>
                  </div>
                </div>
              </div>
            </section>

            {/* About Section */}
            <section id="about" className="full-page-section about-section">
              <div className="section-content">
                <div className="about-grid">
                  <div className="about-text">
                    <h2 className="section-title">About BARABULA</h2>
                    <p className="about-description">
                      We believe travel should be accessible, personalized, and effortless. BARABULA combines cutting-edge AI 
                      technology with deep travel expertise to create the perfect itinerary for every adventure.
                    </p>
                    <p className="about-description">
                      Founded by travel enthusiasts and AI experts, we're on a mission to democratize travel planning and 
                      help millions of people discover the world in their own unique way.
                    </p>
                    
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-number">1M+</div>
                        <div className="stat-label">Trips Planned</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-number">150+</div>
                        <div className="stat-label">Countries</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-number">500K+</div>
                        <div className="stat-label">Happy Travelers</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-number">4.9/5</div>
                        <div className="stat-label">User Rating</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="about-visual">
                    <div className="team-grid">
                      <div className="team-member">
                        <div className="member-avatar"></div>
                        <h4>Sarah Chen</h4>
                        <p>Co-Founder & CEO</p>
                      </div>
                      <div className="team-member">
                        <div className="member-avatar"></div>
                        <h4>Marcus Rodriguez</h4>
                        <p>Co-Founder & CTO</p>
                      </div>
                      <div className="team-member">
                        <div className="member-avatar"></div>
                        <h4>Aria Patel</h4>
                        <p>Head of Product</p>
                      </div>
                      <div className="team-member">
                        <div className="member-avatar"></div>
                        <h4>David Kim</h4>
                        <p>Lead AI Engineer</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="full-page-section contact-section">
              <div className="section-content">
                <div className="section-header">
                  <h2 className="section-title">Get in Touch</h2>
                  <p className="section-subtitle">We'd love to hear from you</p>
                </div>
                
                <div className="contact-grid">
                  <div className="contact-info">
                    <div className="contact-item">
                      <div className="contact-icon">
                        <svg viewBox="0 0 24 24" className="icon">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                          <polyline points="22,6 12,13 2,6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div>
                        <h4>Email</h4>
                        <p>hello@barabula.com</p>
                      </div>
                    </div>
                    
                    <div className="contact-item">
                      <div className="contact-icon">
                        <svg viewBox="0 0 24 24" className="icon">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div>
                        <h4>Phone</h4>
                        <p>+1 (555) 123-4567</p>
                      </div>
                    </div>
                    
                    <div className="contact-item">
                      <div className="contact-icon">
                        <svg viewBox="0 0 24 24" className="icon">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div>
                        <h4>Office</h4>
                        <p>San Francisco, CA</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="contact-form">
                    <form className="form">
                      <div className="form-row">
                        <input type="text" placeholder="Your Name" className="form-input" />
                        <input type="email" placeholder="Your Email" className="form-input" />
                      </div>
                      <input type="text" placeholder="Subject" className="form-input" />
                      <textarea placeholder="Your Message" className="form-textarea" rows={6}></textarea>
                      <button type="submit" className="form-submit">Send Message</button>
                    </form>
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

      {/* Destination Popup */}
      {selectedDestination && (
        <div className="popup-overlay" onClick={closeDestinationPopup}>
          <div className="destination-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Plan Your Trip to {selectedDestination}</h2>
              <button className="close-popup-btn" onClick={closeDestinationPopup}>
                ×
              </button>
            </div>
            <div className="popup-content">
              <div className="destination-info">
                <h3>About {selectedDestination}</h3>
                <p>Discover the amazing experiences and attractions that {selectedDestination} has to offer.</p>
              </div>
              <div className="trip-planning-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="popup-destination">Destination</label>
                    <input
                      id="popup-destination"
                      type="text"
                      value={selectedDestination}
                      readOnly
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="popup-days">How many days?</label>
                    <input
                      id="popup-days"
                      type="number"
                      value={tripPlan.days}
                      onChange={(e) => handleTripPlanChange('days', e.target.value)}
                      placeholder="3"
                      className="form-input"
                      min="1"
                      max="30"
                    />
                  </div>

                  <div className="form-group personalize-group">
                    <label>Personalize? (optional)</label>
                    <div className="personalization-input">
                      <input
                        type="text"
                        value={newPersonalization}
                        onChange={(e) => setNewPersonalization(e.target.value)}
                        placeholder='e.g. "Make it family friendly"'
                        className="form-input"
                        onKeyPress={(e) => e.key === 'Enter' && addPersonalization()}
                      />
                      <button 
                        className="add-personalization-btn"
                        onClick={addPersonalization}
                        disabled={!newPersonalization.trim() || tripPlan.personalizations.length >= 5}
                      >
                        +
                      </button>
                    </div>
                    
                    {tripPlan.personalizations.length > 0 && (
                      <div className="personalizations-list">
                        {tripPlan.personalizations.map((item, index) => (
                          <span key={index} className="personalization-tag">
                            {item}
                            <button 
                              onClick={() => removePersonalization(index)}
                              className="remove-tag"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="personalization-note">
                      You can add up to 5 customizations
                    </div>
                  </div>
                </div>

                <button 
                  className="plan-trip-btn"
                  onClick={() => {
                    const tripMessage = `Plan a ${tripPlan.days}-day trip to ${selectedDestination}${
                      tripPlan.personalizations.length > 0 
                        ? `. Preferences: ${tripPlan.personalizations.join(', ')}` 
                        : ''
                    }`;
                    handleSubmit(tripMessage);
                    closeDestinationPopup();
                    // Reset form
                    setTripPlan({
                      destination: '',
                      days: '',
                      personalizations: []
                    });
                  }}
                  disabled={!tripPlan.days.trim()}
                >
                  Plan {selectedDestination} Trip
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

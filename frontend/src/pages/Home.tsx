import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Chip,
} from '@mui/material';
import {
  SmartToy,
  Groups,
  LocationOn,
  Language,
  TrendingUp,
  Security,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <SmartToy color="primary" sx={{ fontSize: 40 }} />,
      title: 'AI-Powered Planning',
      description: 'Let our AI create personalized itineraries based on your preferences and interests.',
    },
    {
      icon: <Groups color="primary" sx={{ fontSize: 40 }} />,
      title: 'Real-time Collaboration',
      description: 'Plan trips together with friends and family in real-time with live editing.',
    },
    {
      icon: <LocationOn color="primary" sx={{ fontSize: 40 }} />,
      title: 'Smart Recommendations',
      description: 'Get geo-aware suggestions for activities, restaurants, and attractions.',
    },
    {
      icon: <Language color="primary" sx={{ fontSize: 40 }} />,
      title: 'Multilingual Support',
      description: 'Chat with our AI assistant in multiple languages for global travel.',
    },
    {
      icon: <TrendingUp color="primary" sx={{ fontSize: 40 }} />,
      title: 'Dynamic Adjustments',
      description: 'Adapt your plans on-the-go with weather updates and real-time changes.',
    },
    {
      icon: <Security color="primary" sx={{ fontSize: 40 }} />,
      title: 'Secure & Private',
      description: 'Your travel data is encrypted and secure with enterprise-grade protection.',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
            Welcome to BARABULA
          </Typography>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 4, opacity: 0.9 }}>
            Your AI-powered travel companion for unforgettable journeys
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' },
                px: 4,
                py: 1.5,
              }}
            >
              Start Planning
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                px: 4,
                py: 1.5,
              }}
            >
              Sign In
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Why Choose BARABULA?
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
          Experience the future of travel planning with our innovative features
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card
                className="travel-card"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'center',
                  p: 2,
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Start Your Journey?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Join thousands of travelers who trust BARABULA for their adventures
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 4, flexWrap: 'wrap' }}>
            <Chip label="🤖 AI-Powered" color="primary" />
            <Chip label="🌍 Global Coverage" color="secondary" />
            <Chip label="⚡ Real-time Updates" color="primary" />
            <Chip label="👥 Collaborative" color="secondary" />
          </Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/register')}
            sx={{ px: 6, py: 2 }}
          >
            Get Started for Free
          </Button>
        </Container>
      </Box>

      {/* Demo Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h2" gutterBottom>
              See BARABULA in Action
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Watch how our AI assistant helps you plan the perfect trip in minutes, 
              not hours. From destination selection to detailed itineraries, 
              BARABULA makes travel planning effortless and enjoyable.
            </Typography>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/chat')}
              sx={{ mr: 2 }}
            >
              Try AI Assistant
            </Button>
            <Button
              variant="text"
              size="large"
              onClick={() => navigate('/dashboard')}
            >
              View Dashboard
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={4}>
              <CardMedia
                component="div"
                sx={{
                  height: 300,
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <Typography variant="h5">
                  🗺️ Interactive Demo Coming Soon
                </Typography>
              </CardMedia>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Home;

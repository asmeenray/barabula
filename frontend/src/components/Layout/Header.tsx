import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { FlightTakeoff } from '@mui/icons-material';

const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="logo"
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          <FlightTakeoff />
        </IconButton>
        
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, fontWeight: 'bold', cursor: 'pointer' }}
          onClick={() => navigate('/')}
          className="logo"
        >
          BARABULA
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="inherit"
            component={Link}
            to="/dashboard"
            sx={{ textTransform: 'none' }}
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/itineraries"
            sx={{ textTransform: 'none' }}
          >
            My Trips
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/chat"
            sx={{ textTransform: 'none' }}
          >
            AI Assistant
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/login"
            sx={{ textTransform: 'none' }}
          >
            Login
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            component={Link}
            to="/register"
            sx={{ textTransform: 'none' }}
          >
            Sign Up
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

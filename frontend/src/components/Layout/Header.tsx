import React, { useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { FlightTakeoff, AccountCircle } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { logout, getCurrentUser } from '../../store/authSlice';
import { RootState, AppDispatch } from '../../store/store';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  useEffect(() => {
    // Try to get current user when component mounts
    const token = localStorage.getItem('token');
    if (token && !user) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, user]);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleUserMenuClose();
    navigate('/');
  };

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
          
          {isAuthenticated ? (
            <>
              <IconButton
                color="inherit"
                onClick={handleUserMenuOpen}
                sx={{ ml: 1 }}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem disabled>
                  Welcome, {user?.username || user?.full_name}
                </MenuItem>
                <MenuItem onClick={() => { handleUserMenuClose(); navigate('/dashboard'); }}>
                  Dashboard
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
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
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

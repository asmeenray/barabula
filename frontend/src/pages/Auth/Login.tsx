import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { loginUser, clearError } from '../../store/authSlice';
import { RootState, AppDispatch } from '../../store/store';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Clear any previous errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    await dispatch(loginUser(formData));
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          maxWidth: 400, 
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom textAlign="center" color="white">
          Sign In
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Username or Email"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            margin="normal"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#4CAF50',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
              '& .MuiInputBase-input': {
                color: 'white',
              },
            }}
          />
          
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            margin="normal"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#4CAF50',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
              '& .MuiInputBase-input': {
                color: 'white',
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              mt: 3,
              mb: 2,
              background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: '12px',
              height: '48px',
              '&:hover': {
                background: 'linear-gradient(45deg, #45a049 30%, #4CAF50 90%)',
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Don't have an account?{' '}
              <Link component={RouterLink} to="/register" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;

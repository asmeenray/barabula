import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Login: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center">
          Login
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary">
          Login page coming soon...
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;

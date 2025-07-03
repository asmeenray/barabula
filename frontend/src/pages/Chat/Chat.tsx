import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Chat: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        AI Travel Assistant
      </Typography>
      <Paper elevation={2} sx={{ p: 3, height: '500px' }}>
        <Typography variant="body1" color="text.secondary">
          AI Chat interface coming soon...
        </Typography>
      </Paper>
    </Box>
  );
};

export default Chat;

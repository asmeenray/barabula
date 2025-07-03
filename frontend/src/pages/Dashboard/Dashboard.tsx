import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Dashboard page coming soon...
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;

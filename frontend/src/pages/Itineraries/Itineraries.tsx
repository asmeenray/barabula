import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Itineraries: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        My Itineraries
      </Typography>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Itineraries page coming soon...
        </Typography>
      </Paper>
    </Box>
  );
};

export default Itineraries;

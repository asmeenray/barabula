import React from 'react';
import { Box, Typography, Container, Grid, Link } from '@mui/material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              BARABULA
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your AI-powered travel companion for unforgettable journeys.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Features
            </Typography>
            <Link href="#" variant="body2" display="block">
              AI Trip Planning
            </Link>
            <Link href="#" variant="body2" display="block">
              Real-time Collaboration
            </Link>
            <Link href="#" variant="body2" display="block">
              Smart Recommendations
            </Link>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Support
            </Typography>
            <Link href="#" variant="body2" display="block">
              Help Center
            </Link>
            <Link href="#" variant="body2" display="block">
              Contact Us
            </Link>
            <Link href="#" variant="body2" display="block">
              Privacy Policy
            </Link>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Company
            </Typography>
            <Link href="#" variant="body2" display="block">
              About Us
            </Link>
            <Link href="#" variant="body2" display="block">
              Careers
            </Link>
            <Link href="#" variant="body2" display="block">
              Blog
            </Link>
          </Grid>
        </Grid>
        <Box mt={3}>
          <Typography variant="body2" color="text.secondary" align="center">
            {'Copyright © '}
            BARABULA {new Date().getFullYear()}
            {'. All rights reserved.'}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

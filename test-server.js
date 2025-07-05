const express = require('express');
const app = express();

console.log('Starting minimal server test...');

// Test basic route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route works' });
});

// Test route with parameter
app.get('/test/:id', (req, res) => {
  res.json({ id: req.params.id });
});

try {
  // Load auth routes
  console.log('Loading auth routes...');
  const authRoutes = require('./api/auth');
  app.use('/api/auth', authRoutes);
  console.log('Auth routes loaded successfully');

  // Load skills routes
  console.log('Loading skills routes...');
  const skillsRoutes = require('./api/skills');
  app.use('/api/skills', skillsRoutes);
  console.log('Skills routes loaded successfully');

  // Load assessment routes
  console.log('Loading assessment routes...');
  const assessmentRoutes = require('./api/assessment');
  app.use('/api/assessment', assessmentRoutes);
  console.log('Assessment routes loaded successfully');

  // Load progress routes
  console.log('Loading progress routes...');
  const progressRoutes = require('./api/progress');
  app.use('/api/progress', progressRoutes);
  console.log('Progress routes loaded successfully');

  // Load achievements routes
  console.log('Loading achievements routes...');
  const achievementRoutes = require('./api/achievements');
  app.use('/api/achievements', achievementRoutes);
  console.log('Achievements routes loaded successfully');

  // Load SSE routes
  console.log('Loading SSE routes...');
  const sseRoutes = require('./api/sse');
  app.use('/api/sse', sseRoutes);
  console.log('SSE routes loaded successfully');

  app.listen(3001, () => {
    console.log('Test server running on port 3001');
  });
} catch (error) {
  console.error('Error loading routes:', error);
  console.error('Stack trace:', error.stack);
}
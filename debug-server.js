const express = require('express');
const app = express();

console.log('Starting debug server...');

// Try to identify which route is causing the issue
try {
  console.log('\nTesting auth routes...');
  const authTest = express.Router();
  authTest.get('/test', (req, res) => res.json({test: 'auth'}));
  app.use('/api/auth', authTest);
  console.log('✓ Auth routes OK');
} catch (e) {
  console.error('✗ Auth routes ERROR:', e.message);
}

try {
  console.log('\nTesting skills routes...');
  const skillsTest = express.Router();
  skillsTest.get('/:id', (req, res) => res.json({id: req.params.id}));
  app.use('/api/skills', skillsTest);
  console.log('✓ Skills routes OK');
} catch (e) {
  console.error('✗ Skills routes ERROR:', e.message);
}

try {
  console.log('\nTesting progress routes...');
  const progressTest = express.Router();
  progressTest.get('/:userId/:skillId', (req, res) => res.json({userId: req.params.userId, skillId: req.params.skillId}));
  app.use('/api/progress', progressTest);
  console.log('✓ Progress routes OK');
} catch (e) {
  console.error('✗ Progress routes ERROR:', e.message);
}

try {
  console.log('\nTesting assessment routes...');
  const assessmentTest = express.Router();
  assessmentTest.get('/history/:userId', (req, res) => res.json({userId: req.params.userId}));
  app.use('/api/assessment', assessmentTest);
  console.log('✓ Assessment routes OK');
} catch (e) {
  console.error('✗ Assessment routes ERROR:', e.message);
}

// Now test the actual route files one by one
console.log('\n\nNow testing actual route files...\n');

const routes = [
  { name: 'auth', path: './api/auth' },
  { name: 'skills', path: './api/skills' },
  { name: 'assessment', path: './api/assessment' },
  { name: 'progress', path: './api/progress' },
  { name: 'achievements', path: './api/achievements' },
  { name: 'sse', path: './api/sse' }
];

for (const route of routes) {
  try {
    console.log(`Testing ${route.name} routes...`);
    const routeModule = require(route.path);
    console.log(`✓ ${route.name} routes loaded successfully`);
    
    // Try to mount it
    const testApp = express();
    testApp.use(`/api/${route.name}`, routeModule);
    console.log(`✓ ${route.name} routes mounted successfully`);
  } catch (e) {
    console.error(`✗ ${route.name} routes ERROR:`, e.message);
    console.error('Stack:', e.stack);
    break;
  }
}

console.log('\nDebug complete!');
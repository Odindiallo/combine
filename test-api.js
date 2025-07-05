const http = require('http');

const baseUrl = 'http://localhost:3001';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body)
          };
          resolve(response);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('Testing SkillForge API...\n');

  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response:`, health.body);
    console.log(`   ✓ Health check passed\n`);
  } catch (e) {
    console.log(`   ✗ Health check failed:`, e.message, '\n');
  }

  // Test 2: Register user
  console.log('2. Testing user registration...');
  try {
    const register = await makeRequest('POST', '/api/auth/register', {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log(`   Status: ${register.status}`);
    console.log(`   Response:`, register.body);
    console.log(`   ✓ Registration test completed\n`);
  } catch (e) {
    console.log(`   ✗ Registration failed:`, e.message, '\n');
  }

  // Test 3: Login
  console.log('3. Testing user login...');
  let authToken = null;
  try {
    const login = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log(`   Status: ${login.status}`);
    console.log(`   Response:`, login.body);
    if (login.body.success && login.body.data && login.body.data.token) {
      authToken = login.body.data.token;
      console.log(`   ✓ Login successful, got token\n`);
    } else {
      console.log(`   ✓ Login test completed\n`);
    }
  } catch (e) {
    console.log(`   ✗ Login failed:`, e.message, '\n');
  }

  // Test 4: Get skill categories
  console.log('4. Testing skill categories...');
  try {
    const categories = await makeRequest('GET', '/api/skills/categories');
    console.log(`   Status: ${categories.status}`);
    console.log(`   Response:`, categories.body);
    console.log(`   ✓ Categories test completed\n`);
  } catch (e) {
    console.log(`   ✗ Categories failed:`, e.message, '\n');
  }

  // Test 5: Protected route with token
  if (authToken) {
    console.log('5. Testing protected route (JWT verification)...');
    try {
      const verify = await makeRequest('GET', '/api/auth/verify', null, {
        'Authorization': `Bearer ${authToken}`
      });
      console.log(`   Status: ${verify.status}`);
      console.log(`   Response:`, verify.body);
      console.log(`   ✓ JWT verification test completed\n`);
    } catch (e) {
      console.log(`   ✗ JWT verification failed:`, e.message, '\n');
    }
  }

  // Test 6: Invalid endpoint (404)
  console.log('6. Testing 404 handler...');
  try {
    const notFound = await makeRequest('GET', '/api/invalid/endpoint');
    console.log(`   Status: ${notFound.status}`);
    console.log(`   Response:`, notFound.body);
    console.log(`   ✓ 404 handler test completed\n`);
  } catch (e) {
    console.log(`   ✗ 404 test failed:`, e.message, '\n');
  }

  console.log('API testing complete!');
  process.exit(0);
}

// Run tests
runTests().catch(console.error);
const http = require('http');

const baseUrl = 'http://localhost:3003';

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

async function testAchievements() {
  console.log('Testing achievements endpoint...\n');

  // Register user first
  console.log('1. Registering user...');
  const registerResponse = await makeRequest('POST', '/api/auth/register', {
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!'
  });
  
  if (registerResponse.status !== 200) {
    console.log('Registration failed:', registerResponse.body);
    return;
  }
  
  const token = registerResponse.body.data.token;
  console.log('✅ Registration successful');

  // Test achievements endpoint
  console.log('\n2. Testing achievements endpoint...');
  const achievementsResponse = await makeRequest('GET', '/api/achievements/', null, {
    'Authorization': `Bearer ${token}`
  });
  
  console.log(`Status: ${achievementsResponse.status}`);
  console.log('Response:', JSON.stringify(achievementsResponse.body, null, 2));
  
  if (achievementsResponse.status === 200) {
    console.log('✅ Achievements endpoint working!');
  } else {
    console.log('❌ Achievements endpoint failed');
  }
}

testAchievements().catch(console.error);
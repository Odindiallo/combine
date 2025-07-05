const http = require('http');

const baseUrl = 'http://localhost:3000';

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

async function testBackendIntegration() {
  console.log('=================================');
  console.log('SKILLFORGE INTEGRATION TESTING');
  console.log('=================================\n');

  const results = {
    backend: {},
    frontend: {},
    integration: {},
    issues: []
  };

  let authToken = null;
  let testUserId = null;
  let testSkillId = null;
  let testAssessmentId = null;

  // Test 1: Backend Health Check
  console.log('1. Backend Health Check');
  try {
    const health = await makeRequest('GET', '/health');
    if (health.status === 200) {
      console.log('   ✅ Backend server running');
      results.backend.health = 'PASS';
    } else {
      console.log('   ❌ Backend server not responding correctly');
      results.backend.health = 'FAIL';
      results.issues.push('Backend health check failed');
    }
  } catch (e) {
    console.log('   ❌ Backend server not accessible');
    results.backend.health = 'FAIL';
    results.issues.push('Backend server not accessible: ' + e.message);
  }

  // Test 2: CORS Configuration
  console.log('\n2. CORS Configuration');
  try {
    const corsTest = await makeRequest('OPTIONS', '/api/auth/register', null, {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    });
    if (corsTest.headers['access-control-allow-origin']) {
      console.log('   ✅ CORS configured');
      results.backend.cors = 'PASS';
    } else {
      console.log('   ⚠️  CORS not detected in response');
      results.backend.cors = 'WARNING';
    }
  } catch (e) {
    console.log('   ❌ CORS test failed');
    results.backend.cors = 'FAIL';
    results.issues.push('CORS configuration error: ' + e.message);
  }

  // Test 3: User Registration
  console.log('\n3. User Registration');
  try {
    const email = `integration-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    
    const register = await makeRequest('POST', '/api/auth/register', {
      email: email,
      password: password
    });
    
    if (register.status === 200 && register.body.success) {
      console.log('   ✅ User registration working');
      authToken = register.body.data.token;
      testUserId = register.body.data.user.id;
      results.backend.registration = 'PASS';
    } else {
      console.log('   ❌ User registration failed:', register.body.error);
      results.backend.registration = 'FAIL';
      results.issues.push('User registration failed: ' + register.body.error);
    }
  } catch (e) {
    console.log('   ❌ Registration request failed');
    results.backend.registration = 'FAIL';
    results.issues.push('Registration request failed: ' + e.message);
  }

  // Test 4: User Login (with same credentials)
  console.log('\n4. User Login');
  try {
    const email = `integration-test-${Date.now()-1000}@example.com`;
    const password = 'TestPassword123!';
    
    // First register the user
    await makeRequest('POST', '/api/auth/register', { email, password });
    
    // Then try to login
    const login = await makeRequest('POST', '/api/auth/login', {
      email: email,
      password: password
    });
    
    if (login.status === 200 && login.body.success) {
      console.log('   ✅ User login working');
      results.backend.login = 'PASS';
    } else {
      console.log('   ❌ User login failed:', login.body.error);
      results.backend.login = 'FAIL';
      results.issues.push('User login failed: ' + login.body.error);
    }
  } catch (e) {
    console.log('   ❌ Login request failed');
    results.backend.login = 'FAIL';
    results.issues.push('Login request failed: ' + e.message);
  }

  // Test 5: JWT Authentication
  console.log('\n5. JWT Authentication');
  if (authToken) {
    try {
      const verify = await makeRequest('GET', '/api/auth/verify', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (verify.status === 200 && verify.body.success) {
        console.log('   ✅ JWT authentication working');
        results.backend.jwt = 'PASS';
      } else {
        console.log('   ❌ JWT verification failed');
        results.backend.jwt = 'FAIL';
        results.issues.push('JWT verification failed');
      }
    } catch (e) {
      console.log('   ❌ JWT test failed');
      results.backend.jwt = 'FAIL';
      results.issues.push('JWT test failed: ' + e.message);
    }
  } else {
    console.log('   ⚠️  No auth token available for testing');
    results.backend.jwt = 'SKIP';
  }

  // Test 6: Skills Management
  console.log('\n6. Skills Management');
  try {
    // Get categories
    const categories = await makeRequest('GET', '/api/skills/categories');
    
    if (categories.status === 200 && categories.body.success) {
      console.log('   ✅ Skills categories working');
      
      // Create a skill
      if (authToken) {
        const createSkill = await makeRequest('POST', '/api/skills/create', {
          name: 'Integration Test Skill',
          category: 'Testing',
          difficulty_levels: 3,
          description: 'A skill for integration testing'
        }, {
          'Authorization': `Bearer ${authToken}`
        });
        
        if (createSkill.status === 200 && createSkill.body.success) {
          console.log('   ✅ Skill creation working');
          testSkillId = createSkill.body.data.skill.id;
          results.backend.skills = 'PASS';
        } else {
          console.log('   ❌ Skill creation failed');
          results.backend.skills = 'PARTIAL';
          results.issues.push('Skill creation failed');
        }
      }
    } else {
      console.log('   ❌ Skills categories failed');
      results.backend.skills = 'FAIL';
      results.issues.push('Skills categories failed');
    }
  } catch (e) {
    console.log('   ❌ Skills test failed');
    results.backend.skills = 'FAIL';
    results.issues.push('Skills test failed: ' + e.message);
  }

  // Test 7: Assessment System
  console.log('\n7. Assessment System');
  if (authToken && testSkillId) {
    try {
      const generateAssessment = await makeRequest('POST', '/api/assessment/generate', {
        skill_id: testSkillId,
        level: 1,
        question_count: 3
      }, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (generateAssessment.status === 200 && generateAssessment.body.success) {
        console.log('   ✅ Assessment generation working');
        testAssessmentId = generateAssessment.body.data.assessment.id;
        results.backend.assessment = 'PASS';
      } else {
        console.log('   ❌ Assessment generation failed');
        results.backend.assessment = 'FAIL';
        results.issues.push('Assessment generation failed');
      }
    } catch (e) {
      console.log('   ❌ Assessment test failed');
      results.backend.assessment = 'FAIL';
      results.issues.push('Assessment test failed: ' + e.message);
    }
  } else {
    console.log('   ⚠️  Prerequisites missing for assessment test');
    results.backend.assessment = 'SKIP';
  }

  // Test 8: Progress Tracking
  console.log('\n8. Progress Tracking');
  if (authToken && testUserId && testSkillId) {
    try {
      const updateProgress = await makeRequest('POST', '/api/progress/update', {
        user_id: testUserId,
        skill_id: testSkillId,
        xp_gained: 100,
        streak_maintained: true
      }, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (updateProgress.status === 200 && updateProgress.body.success) {
        console.log('   ✅ Progress tracking working');
        results.backend.progress = 'PASS';
      } else {
        console.log('   ❌ Progress tracking failed');
        results.backend.progress = 'FAIL';
        results.issues.push('Progress tracking failed');
      }
    } catch (e) {
      console.log('   ❌ Progress test failed');
      results.backend.progress = 'FAIL';
      results.issues.push('Progress test failed: ' + e.message);
    }
  } else {
    console.log('   ⚠️  Prerequisites missing for progress test');
    results.backend.progress = 'SKIP';
  }

  // Test 9: Achievements System
  console.log('\n9. Achievements System');
  if (authToken) {
    try {
      const achievements = await makeRequest('GET', '/api/achievements/', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (achievements.status === 200 && achievements.body.success) {
        console.log('   ✅ Achievements system working');
        results.backend.achievements = 'PASS';
      } else {
        console.log('   ❌ Achievements system failed');
        results.backend.achievements = 'FAIL';
        results.issues.push('Achievements system failed');
      }
    } catch (e) {
      console.log('   ❌ Achievements test failed');
      results.backend.achievements = 'FAIL';
      results.issues.push('Achievements test failed: ' + e.message);
    }
  } else {
    console.log('   ⚠️  No auth token for achievements test');
    results.backend.achievements = 'SKIP';
  }

  // Test 10: Database Persistence
  console.log('\n10. Database Persistence');
  if (testUserId) {
    try {
      // Check if user exists in database
      const userCheck = await makeRequest('GET', '/api/auth/verify', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (userCheck.status === 200 && userCheck.body.data.user.id === testUserId) {
        console.log('   ✅ Database persistence working');
        results.backend.database = 'PASS';
      } else {
        console.log('   ❌ Database persistence issues');
        results.backend.database = 'FAIL';
        results.issues.push('Database persistence issues');
      }
    } catch (e) {
      console.log('   ❌ Database test failed');
      results.backend.database = 'FAIL';
      results.issues.push('Database test failed: ' + e.message);
    }
  } else {
    console.log('   ⚠️  No test user ID for database test');
    results.backend.database = 'SKIP';
  }

  return results;
}

async function testFrontendFiles() {
  console.log('\n=================================');
  console.log('FRONTEND FILES CHECK');
  console.log('=================================\n');

  const fs = require('fs');
  const path = require('path');
  
  const frontendResults = {
    htmlPages: {},
    jsFiles: {},
    cssFiles: {},
    issues: []
  };

  // Check HTML pages
  const htmlPages = ['index.html', 'dashboard.html', 'assessment.html', 'achievements.html', 'progress.html'];
  
  console.log('11. HTML Pages');
  for (const page of htmlPages) {
    const filePath = path.join(__dirname, 'public', page);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.length > 100) { // Basic check for non-empty
        console.log(`   ✅ ${page} exists and has content`);
        frontendResults.htmlPages[page] = 'PASS';
      } else {
        console.log(`   ⚠️  ${page} exists but appears empty`);
        frontendResults.htmlPages[page] = 'WARNING';
        frontendResults.issues.push(`${page} appears to be empty or minimal`);
      }
    } else {
      console.log(`   ❌ ${page} missing`);
      frontendResults.htmlPages[page] = 'FAIL';
      frontendResults.issues.push(`${page} file is missing`);
    }
  }

  // Check critical JS files
  const jsFiles = ['js/main.js', 'js/api-client.js', 'js/router.js', 'js/state-manager.js'];
  
  console.log('\n12. JavaScript Files');
  for (const jsFile of jsFiles) {
    const filePath = path.join(__dirname, 'public', jsFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.length > 50) {
        console.log(`   ✅ ${jsFile} exists and has content`);
        frontendResults.jsFiles[jsFile] = 'PASS';
      } else {
        console.log(`   ⚠️  ${jsFile} exists but appears empty`);
        frontendResults.jsFiles[jsFile] = 'WARNING';
        frontendResults.issues.push(`${jsFile} appears to be empty or minimal`);
      }
    } else {
      console.log(`   ❌ ${jsFile} missing`);
      frontendResults.jsFiles[jsFile] = 'FAIL';
      frontendResults.issues.push(`${jsFile} file is missing`);
    }
  }

  // Check API client configuration
  console.log('\n13. API Client Configuration');
  const apiClientPath = path.join(__dirname, 'public', 'js', 'api-client.js');
  if (fs.existsSync(apiClientPath)) {
    const content = fs.readFileSync(apiClientPath, 'utf8');
    if (content.includes('localhost:3000') || content.includes('http://')) {
      console.log('   ✅ API client has endpoint configuration');
      frontendResults.apiClient = 'PASS';
    } else {
      console.log('   ⚠️  API client may not have proper endpoint configuration');
      frontendResults.apiClient = 'WARNING';
      frontendResults.issues.push('API client endpoint configuration unclear');
    }
  } else {
    console.log('   ❌ API client file missing');
    frontendResults.apiClient = 'FAIL';
    frontendResults.issues.push('API client file is missing');
  }

  return frontendResults;
}

async function runCompleteIntegrationTest() {
  const backendResults = await testBackendIntegration();
  const frontendResults = await testFrontendFiles();

  console.log('\n=================================');
  console.log('INTEGRATION TEST SUMMARY');
  console.log('=================================\n');

  // Count results
  const backendPassed = Object.values(backendResults.backend).filter(v => v === 'PASS').length;
  const backendTotal = Object.keys(backendResults.backend).length;
  
  const frontendPassed = Object.values({...frontendResults.htmlPages, ...frontendResults.jsFiles}).filter(v => v === 'PASS').length;
  const frontendTotal = Object.keys({...frontendResults.htmlPages, ...frontendResults.jsFiles}).length;

  console.log(`Backend Tests: ${backendPassed}/${backendTotal} PASSED`);
  console.log(`Frontend Files: ${frontendPassed}/${frontendTotal} PASSED`);
  
  const allIssues = [...backendResults.issues, ...frontendResults.issues];
  console.log(`\nTotal Issues Found: ${allIssues.length}`);
  
  if (allIssues.length > 0) {
    console.log('\nISSUES DETECTED:');
    allIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }

  return {
    backend: backendResults,
    frontend: frontendResults,
    summary: {
      backendPassed,
      backendTotal,
      frontendPassed,
      frontendTotal,
      issues: allIssues
    }
  };
}

// Run the complete test
runCompleteIntegrationTest()
  .then(results => {
    console.log('\n=================================');
    console.log('TEST COMPLETED');
    console.log('=================================');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
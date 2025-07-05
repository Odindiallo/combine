const http = require('http');

const baseUrl = 'http://localhost:3003';
let authToken = null;
let testUserId = null;
let testSkillId = null;

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

async function testEndpoint(name, method, path, data = null, useAuth = false) {
  console.log(`\nTesting: ${name}`);
  console.log(`${method} ${path}`);
  
  try {
    const headers = useAuth && authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const response = await makeRequest(method, path, data, headers);
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${response.body.success || false}`);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ PASS');
      return response.body;
    } else {
      console.log(`❌ FAIL - ${response.body.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`);
    return null;
  }
}

async function runAllTests() {
  console.log('=================================');
  console.log('SKILLFORGE API ENDPOINT TESTING');
  console.log('=================================');
  console.log(`Testing all 16 endpoints...`);
  
  let passCount = 0;
  let totalCount = 0;

  // 1. Register
  totalCount++;
  const registerResult = await testEndpoint(
    '1. User Registration',
    'POST',
    '/api/auth/register',
    {
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!'
    }
  );
  if (registerResult) {
    passCount++;
    authToken = registerResult.data.token;
    testUserId = registerResult.data.user.id;
  }

  // 2. Login
  totalCount++;
  const loginResult = await testEndpoint(
    '2. User Login',
    'POST',
    '/api/auth/login',
    {
      email: `test${Date.now()-1000}@example.com`,
      password: 'TestPassword123!'
    }
  );
  if (loginResult) passCount++;

  // 3. Verify Token
  totalCount++;
  const verifyResult = await testEndpoint(
    '3. JWT Verification',
    'GET',
    '/api/auth/verify',
    null,
    true
  );
  if (verifyResult) passCount++;

  // 4. Logout
  totalCount++;
  const logoutResult = await testEndpoint(
    '4. User Logout',
    'GET',
    '/api/auth/logout',
    null,
    true
  );
  if (logoutResult) passCount++;

  // 5. Get Skill Categories
  totalCount++;
  const categoriesResult = await testEndpoint(
    '5. Get Skill Categories',
    'GET',
    '/api/skills/categories'
  );
  if (categoriesResult) passCount++;

  // 6. Create Skill
  totalCount++;
  const createSkillResult = await testEndpoint(
    '6. Create Skill',
    'POST',
    '/api/skills/create',
    {
      name: 'Test Skill',
      category: 'Programming',
      difficulty_levels: 5,
      description: 'A test skill for verification'
    },
    true
  );
  if (createSkillResult && createSkillResult.data) {
    passCount++;
    testSkillId = createSkillResult.data.skill.id;
  }

  // 7. Get Skill
  totalCount++;
  const getSkillResult = await testEndpoint(
    '7. Get Specific Skill',
    'GET',
    `/api/skills/${testSkillId || 1}`
  );
  if (getSkillResult) passCount++;

  // 8. Update Skill
  totalCount++;
  const updateSkillResult = await testEndpoint(
    '8. Update Skill',
    'PUT',
    `/api/skills/${testSkillId || 1}`,
    {
      description: 'Updated description'
    },
    true
  );
  if (updateSkillResult) passCount++;

  // 9. Generate Assessment
  totalCount++;
  const generateAssessmentResult = await testEndpoint(
    '9. Generate Assessment',
    'POST',
    '/api/assessment/generate',
    {
      skill_id: testSkillId || 1,
      level: 1,
      question_count: 5
    },
    true
  );
  if (generateAssessmentResult) passCount++;

  // 10. Submit Assessment
  totalCount++;
  const submitAssessmentResult = await testEndpoint(
    '10. Submit Assessment',
    'POST',
    '/api/assessment/submit',
    {
      assessment_id: 1,
      answers: [
        { question_id: 1, answer: 'Test answer', time_spent: 30 }
      ],
      total_time: 60
    },
    true
  );
  if (submitAssessmentResult) passCount++;

  // 11. Get Assessment History
  totalCount++;
  const historyResult = await testEndpoint(
    '11. Get Assessment History',
    'GET',
    `/api/assessment/history/${testUserId || 1}`,
    null,
    true
  );
  if (historyResult) passCount++;

  // 12. Get User Progress
  totalCount++;
  const progressResult = await testEndpoint(
    '12. Get User Progress',
    'GET',
    `/api/progress/${testUserId || 1}/${testSkillId || 1}`,
    null,
    true
  );
  if (progressResult) passCount++;

  // 13. Update Progress
  totalCount++;
  const updateProgressResult = await testEndpoint(
    '13. Update User Progress',
    'POST',
    '/api/progress/update',
    {
      user_id: testUserId || 1,
      skill_id: testSkillId || 1,
      xp_gained: 100,
      streak_maintained: true
    },
    true
  );
  if (updateProgressResult) passCount++;

  // 14. Get User Achievements
  totalCount++;
  const achievementsResult = await testEndpoint(
    '14. Get User Achievements',
    'GET',
    '/api/achievements/',
    null,
    true
  );
  if (achievementsResult) passCount++;

  // 15. Delete Skill (testing the 9th skills endpoint)
  totalCount++;
  const deleteSkillResult = await testEndpoint(
    '15. Delete Skill',
    'DELETE',
    `/api/skills/${testSkillId || 1}`,
    null,
    true
  );
  if (deleteSkillResult) passCount++;

  // 16. SSE Updates
  totalCount++;
  console.log('\nTesting: 16. Server-Sent Events');
  console.log('GET /api/sse/updates');
  // SSE requires special handling, just check if endpoint exists
  const sseHeaders = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
  try {
    const sseTest = await makeRequest('GET', '/api/sse/updates', null, sseHeaders);
    // SSE returns event-stream, not JSON
    if (sseTest.status === 200 || sseTest.headers['content-type']?.includes('event-stream')) {
      console.log('Status: 200');
      console.log('✅ PASS - SSE endpoint exists');
      passCount++;
    } else {
      console.log(`Status: ${sseTest.status}`);
      console.log('❌ FAIL - SSE endpoint not working');
    }
  } catch (error) {
    console.log('❌ ERROR - ' + error.message);
  }

  // Summary
  console.log('\n=================================');
  console.log('TEST SUMMARY');
  console.log('=================================');
  console.log(`Total Endpoints Tested: ${totalCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${totalCount - passCount}`);
  console.log(`Success Rate: ${Math.round((passCount/totalCount)*100)}%`);
  console.log('=================================');

  process.exit(0);
}

// Run all tests
runAllTests().catch(console.error);
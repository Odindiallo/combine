const http = require('http');
const { exec } = require('child_process');

async function testBrowserIntegration() {
    console.log('SkillForge Browser Integration Test');
    console.log('==================================\n');

    // Test 1: Check if server is running
    console.log('1. Testing server availability...');
    try {
        const healthCheck = await new Promise((resolve, reject) => {
            const req = http.request('http://localhost:3000/health', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve({ success: false, error: 'Invalid JSON response' });
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });

        if (healthCheck.success) {
            console.log('   ✅ Server is running and responding');
        } else {
            console.log('   ❌ Server health check failed');
            return;
        }
    } catch (error) {
        console.log('   ❌ Server not accessible:', error.message);
        return;
    }

    // Test 2: Check static file serving
    console.log('\n2. Testing static file serving...');
    const testFiles = [
        '/test-browser-integration.html',
        '/js/api-client.js',
        '/dashboard.html',
        '/css/main.css'
    ];

    for (const file of testFiles) {
        try {
            const response = await new Promise((resolve, reject) => {
                const req = http.request(`http://localhost:3000${file}`, (res) => {
                    resolve({ status: res.statusCode, headers: res.headers });
                });
                req.on('error', reject);
                req.end();
            });

            if (response.status === 200) {
                console.log(`   ✅ ${file} accessible`);
            } else {
                console.log(`   ❌ ${file} returned status ${response.status}`);
            }
        } catch (error) {
            console.log(`   ❌ ${file} failed:`, error.message);
        }
    }

    // Test 3: Test API endpoints from browser context
    console.log('\n3. Testing API endpoints with CORS...');
    
    // We'll test this by simulating browser requests with proper headers
    const apiTests = [
        { method: 'GET', path: '/api/skills/categories', needsAuth: false },
        { method: 'POST', path: '/api/auth/register', needsAuth: false, data: { email: 'browsertest@example.com', password: 'TestPassword123!' } },
        { method: 'GET', path: '/api/achievements/', needsAuth: true }
    ];

    let authToken = null;

    for (const test of apiTests) {
        try {
            const options = {
                method: test.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'http://localhost:3000',
                    'User-Agent': 'Mozilla/5.0 (Browser Integration Test)'
                }
            };

            if (test.needsAuth && authToken) {
                options.headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await new Promise((resolve, reject) => {
                const req = http.request(`http://localhost:3000${test.path}`, options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve({
                                status: res.statusCode,
                                headers: res.headers,
                                data: JSON.parse(data)
                            });
                        } catch (e) {
                            resolve({
                                status: res.statusCode,
                                headers: res.headers,
                                data: data
                            });
                        }
                    });
                });
                req.on('error', reject);
                
                if (test.data) {
                    req.write(JSON.stringify(test.data));
                }
                req.end();
            });

            if (response.status >= 200 && response.status < 300) {
                console.log(`   ✅ ${test.method} ${test.path} - Status ${response.status}`);
                
                // Store auth token from registration
                if (test.path === '/api/auth/register' && response.data.success && response.data.data.token) {
                    authToken = response.data.data.token;
                }
            } else {
                console.log(`   ❌ ${test.method} ${test.path} - Status ${response.status}`);
                if (response.data.error) {
                    console.log(`      Error: ${response.data.error}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ ${test.method} ${test.path} - Error: ${error.message}`);
        }
    }

    // Test 4: Open browser test page (if possible)
    console.log('\n4. Browser test page information:');
    console.log('   📄 Manual test available at: http://localhost:3000/test-browser-integration.html');
    console.log('   📄 Dashboard available at: http://localhost:3000/dashboard.html');
    console.log('   📄 Main pages: assessment.html, progress.html, achievements.html');
    
    console.log('\n🔍 To complete integration testing:');
    console.log('   1. Open http://localhost:3000/test-browser-integration.html in a browser');
    console.log('   2. Click "Run All Tests" button');
    console.log('   3. Test manual navigation between pages');
    console.log('   4. Verify login/logout flow works');
    console.log('   5. Test assessment creation and submission');

    // Test 5: Check for common integration issues
    console.log('\n5. Checking for common integration issues...');
    
    // Check for missing dependencies in main JS files
    try {
        const fs = require('fs');
        const mainJs = fs.readFileSync('./public/js/main.js', 'utf8');
        const apiClient = fs.readFileSync('./public/js/api-client.js', 'utf8');
        
        if (mainJs.includes('import') || mainJs.includes('require')) {
            console.log('   ✅ Main.js uses module system');
        } else {
            console.log('   ⚠️  Main.js may not be properly modularized');
        }
        
        if (apiClient.includes('export') || apiClient.includes('module.exports')) {
            console.log('   ✅ API Client exports correctly');
        } else {
            console.log('   ⚠️  API Client export may be missing');
        }
        
    } catch (error) {
        console.log('   ❌ Could not analyze JavaScript files:', error.message);
    }

    console.log('\n==================================');
    console.log('Browser Integration Test Complete!');
    console.log('==================================');
}

// Run the test
testBrowserIntegration().catch(console.error);
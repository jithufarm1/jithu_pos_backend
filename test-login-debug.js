#!/usr/bin/env node

/**
 * Login Debug Test
 * Tests the login endpoint with EMP001 credentials
 */

const http = require('http');

const credentials = {
  employeeId: 'EMP001',
  password: 'SecurePass123!'
};

const postData = JSON.stringify(credentials);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing login with credentials:');
console.log('Employee ID:', credentials.employeeId);
console.log('Password:', credentials.password);
console.log('\nSending request to:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('---');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Status:', res.statusCode);
    console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.success) {
        console.log('\n✅ LOGIN SUCCESSFUL!');
        console.log('Employee:', parsed.employee.name);
        console.log('Role:', parsed.employee.role);
        console.log('Token received:', parsed.token ? 'Yes' : 'No');
      } else {
        console.log('\n❌ LOGIN FAILED!');
        console.log('Message:', parsed.message);
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

req.write(postData);
req.end();

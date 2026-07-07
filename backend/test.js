const assert = require('assert');
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('./server'); // Adjust this path if needed

let mongoServer;
let server;

// Suppress Mongoose deprecation warning
mongoose.set('strictQuery', false);

async function request(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: server.address().port,
      path: path,
      method: method
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  try {
    console.log('Setting up test environment...');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Disconnect existing connections
    await mongoose.disconnect();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    
    // Use a random available port
    server = app.listen(0);
    console.log(`Server is running on port ${server.address().port}`);

    console.log('Running tests...');

    // Test GET /api/industries
    const industriesRes = await request('GET', '/api/industries');
    assert.strictEqual(industriesRes.statusCode, 200);
    assert(Array.isArray(industriesRes.body), 'Response should be an array');
    console.log('GET /api/industries test passed');

    // Test GET /api/updates
    const updatesRes = await request('GET', '/api/updates');
    assert.strictEqual(updatesRes.statusCode, 200);
    assert(Array.isArray(updatesRes.body), 'Response should be an array');
    console.log('GET /api/updates test passed');

    // Test GET /api/emergency
    const emergencyRes = await request('GET', '/api/emergency');
    assert.strictEqual(emergencyRes.statusCode, 200);
    assert(Array.isArray(emergencyRes.body), 'Response should be an array');
    console.log('GET /api/emergency test passed');

    // Test GET /api/polls
    const pollsRes = await request('GET', '/api/polls');
    assert.strictEqual(pollsRes.statusCode, 200);
    assert(Array.isArray(pollsRes.body), 'Response should be an array');
    console.log('GET /api/polls test passed');

    // Test GET /api/workshops
    const workshopsRes = await request('GET', '/api/workshops');
    assert.strictEqual(workshopsRes.statusCode, 200);
    assert(Array.isArray(workshopsRes.body), 'Response should be an array');
    console.log('GET /api/workshops test passed');

    // Test GET /api/industries/:id with non-existent ID
    const nonExistentRes = await request('GET', '/api/industries/5f9f1b9b9b9b9b9b9b9b9b9b');
    assert.strictEqual(nonExistentRes.statusCode, 404);
    console.log('GET /api/industries/:id (non-existent) test passed');

    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('Cleaning up...');
    if (server) server.close();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
}

runTests();
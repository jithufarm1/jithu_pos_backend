#!/usr/bin/env node

/**
 * Test Ticket Creation
 * Verifies the ticket creation endpoint returns correct format
 */

const http = require('http');

const testTicket = {
  customerId: 'CUST-001',
  customerName: 'John Doe',
  vehicleId: 'VEH-001',
  vehicleInfo: {
    id: 'VEH-001',
    vin: '1HGBH41JXMN109186',
    year: 2021,
    make: 'Honda',
    model: 'Accord',
    licensePlate: 'ABC123'
  },
  currentMileage: 50000,
  notes: 'Test ticket',
  lineItems: [
    {
      id: '',
      serviceId: 'SVC-001',
      serviceName: 'Oil Change',
      category: 'Maintenance',
      quantity: 1,
      unitPrice: 49.99,
      lineTotal: 49.99,
      partsCost: 25.00,
      laborCost: 24.99,
      laborMinutes: 30
    }
  ],
  createdBy: 'EMP001'
};

const postData = JSON.stringify(testTicket);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/tickets',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing ticket creation...');
console.log('---');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Status:', res.statusCode);
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (res.statusCode === 201) {
        console.log('\n✅ TICKET CREATED SUCCESSFULLY!');
        console.log('Ticket ID:', parsed.id || 'MISSING!');
        console.log('Ticket Number:', parsed.ticketNumber);
        console.log('Status:', parsed.status);
        
        if (!parsed.id) {
          console.log('\n❌ ERROR: Response missing "id" field!');
        } else {
          console.log('\n✅ Response has correct "id" field');
        }
      } else {
        console.log('\n❌ TICKET CREATION FAILED!');
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

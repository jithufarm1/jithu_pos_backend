const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('mock-backend/db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Authentication endpoint
server.post('/api/auth/login', (req, res) => {
  const { employeeId, password } = req.body;
  
  console.log('Login attempt:', { employeeId, password: '***' });
  
  // Mock employee database with secure passwords
  const employees = [
    {
      id: '1',
      employeeId: 'EMP001',
      name: 'John Smith',
      role: 'Technician',
      storeId: 'STORE-001',
      password: 'SecurePass123!' // Meets all requirements
    },
    {
      id: '2',
      employeeId: 'EMP002',
      name: 'Jane Doe',
      role: 'Manager',
      storeId: 'STORE-001',
      password: 'Manager@2024' // Meets all requirements
    }
  ];
  
  const employee = employees.find(
    emp => emp.employeeId === employeeId && emp.password === password
  );
  
  if (employee) {
    const { password: _, ...employeeData} = employee; // Remove password from response
    
    // Generate JWT-like token with expiration (48 hours)
    const now = Date.now();
    const tokenExpiration = now + (48 * 60 * 60 * 1000); // 48 hours
    const token = `jwt.${Buffer.from(JSON.stringify({
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
      iat: now,
      exp: tokenExpiration
    })).toString('base64')}.signature`;
    
    console.log('Login successful:', employeeData.name, `(token expires in 48h)`);
    
    res.json({
      success: true,
      employee: employeeData,
      token: token,
      tokenExpiration: tokenExpiration
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid employee ID or password'
    });
  }
});

// Token refresh endpoint
server.post('/api/auth/refresh', (req, res) => {
  const { employeeId, currentToken } = req.body;
  
  console.log('Token refresh attempt:', { employeeId });
  
  // Mock employee database
  const employees = [
    {
      id: '1',
      employeeId: 'EMP001',
      name: 'John Smith',
      role: 'Technician',
      storeId: 'STORE-001'
    },
    {
      id: '2',
      employeeId: 'EMP002',
      name: 'Jane Doe',
      role: 'Manager',
      storeId: 'STORE-001'
    }
  ];
  
  const employee = employees.find(emp => emp.employeeId === employeeId);
  
  if (employee && currentToken) {
    // Generate new JWT-like token with fresh expiration (48 hours)
    const now = Date.now();
    const tokenExpiration = now + (48 * 60 * 60 * 1000); // 48 hours
    const token = `jwt.${Buffer.from(JSON.stringify({
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
      iat: now,
      exp: tokenExpiration
    })).toString('base64')}.signature`;
    
    console.log('Token refresh successful:', employee.name, `(new token expires in 48h)`);
    
    res.json({
      success: true,
      employee: employee,
      token: token,
      tokenExpiration: tokenExpiration
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid token refresh request'
    });
  }
});

// PIN setup endpoint
server.post('/api/auth/pin/setup', (req, res) => {
  const { employeeId, pinHash } = req.body;
  
  console.log('PIN setup request:', { employeeId });
  
  // In a real system, this would store the PIN hash in the database
  // For mock purposes, we just acknowledge success
  res.json({
    success: true,
    message: 'PIN setup successful'
  });
});

// Override codes endpoint (for managers)
server.get('/api/auth/override-codes', (req, res) => {
  const { employeeId } = req.query;
  
  console.log('Override codes request:', { employeeId });
  
  // Only managers get override codes
  if (employeeId === 'EMP002') {
    const now = Date.now();
    const codes = [
      {
        code: 'MGR-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        validFrom: new Date(now),
        validUntil: new Date(now + 7 * 24 * 60 * 60 * 1000), // 7 days
        managerID: employeeId
      },
      {
        code: 'MGR-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        validFrom: new Date(now),
        validUntil: new Date(now + 7 * 24 * 60 * 60 * 1000),
        managerID: employeeId
      },
      {
        code: 'MGR-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        validFrom: new Date(now),
        validUntil: new Date(now + 7 * 24 * 60 * 60 * 1000),
        managerID: employeeId
      }
    ];
    
    res.json({
      success: true,
      codes
    });
  } else {
    res.status(403).json({
      success: false,
      message: 'Only managers can request override codes'
    });
  }
});

// Emergency token generation endpoint
server.post('/api/auth/emergency-token', (req, res) => {
  const { employeeId } = req.body;
  
  console.log('Emergency token request:', { employeeId });
  
  // Generate emergency token
  const token = 'EMG-' + Math.random().toString(36).substring(2, 15).toUpperCase();
  
  res.json({
    success: true,
    token,
    validityDays: 30
  });
});

// Audit log sync endpoint
server.post('/api/audit/sync', (req, res) => {
  const { logs } = req.body;
  
  console.log('Audit log sync:', { count: logs?.length || 0 });
  
  // In a real system, this would store the logs in the database
  // For mock purposes, we just acknowledge success
  res.json({
    success: true,
    synced: logs?.length || 0
  });
});

// Custom routes for the API
server.get('/api/vehicles/reference-data', (req, res) => {
  const db = router.db;
  res.json(db.get('reference-data').value());
});

server.get('/api/vehicles/:vin', (req, res) => {
  const db = router.db;
  const vehicle = db.get('vehicles').find({ vin: req.params.vin }).value();
  if (vehicle) {
    res.json(vehicle);
  } else {
    res.status(404).json({ error: 'Vehicle not found' });
  }
});

server.get('/api/vehicles', (req, res) => {
  const db = router.db;
  const { year, make, model } = req.query;
  
  let vehicles = db.get('vehicles').value();
  
  if (year) {
    vehicles = vehicles.filter(v => v.year === parseInt(year));
  }
  if (make) {
    vehicles = vehicles.filter(v => v.make.toLowerCase() === make.toLowerCase());
  }
  if (model) {
    vehicles = vehicles.filter(v => v.model.toLowerCase() === model.toLowerCase());
  }
  
  if (vehicles.length > 0) {
    res.json(vehicles[0]); // Return first match as single object
  } else {
    res.status(404).json({ error: 'Vehicle not found' });
  }
});

// Customer endpoints
server.get('/api/customers', (req, res) => {
  const db = router.db;
  const { q, phone, email, lastName, vin, plate } = req.query;
  
  let customers = db.get('customers').value() || [];
  
  // Search by various criteria
  if (phone) {
    customers = customers.filter(c => c.phone === phone);
  } else if (email) {
    customers = customers.filter(c => c.email.toLowerCase() === email.toLowerCase());
  } else if (lastName) {
    customers = customers.filter(c => 
      c.lastName.toLowerCase().includes(lastName.toLowerCase())
    );
  } else if (vin) {
    customers = customers.filter(c => 
      c.vehicles && c.vehicles.some(v => v.vin === vin)
    );
  } else if (plate) {
    customers = customers.filter(c => 
      c.vehicles && c.vehicles.some(v => v.licensePlate === plate)
    );
  } else if (q) {
    const searchTerm = q.toLowerCase();
    customers = customers.filter(c => 
      c.firstName.toLowerCase().includes(searchTerm) ||
      c.lastName.toLowerCase().includes(searchTerm) ||
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm)
    );
  }
  
  // Convert to CustomerSummary format
  const summaries = customers.map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    phone: c.phone,
    email: c.email,
    lastVisit: c.lastVisitDate,
    totalVisits: c.totalVisits,
    primaryVehicle: c.vehicles && c.vehicles.find(v => v.isPrimary) 
      ? `${c.vehicles.find(v => v.isPrimary).make} ${c.vehicles.find(v => v.isPrimary).model}`
      : undefined,
    loyaltyTier: c.loyaltyProgram?.tier
  }));
  
  // Sort by last visit date descending
  summaries.sort((a, b) => {
    if (!a.lastVisit) return 1;
    if (!b.lastVisit) return -1;
    return new Date(b.lastVisit) - new Date(a.lastVisit);
  });
  
  res.json(summaries);
});

server.get('/api/customers/:id', (req, res) => {
  const db = router.db;
  const customer = db.get('customers').find({ id: req.params.id }).value();
  if (customer) {
    res.json(customer);
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

server.post('/api/customers', (req, res) => {
  const db = router.db;
  const newCustomer = {
    ...req.body,
    id: `CUST-${Date.now()}`,
    createdDate: new Date().toISOString(),
    totalVisits: 0,
    totalSpent: 0,
    vehicles: []
  };
  
  db.get('customers').push(newCustomer).write();
  res.status(201).json(newCustomer);
});

server.put('/api/customers/:id', (req, res) => {
  const db = router.db;
  const customer = db.get('customers').find({ id: req.params.id }).value();
  
  if (customer) {
    const updated = { ...customer, ...req.body, id: req.params.id };
    db.get('customers').find({ id: req.params.id }).assign(updated).write();
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

server.delete('/api/customers/:id', (req, res) => {
  const db = router.db;
  db.get('customers').remove({ id: req.params.id }).write();
  res.status(204).send();
});

server.get('/api/customers/:id/history', (req, res) => {
  const db = router.db;
  const customer = db.get('customers').find({ id: req.params.id }).value();
  
  if (customer && customer.vehicles) {
    // Collect all service records from all vehicles
    const allRecords = customer.vehicles.flatMap(v => v.serviceHistory || []);
    // Sort by date descending
    allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(allRecords);
  } else {
    res.json([]);
  }
});

server.post('/api/customers/:id/vehicles', (req, res) => {
  const db = router.db;
  const customer = db.get('customers').find({ id: req.params.id }).value();
  
  if (customer) {
    const newVehicle = {
      ...req.body,
      id: `VEH-${Date.now()}`,
      addedDate: new Date().toISOString(),
      serviceHistory: []
    };
    
    if (!customer.vehicles) {
      customer.vehicles = [];
    }
    
    // If first vehicle, set as primary
    if (customer.vehicles.length === 0) {
      newVehicle.isPrimary = true;
    }
    
    customer.vehicles.push(newVehicle);
    db.get('customers').find({ id: req.params.id }).assign(customer).write();
    res.status(201).json(newVehicle);
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

server.patch('/api/customers/:id/loyalty', (req, res) => {
  const db = router.db;
  const customer = db.get('customers').find({ id: req.params.id }).value();
  
  if (customer) {
    if (!customer.loyaltyProgram) {
      customer.loyaltyProgram = {
        memberId: `LOY-${Date.now()}`,
        points: 0,
        tier: 'Bronze',
        joinDate: new Date().toISOString()
      };
    }
    
    customer.loyaltyProgram.points = req.body.points;
    
    // Recalculate tier
    if (customer.loyaltyProgram.points >= 5000) {
      customer.loyaltyProgram.tier = 'Platinum';
    } else if (customer.loyaltyProgram.points >= 2500) {
      customer.loyaltyProgram.tier = 'Gold';
    } else if (customer.loyaltyProgram.points >= 1000) {
      customer.loyaltyProgram.tier = 'Silver';
    } else {
      customer.loyaltyProgram.tier = 'Bronze';
    }
    
    db.get('customers').find({ id: req.params.id }).assign(customer).write();
    res.json(customer.loyaltyProgram);
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

// Service Catalog endpoints
server.get('/api/service-catalog', (req, res) => {
  const db = router.db;
  const catalog = db.get('service-catalog').value();
  res.json(catalog);
});

server.get('/api/service-catalog/services', (req, res) => {
  const db = router.db;
  const { category, search } = req.query;
  let services = db.get('service-catalog.services').value() || [];
  
  if (category) {
    services = services.filter(s => s.category === category);
  }
  
  if (search) {
    const searchTerm = search.toLowerCase();
    services = services.filter(s => 
      s.name.toLowerCase().includes(searchTerm) ||
      s.description.toLowerCase().includes(searchTerm) ||
      s.code.toLowerCase().includes(searchTerm) ||
      s.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
  
  res.json(services);
});

server.get('/api/service-catalog/services/:id', (req, res) => {
  const db = router.db;
  const service = db.get('service-catalog.services')
    .find({ id: req.params.id })
    .value();
  
  if (service) {
    res.json(service);
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

// Service Ticket endpoints
server.get('/api/tickets', (req, res) => {
  const db = router.db;
  const { 
    ticketNumber, 
    customerId, 
    vehicleId, 
    status, 
    technicianId,
    startDate,
    endDate,
    page = 1,
    limit = 50
  } = req.query;
  
  let tickets = db.get('tickets').value() || [];
  
  // Apply filters
  if (ticketNumber) {
    tickets = tickets.filter(t => t.ticketNumber.includes(ticketNumber));
  }
  if (customerId) {
    tickets = tickets.filter(t => t.customerId === customerId);
  }
  if (vehicleId) {
    tickets = tickets.filter(t => t.vehicleId === vehicleId);
  }
  if (status) {
    tickets = tickets.filter(t => t.status === status);
  }
  if (technicianId) {
    tickets = tickets.filter(t => t.technicianId === technicianId);
  }
  if (startDate) {
    tickets = tickets.filter(t => new Date(t.createdDate) >= new Date(startDate));
  }
  if (endDate) {
    tickets = tickets.filter(t => new Date(t.createdDate) <= new Date(endDate));
  }
  
  // Sort by creation date descending
  tickets.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
  
  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedTickets = tickets.slice(startIndex, endIndex);
  
  res.json({
    tickets: paginatedTickets,
    total: tickets.length,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(tickets.length / limitNum)
  });
});

server.get('/api/tickets/:id', (req, res) => {
  const db = router.db;
  const ticket = db.get('tickets').find({ ticketId: req.params.id }).value();
  
  if (ticket) {
    res.json(ticket);
  } else {
    res.status(404).json({ error: 'Ticket not found' });
  }
});

server.post('/api/tickets', (req, res) => {
  const db = router.db;
  const ticketId = `TKT-${Date.now()}`;
  const newTicket = {
    ...req.body,
    id: ticketId,  // Frontend expects 'id'
    ticketId: ticketId,  // Keep ticketId for backward compatibility
    ticketNumber: `T${Date.now().toString().slice(-8)}`,
    status: 'Created',
    createdDate: new Date().toISOString(),
    statusHistory: [
      {
        status: 'Created',
        timestamp: new Date().toISOString(),
        changedBy: req.body.createdBy
      }
    ]
  };
  
  db.get('tickets').push(newTicket).write();
  res.status(201).json(newTicket);
});

server.put('/api/tickets/:id', (req, res) => {
  const db = router.db;
  const ticket = db.get('tickets').find({ ticketId: req.params.id }).value();
  
  if (ticket) {
    const updated = { 
      ...ticket, 
      ...req.body, 
      ticketId: req.params.id,
      lastModifiedDate: new Date().toISOString()
    };
    db.get('tickets').find({ ticketId: req.params.id }).assign(updated).write();
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Ticket not found' });
  }
});

server.patch('/api/tickets/:id/status', (req, res) => {
  const db = router.db;
  const ticket = db.get('tickets').find({ ticketId: req.params.id }).value();
  
  if (ticket) {
    const { status, changedBy } = req.body;
    
    ticket.status = status;
    ticket.lastModifiedDate = new Date().toISOString();
    
    if (!ticket.statusHistory) {
      ticket.statusHistory = [];
    }
    
    ticket.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      changedBy
    });
    
    db.get('tickets').find({ ticketId: req.params.id }).assign(ticket).write();
    res.json(ticket);
  } else {
    res.status(404).json({ error: 'Ticket not found' });
  }
});

server.delete('/api/tickets/:id', (req, res) => {
  const db = router.db;
  const ticket = db.get('tickets').find({ ticketId: req.params.id }).value();
  
  if (ticket && ticket.status === 'Created') {
    db.get('tickets').remove({ ticketId: req.params.id }).write();
    res.status(204).send();
  } else if (ticket) {
    res.status(400).json({ error: 'Can only delete tickets with Created status' });
  } else {
    res.status(404).json({ error: 'Ticket not found' });
  }
});

server.get('/api/tickets/:id/recommendations', (req, res) => {
  // Mock recommendations based on vehicle mileage
  const recommendations = [
    {
      serviceId: 'SVC-013',
      serviceName: 'Engine Air Filter Replacement',
      category: 'Filters',
      reason: 'Mileage_Due',
      priority: 'High',
      estimatedPrice: 39.99,
      dueAtMileage: 15000
    },
    {
      serviceId: 'SVC-014',
      serviceName: 'Cabin Air Filter Replacement',
      category: 'Filters',
      reason: 'Time_Due',
      priority: 'Medium',
      estimatedPrice: 44.99
    }
  ];
  
  res.json(recommendations);
});

// Appointments endpoints
server.get('/api/appointments', (req, res) => {
  const db = router.db;
  const { date, status, customerId, technicianId } = req.query;
  
  let appointments = db.get('appointments').value() || [];
  
  // Apply filters
  if (date) {
    appointments = appointments.filter(a => a.date === date);
  }
  if (status) {
    appointments = appointments.filter(a => a.status === status);
  }
  if (customerId) {
    appointments = appointments.filter(a => a.customerId === customerId);
  }
  if (technicianId) {
    appointments = appointments.filter(a => a.technicianId === technicianId);
  }
  
  // Sort by date and time
  appointments.sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
  
  res.json(appointments);
});

server.get('/api/appointments/:id', (req, res) => {
  const db = router.db;
  const appointment = db.get('appointments').find({ id: req.params.id }).value();
  
  if (appointment) {
    res.json(appointment);
  } else {
    res.status(404).json({ error: 'Appointment not found' });
  }
});

server.post('/api/appointments', (req, res) => {
  const db = router.db;
  const newAppointment = {
    ...req.body,
    id: `APT-${Date.now()}`,
    status: req.body.status || 'Scheduled',
    createdDate: new Date().toISOString()
  };
  
  // Initialize appointments array if it doesn't exist
  if (!db.has('appointments').value()) {
    db.set('appointments', []).write();
  }
  
  db.get('appointments').push(newAppointment).write();
  console.log('Appointment created:', newAppointment.id);
  res.status(201).json(newAppointment);
});

server.put('/api/appointments/:id', (req, res) => {
  const db = router.db;
  const appointment = db.get('appointments').find({ id: req.params.id }).value();
  
  if (appointment) {
    const updated = { 
      ...appointment, 
      ...req.body, 
      id: req.params.id,
      lastModifiedDate: new Date().toISOString()
    };
    db.get('appointments').find({ id: req.params.id }).assign(updated).write();
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Appointment not found' });
  }
});

server.patch('/api/appointments/:id/status', (req, res) => {
  const db = router.db;
  const appointment = db.get('appointments').find({ id: req.params.id }).value();
  
  if (appointment) {
    const { status } = req.body;
    appointment.status = status;
    appointment.lastModifiedDate = new Date().toISOString();
    
    db.get('appointments').find({ id: req.params.id }).assign(appointment).write();
    res.json(appointment);
  } else {
    res.status(404).json({ error: 'Appointment not found' });
  }
});

server.delete('/api/appointments/:id', (req, res) => {
  const db = router.db;
  const appointment = db.get('appointments').find({ id: req.params.id }).value();
  
  if (appointment) {
    db.get('appointments').remove({ id: req.params.id }).write();
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Appointment not found' });
  }
});

// Vehicle Data Caching Endpoints
const { generateVehicleChunk, generateCatalog } = require('./vehicle-data-generator');

// Get catalog of available chunks
server.get('/api/vehicle-data/catalog', (req, res) => {
  console.log('Fetching vehicle data catalog');
  const catalog = generateCatalog();
  
  res.json({
    success: true,
    catalog,
    totalChunks: catalog.length,
    generatedAt: new Date().toISOString()
  });
});

// Get specific chunk data
server.get('/api/vehicle-data/chunk/:chunkId', (req, res) => {
  const { chunkId } = req.params;
  console.log('Fetching chunk:', chunkId);
  
  // Parse chunkId (format: "2024-honda")
  const [year, make] = chunkId.split('-');
  
  if (!year || !make) {
    return res.status(400).json({
      success: false,
      error: 'Invalid chunk ID format. Expected: year-make'
    });
  }
  
  const vehicles = generateVehicleChunk(parseInt(year), 
    make.charAt(0).toUpperCase() + make.slice(1));
  
  // Simulate network delay (500ms-1s)
  const delay = 500 + Math.random() * 500;
  setTimeout(() => {
    res.json({
      success: true,
      chunkId,
      year: parseInt(year),
      make: make.charAt(0).toUpperCase() + make.slice(1),
      vehicles,
      vehicleCount: vehicles.length,
      generatedAt: new Date().toISOString()
    });
  }, delay);
});

// Search vehicles across chunks (optional - for testing)
server.get('/api/vehicle-data/search', (req, res) => {
  const { year, make, model } = req.query;
  console.log('Searching vehicles:', { year, make, model });
  
  if (!year || !make) {
    return res.status(400).json({
      success: false,
      error: 'Year and make are required'
    });
  }
  
  const vehicles = generateVehicleChunk(parseInt(year), make);
  let results = vehicles;
  
  if (model) {
    results = vehicles.filter(v => 
      v.model.toLowerCase().includes(model.toLowerCase())
    );
  }
  
  res.json({
    success: true,
    results,
    count: results.length
  });
});

// Use default router for other routes
server.use(router);

server.listen(3000, () => {
  console.log('JSON Server is running on http://localhost:3000');
  console.log('API Endpoints:');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/refresh');
  console.log('  GET /api/vehicle-data/catalog');
  console.log('  GET /api/vehicle-data/chunk/:chunkId');
  console.log('  GET /api/vehicle-data/search?year=&make=&model=');
  console.log('  GET /api/vehicles/reference-data');
  console.log('  GET /api/vehicles/:vin');
  console.log('  GET /api/vehicles?year=&make=&model=');
  console.log('  GET /api/customers');
  console.log('  GET /api/customers/:id');
  console.log('  POST /api/customers');
  console.log('  PUT /api/customers/:id');
  console.log('  DELETE /api/customers/:id');
  console.log('  GET /api/customers/:id/history');
  console.log('  POST /api/customers/:id/vehicles');
  console.log('  PATCH /api/customers/:id/loyalty');
  console.log('  GET /api/appointments');
  console.log('  GET /api/appointments/:id');
  console.log('  POST /api/appointments');
  console.log('  PUT /api/appointments/:id');
  console.log('  PATCH /api/appointments/:id/status');
  console.log('  DELETE /api/appointments/:id');
  console.log('  GET /api/service-catalog');
  console.log('  GET /api/service-catalog/services');
  console.log('  GET /api/service-catalog/services/:id');
  console.log('  GET /api/tickets');
  console.log('  GET /api/tickets/:id');
  console.log('  POST /api/tickets');
  console.log('  PUT /api/tickets/:id');
  console.log('  PATCH /api/tickets/:id/status');
  console.log('  DELETE /api/tickets/:id');
  console.log('  GET /api/tickets/:id/recommendations');
});

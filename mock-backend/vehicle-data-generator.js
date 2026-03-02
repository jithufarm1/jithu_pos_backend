// Generates realistic mock vehicle data chunks

function generateVehicleChunk(year, make) {
  const models = {
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey'],
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma'],
    'Ford': ['F-150', 'Escape', 'Explorer', 'Mustang', 'Edge'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Tahoe'],
    'Nissan': ['Altima', 'Rogue', 'Sentra', 'Pathfinder', 'Frontier']
  };

  const vehicles = [];
  const makeModels = models[make] || ['Model1', 'Model2', 'Model3'];

  makeModels.forEach(model => {
    // Generate 3-5 trims per model
    const trimCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < trimCount; i++) {
      const trims = ['Base', 'LX', 'EX', 'Sport', 'Touring', 'Limited'];
      vehicles.push({
        year,
        make,
        model,
        trim: trims[i % trims.length],
        engine: `${2.0 + i * 0.4}L ${i % 2 === 0 ? 'I4' : 'V6'}`,
        transmission: i % 2 === 0 ? 'Automatic' : 'Manual',
        drivetrain: i % 3 === 0 ? 'AWD' : 'FWD',
        fuelType: 'Gasoline',
        bodyClass: model.includes('Truck') || model.includes('150') ? 'Pickup' : 'Sedan',
        vin: `1HGBH41JXMN${year}${i.toString().padStart(5, '0')}`
      });
    }
  });

  return vehicles;
}

function generateCatalog() {
  const catalog = [];
  const makes = ['Honda', 'Toyota', 'Ford', 'Chevrolet', 'Nissan'];
  const currentYear = new Date().getFullYear();

  // Generate chunks for last 10 years
  for (let year = currentYear; year >= currentYear - 10; year--) {
    makes.forEach(make => {
      const chunkId = `${year}-${make.toLowerCase()}`;
      const vehicles = generateVehicleChunk(year, make);
      const uncompressedSize = JSON.stringify(vehicles).length;
      
      catalog.push({
        chunkId,
        year,
        make,
        vehicleCount: vehicles.length,
        uncompressedSize,
        compressedSize: Math.floor(uncompressedSize * 0.3), // 70% compression
        lastModified: new Date().toISOString(),
        version: '1.0'
      });
    });
  }

  return catalog;
}

module.exports = { generateVehicleChunk, generateCatalog };

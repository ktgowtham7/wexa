const { driver } = require('./db');

const seedData = async () => {
  const session = driver.session();
  try {
    console.log('Clearing existing database contents...');
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('Database cleared.');

    console.log('Seeding countries...');
    await session.run(`
      CREATE (c1:Country {id: 'US', name: 'United States', region: 'North America'})
      CREATE (c2:Country {id: 'TW', name: 'Taiwan', region: 'East Asia'})
      CREATE (c3:Country {id: 'DE', name: 'Germany', region: 'Europe'})
      CREATE (c4:Country {id: 'CN', name: 'China', region: 'East Asia'})
      CREATE (c5:Country {id: 'VN', name: 'Vietnam', region: 'Southeast Asia'})
    `);

    console.log('Seeding suppliers...');
    await session.run(`
      CREATE (s1:Supplier {id: 'sup-1', name: 'Apex Semiconductors', riskLevel: 'High', status: 'Active'})
      CREATE (s2:Supplier {id: 'sup-2', name: 'LithiumTech Cells', riskLevel: 'Medium', status: 'Active'})
      CREATE (s3:Supplier {id: 'sup-3', name: 'GlassOptics Corp', riskLevel: 'Low', status: 'Active'})
      CREATE (s4:Supplier {id: 'sup-4', name: 'EuroCircuit Boards', riskLevel: 'Low', status: 'Active'})
      CREATE (s5:Supplier {id: 'sup-5', name: 'AsiaPrecision Plastics', riskLevel: 'Medium', status: 'Active'})
    `);

    console.log('Seeding components...');
    await session.run(`
      CREATE (comp1:Component {id: 'comp-1', name: 'A16 ARM Processor', type: 'Processor', cost: 120})
      CREATE (comp2:Component {id: 'comp-2', name: '4500mAh Li-Polymer Battery', type: 'Battery', cost: 35})
      CREATE (comp3:Component {id: 'comp-3', name: 'OLED Display Panel', type: 'Display', cost: 85})
      CREATE (comp4:Component {id: 'comp-4', name: 'Main Logic Board Assembly', type: 'PCB', cost: 45})
      CREATE (comp5:Component {id: 'comp-5', name: 'Gorilla Glass Front Shield', type: 'Glass', cost: 15})
      CREATE (comp6:Component {id: 'comp-6', name: 'Polycarbonate Chassis Frame', type: 'Housing', cost: 10})
    `);

    console.log('Seeding facilities...');
    await session.run(`
      CREATE (f1:Facility {id: 'fac-1', name: 'Hsinchu Silicon Fab 5', type: 'Wafer Fab', status: 'Active'})
      CREATE (f2:Facility {id: 'fac-2', name: 'Shenzhen Assembly Center', type: 'Assembly & Test', status: 'Active'})
      CREATE (f3:Facility {id: 'fac-3', name: 'Hanoi Final Packaging Plant', type: 'Packaging', status: 'Active'})
    `);

    console.log('Seeding products...');
    await session.run(`
      CREATE (p1:Product {id: 'prod-1', name: 'Nebula Pro Smartphone', sku: 'NEB-PRO-128', price: 999})
      CREATE (p2:Product {id: 'prod-2', name: 'Nebula Lite Tablet', sku: 'NEB-LIT-256', price: 599})
    `);

    console.log('Seeding customers...');
    await session.run(`
      CREATE (cust1:Customer {id: 'cust-1', name: 'Omni Retailers Corp', importance: 'Key'})
      CREATE (cust2:Customer {id: 'cust-2', name: 'Global Tech Distro Ltd', importance: 'Key'})
      CREATE (cust3:Customer {id: 'cust-3', name: 'Direct Sales Europe', importance: 'Standard'})
      CREATE (cust4:Customer {id: 'cust-4', name: 'Direct Sales Asia-Pacific', importance: 'Standard'})
    `);

    console.log('Creating relationships...');
    // Connect Suppliers to Countries
    await session.run(`
      MATCH (s:Supplier {id: 'sup-1'}), (c:Country {id: 'TW'}) CREATE (s)-[:LOCATED_IN]->(c)
      WITH true MATCH (s:Supplier {id: 'sup-2'}), (c:Country {id: 'CN'}) CREATE (s)-[:LOCATED_IN]->(c)
      WITH true MATCH (s:Supplier {id: 'sup-3'}), (c:Country {id: 'TW'}) CREATE (s)-[:LOCATED_IN]->(c)
      WITH true MATCH (s:Supplier {id: 'sup-4'}), (c:Country {id: 'DE'}) CREATE (s)-[:LOCATED_IN]->(c)
      WITH true MATCH (s:Supplier {id: 'sup-5'}), (c:Country {id: 'VN'}) CREATE (s)-[:LOCATED_IN]->(c)
    `);

    // Connect Facilities to Countries
    await session.run(`
      MATCH (f:Facility {id: 'fac-1'}), (c:Country {id: 'TW'}) CREATE (f)-[:LOCATED_IN]->(c)
      WITH true MATCH (f:Facility {id: 'fac-2'}), (c:Country {id: 'CN'}) CREATE (f)-[:LOCATED_IN]->(c)
      WITH true MATCH (f:Facility {id: 'fac-3'}), (c:Country {id: 'VN'}) CREATE (f)-[:LOCATED_IN]->(c)
    `);

    // Connect Suppliers to Components (SUPPLIES)
    await session.run(`
      MATCH (s:Supplier {id: 'sup-1'}), (c:Component {id: 'comp-1'}) CREATE (s)-[:SUPPLIES]->(c)
      WITH true MATCH (s:Supplier {id: 'sup-2'}), (c:Component {id: 'comp-2'}) CREATE (s)-[:SUPPLIES]->(c)
      WITH true MATCH (s:Supplier {id: 'sup-3'}), (c:Component {id: 'comp-3'}) CREATE (s)-[:SUPPLIES]->(c)
      WITH true MATCH (s:Supplier {id: 'sup-3'}), (c:Component {id: 'comp-5'}) CREATE (s)-[:SUPPLIES]->(c)
      WITH true MATCH (s:Supplier {id: 'sup-4'}), (c:Component {id: 'comp-4'}) CREATE (s)-[:SUPPLIES]->(c)
      WITH true MATCH (s:Supplier {id: 'sup-5'}), (c:Component {id: 'comp-6'}) CREATE (s)-[:SUPPLIES]->(c)
    `);

    // Connect Components to Products (PART_OF)
    await session.run(`
      MATCH (c:Component {id: 'comp-1'}), (p:Product {id: 'prod-1'}) CREATE (c)-[:PART_OF]->(p)
      WITH true MATCH (c:Component {id: 'comp-2'}), (p:Product {id: 'prod-1'}) CREATE (c)-[:PART_OF]->(p)
      WITH true MATCH (c:Component {id: 'comp-3'}), (p:Product {id: 'prod-1'}) CREATE (c)-[:PART_OF]->(p)
      WITH true MATCH (c:Component {id: 'comp-4'}), (p:Product {id: 'prod-1'}) CREATE (c)-[:PART_OF]->(p)
      WITH true MATCH (c:Component {id: 'comp-5'}), (p:Product {id: 'prod-1'}) CREATE (c)-[:PART_OF]->(p)
      WITH true MATCH (c:Component {id: 'comp-6'}), (p:Product {id: 'prod-1'}) CREATE (c)-[:PART_OF]->(p)
      
      WITH true MATCH (c:Component {id: 'comp-2'}), (p:Product {id: 'prod-2'}) CREATE (c)-[:PART_OF]->(p)
      WITH true MATCH (c:Component {id: 'comp-3'}), (p:Product {id: 'prod-2'}) CREATE (c)-[:PART_OF]->(p)
      WITH true MATCH (c:Component {id: 'comp-4'}), (p:Product {id: 'prod-2'}) CREATE (c)-[:PART_OF]->(p)
      WITH true MATCH (c:Component {id: 'comp-6'}), (p:Product {id: 'prod-2'}) CREATE (c)-[:PART_OF]->(p)
    `);

    // Connect Facilities to Products (MANUFACTURES)
    await session.run(`
      MATCH (f:Facility {id: 'fac-1'}), (p:Product {id: 'prod-1'}) CREATE (f)-[:MANUFACTURES]->(p)
      WITH true MATCH (f:Facility {id: 'fac-2'}), (p:Product {id: 'prod-1'}) CREATE (f)-[:MANUFACTURES]->(p)
      WITH true MATCH (f:Facility {id: 'fac-3'}), (p:Product {id: 'prod-1'}) CREATE (f)-[:MANUFACTURES]->(p)
      
      WITH true MATCH (f:Facility {id: 'fac-2'}), (p:Product {id: 'prod-2'}) CREATE (f)-[:MANUFACTURES]->(p)
      WITH true MATCH (f:Facility {id: 'fac-3'}), (p:Product {id: 'prod-2'}) CREATE (f)-[:MANUFACTURES]->(p)
    `);

    // Connect Products to Customers (SHIPS_TO)
    await session.run(`
      MATCH (p:Product {id: 'prod-1'}), (cust:Customer {id: 'cust-1'}) CREATE (p)-[:SHIPS_TO]->(cust)
      WITH true MATCH (p:Product {id: 'prod-1'}), (cust:Customer {id: 'cust-2'}) CREATE (p)-[:SHIPS_TO]->(cust)
      WITH true MATCH (p:Product {id: 'prod-1'}), (cust:Customer {id: 'cust-3'}) CREATE (p)-[:SHIPS_TO]->(cust)
      
      WITH true MATCH (p:Product {id: 'prod-2'}), (cust:Customer {id: 'cust-2'}) CREATE (p)-[:SHIPS_TO]->(cust)
      WITH true MATCH (p:Product {id: 'prod-2'}), (cust:Customer {id: 'cust-4'}) CREATE (p)-[:SHIPS_TO]->(cust)
    `);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await session.close();
    await driver.close();
  }
};

seedData();

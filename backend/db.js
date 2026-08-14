const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.COGNODB_URI;
const user = process.env.COGNODB_USER;
const password = process.env.COGNODB_PASSWORD;

if (!uri || !user || !password) {
  console.error("Error: Missing CognoDB credentials in environment variables.");
  process.exit(1);
}

// Create neo4j driver instance using the official bolt connection protocol
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// Verify connection
const checkConnection = async () => {
  const session = driver.session();
  try {
    const result = await session.run('RETURN 1 AS num');
    console.log('Successfully connected to CognoDB instance:', result.records[0].get('num').toNumber());
  } catch (error) {
    console.error('Failed to connect to CognoDB instance:', error);
    process.exit(1);
  } finally {
    await session.close();
  }
};

module.exports = {
  driver,
  checkConnection
};

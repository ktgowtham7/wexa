const express = require('express');
const cors = require('cors');
const { driver, checkConnection } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Test DB Connection on startup
checkConnection();

/**
 * GET /api/graph
 * Fetches all nodes and relationships to build the visualization graph.
 */
app.get('/api/graph', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (n)
      OPTIONAL MATCH (n)-[r]->(m)
      RETURN n, r, m
    `);

    const nodesMap = new Map();
    const edges = [];

    result.records.forEach(record => {
      const node = record.get('n');
      const rel = record.get('r');
      const targetNode = record.get('m');

      if (node) {
        nodesMap.set(node.properties.id, {
          id: node.properties.id,
          labels: node.labels,
          properties: node.properties
        });
      }

      if (targetNode) {
        nodesMap.set(targetNode.properties.id, {
          id: targetNode.properties.id,
          labels: targetNode.labels,
          properties: targetNode.properties
        });
      }

      if (rel) {
        edges.push({
          id: rel.elementId || `${rel.startNodeElementId}-${rel.endNodeElementId}`,
          source: node.properties.id,
          target: targetNode.properties.id,
          type: rel.type,
          properties: rel.properties
        });
      }
    });

    res.json({
      nodes: Array.from(nodesMap.values()),
      edges
    });
  } catch (error) {
    console.error('Error fetching graph:', error);
    res.status(500).json({ error: 'Failed to fetch graph data' });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/simulate-disruption
 * Traces downstream impact path (multi-hop traversal) when a node is disrupted.
 */
app.post('/api/simulate-disruption', async (req, res) => {
  const { nodeIds } = req.body; // Array of node IDs to disrupt
  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return res.status(400).json({ error: 'nodeIds must be a non-empty array' });
  }

  const session = driver.session();
  try {
    // Multi-hop path traversal query (1 to 5 hops downstream)
    // Finding everything downstream linked by SUPPLIES, PART_OF, MANUFACTURES, or SHIPS_TO
    const result = await session.run(`
      MATCH path = (origin)-[:SUPPLIES|PART_OF|SHIPS_TO|MANUFACTURES*1..5]->(affected)
      WHERE origin.id IN $nodeIds
      RETURN path
    `, { nodeIds });

    const affectedNodeIds = new Set(nodeIds);
    const affectedEdges = new Set();

    result.records.forEach(record => {
      const path = record.get('path');
      path.segments.forEach(segment => {
        affectedNodeIds.add(segment.start.properties.id);
        affectedNodeIds.add(segment.end.properties.id);
        const rel = segment.relationship;
        affectedEdges.add(rel.elementId || `${rel.startNodeElementId}-${rel.endNodeElementId}`);
      });
    });

    res.json({
      affectedNodeIds: Array.from(affectedNodeIds),
      affectedEdges: Array.from(affectedEdges)
    });
  } catch (error) {
    console.error('Disruption simulation failed:', error);
    res.status(500).json({ error: 'Simulation query failed' });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/high-risk-paths
 * Find products reliant on High Risk suppliers (un awkward relational query)
 */
app.get('/api/high-risk-paths', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (s:Supplier {riskLevel: 'High'})-[:SUPPLIES]->(c:Component)-[:PART_OF]->(p:Product)
      RETURN s.name AS supplier, c.name AS component, p.name AS product
    `);

    const paths = result.records.map(rec => ({
      supplier: rec.get('supplier'),
      component: rec.get('component'),
      product: rec.get('product')
    }));

    res.json(paths);
  } catch (error) {
    console.error('High risk paths query failed:', error);
    res.status(500).json({ error: 'High risk paths query failed' });
  } finally {
    await session.close();
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

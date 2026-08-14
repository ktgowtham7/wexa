import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';

function App() {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [highRiskPaths, setHighRiskPaths] = useState([]);
  const [simulationActive, setSimulationActive] = useState(false);
  const [affectedNodes, setAffectedNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load Graph Data & High Risk Paths on mount
  useEffect(() => {
    fetchGraphData();
    fetchHighRiskPaths();
  }, []);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/graph');
      const data = await res.json();
      setGraphData(data);
    } catch (err) {
      console.error('Error fetching graph:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHighRiskPaths = async () => {
    try {
      const res = await fetch('/api/high-risk-paths');
      const data = await res.json();
      setHighRiskPaths(data);
    } catch (err) {
      console.error('Error fetching high risk paths:', err);
    }
  };

  // Initialize graph once data is loaded and canvas is visible (loading is false)
  useEffect(() => {
    if (!loading && graphData.nodes.length > 0) {
      initGraph(graphData.nodes, graphData.edges);
    }
  }, [loading, graphData]);

  // Maps node label to colors
  const getColorForLabels = (labels, isDisrupted, isUnaffectedInSimulation) => {
    if (isDisrupted) return { background: '#ef4444', border: '#b91c1c', hover: '#f87171' };
    
    let baseColor = '#64748b'; // default country/other
    if (labels.includes('Supplier')) baseColor = '#f59e0b';
    else if (labels.includes('Facility')) baseColor = '#06b6d4';
    else if (labels.includes('Component')) baseColor = '#8b5cf6';
    else if (labels.includes('Product')) baseColor = '#f97316';
    else if (labels.includes('Customer')) baseColor = '#10b981';

    if (isUnaffectedInSimulation) {
      // Fade out unaffected nodes during active simulation
      return {
        background: `${baseColor}30`,
        border: 'rgba(255, 255, 255, 0.05)',
        hover: baseColor
      };
    }

    return {
      background: baseColor,
      border: 'rgba(255, 255, 255, 0.2)',
      hover: baseColor
    };
  };

  const initGraph = (nodes, edges, activeSimulation = false, affectedIds = []) => {
    if (!containerRef.current) return;

    // Transform nodes for vis-network
    const visNodes = nodes.map(node => {
      const isDisrupted = activeSimulation && affectedIds.includes(node.id);
      const isUnaffected = activeSimulation && !affectedIds.includes(node.id);
      const labelText = node.properties.name || node.id;
      
      const colors = getColorForLabels(node.labels, isDisrupted, isUnaffected);

      return {
        id: node.id,
        label: labelText,
        shape: 'dot',
        size: node.labels.includes('Product') || node.labels.includes('Customer') ? 24 : 18,
        color: {
          background: colors.background,
          border: colors.border,
          highlight: {
            background: colors.background,
            border: '#ffffff'
          },
          hover: {
            background: colors.hover,
            border: '#ffffff'
          }
        },
        font: {
          color: isUnaffected ? '#94a3b840' : '#f8fafc',
          size: 14,
          face: 'Plus Jakarta Sans'
        },
        shadow: isDisrupted ? { enabled: true, color: '#ef4444', size: 15, x: 0, y: 0 } : { enabled: false },
        title: `Type: ${node.labels.join(', ')}\nID: ${node.id}`
      };
    });

    // Transform edges
    const visEdges = edges.map(edge => {
      const isAffected = activeSimulation && affectedIds.includes(edge.source) && affectedIds.includes(edge.target);
      const isUnaffected = activeSimulation && !isAffected;

      return {
        id: edge.id,
        from: edge.source,
        to: edge.target,
        label: edge.type,
        arrows: 'to',
        color: isAffected 
          ? { color: '#ef4444', highlight: '#ef4444', opacity: 1.0, inherit: false }
          : { color: 'rgba(255, 255, 255, 0.15)', opacity: isUnaffected ? 0.05 : 0.4 },
        font: {
          color: isUnaffected ? 'rgba(148, 163, 184, 0.05)' : '#94a3b8',
          size: 10,
          face: 'Plus Jakarta Sans',
          strokeWidth: 0
        },
        width: isAffected ? 3 : 1
      };
    });

    const data = { nodes: visNodes, edges: visEdges };

    const options = {
      physics: {
        stabilization: true,
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.3,
          springLength: 120,
          springConstant: 0.04
        }
      },
      interaction: {
        hover: true,
        selectConnectedEdges: false
      }
    };

    if (networkRef.current) {
      networkRef.current.destroy();
    }
    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Node Selection Handler
    network.on('selectNode', (params) => {
      const nodeId = params.nodes[0];
      const match = nodes.find(n => n.id === nodeId);
      if (match) {
        setSelectedNode(match);
      }
    });

    network.on('deselectNode', () => {
      setSelectedNode(null);
    });
  };

  const triggerDisruption = async (nodeId) => {
    try {
      const res = await fetch('/api/simulate-disruption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeIds: [nodeId] })
      });
      const data = await res.json();
      
      setSimulationActive(true);
      setAffectedNodes(data.affectedNodeIds);
      
      // Re-initialize graph with simulation view active
      initGraph(graphData.nodes, graphData.edges, true, data.affectedNodeIds);
    } catch (err) {
      console.error('Failed to trigger simulation:', err);
    }
  };

  const resetSimulation = () => {
    setSimulationActive(false);
    setAffectedNodes([]);
    initGraph(graphData.nodes, graphData.edges, false, []);
  };

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <div className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">W</div>
          <div className="logo-text">
            <h1>Wexa Supply Chain</h1>
            <p>Risk & Disruption Visualizer</p>
          </div>
        </div>

        {/* Legend Panel */}
        <div className="panel">
          <h3 className="section-title">Network Legend</h3>
          <div className="legend-grid">
            <div className="legend-item"><span className="legend-dot supplier"></span> Supplier</div>
            <div className="legend-item"><span className="legend-dot facility"></span> Facility</div>
            <div className="legend-item"><span className="legend-dot component"></span> Component</div>
            <div className="legend-item"><span className="legend-dot product"></span> Product</div>
            <div className="legend-item"><span className="legend-dot customer"></span> Customer</div>
            {simulationActive && (
              <div className="legend-item"><span className="legend-dot disrupted"></span> Impacted Node</div>
            )}
          </div>
        </div>

        {/* Node Inspector */}
        <div className="panel node-inspector">
          <h3 className="section-title">Node Inspector</h3>
          {!selectedNode ? (
            <p className="inspector-placeholder">Select any node on the graph to view properties and simulate disruptions.</p>
          ) : (
            <div className="inspector-data">
              <div className="inspector-header">
                <strong>{selectedNode.properties.name || selectedNode.id}</strong>
                <span className={`node-tag ${selectedNode.labels[0].toLowerCase()}`}>
                  {selectedNode.labels[0]}
                </span>
              </div>
              <div className="prop-list">
                <div className="prop-row">
                  <span className="prop-label">ID</span>
                  <span className="prop-value">{selectedNode.id}</span>
                </div>
                {Object.entries(selectedNode.properties)
                  .filter(([key]) => key !== 'name' && key !== 'id')
                  .map(([key, val]) => (
                    <div className="prop-row" key={key}>
                      <span className="prop-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <span className="prop-value">{val.toString()}</span>
                    </div>
                  ))}
              </div>
              
              {/* Disrupt action for vulnerable entities (Supplier / Facility) */}
              {(selectedNode.labels.includes('Supplier') || selectedNode.labels.includes('Facility')) && (
                <button 
                  className="btn-disrupt"
                  onClick={() => triggerDisruption(selectedNode.id)}
                >
                  Simulate Disruption
                </button>
              )}
            </div>
          )}
        </div>

        {/* Multi-hop Risk Path Analysis */}
        <div className="panel">
          <h3 className="section-title">High-Risk Pathways</h3>
          <div className="risk-list">
            {highRiskPaths.length === 0 ? (
              <p className="inspector-placeholder" style={{ fontSize: '0.75rem' }}>No high-risk paths detected.</p>
            ) : (
              highRiskPaths.map((path, idx) => (
                <div className="risk-item" key={idx}>
                  Product <span>{path.product}</span> depends on <span>{path.component}</span> from High-Risk Supplier <span>{path.supplier}</span>.
                </div>
              ))
            )}
          </div>
        </div>

        {simulationActive && (
          <button className="btn-reset" onClick={resetSimulation}>
            Reset Simulation
          </button>
        )}
      </div>

      {/* Main Viewport Graph */}
      <div className="main-viewport" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {loading && (
          <div className="loading-container" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, background: 'var(--bg-primary)' }}>
            <div className="spinner"></div>
            <p>Connecting to CognoDB instance & drawing graph...</p>
          </div>
        )}
        <div className="top-bar">
          <div className="badge-container">
            <div className="badge">
              Nodes: <span>{graphData.nodes.length}</span>
            </div>
            <div className="badge">
              Edges: <span>{graphData.edges.length}</span>
            </div>
            {simulationActive && (
              <div className="badge impact-alert">
                ⚠️ Disruption Active: <span>{affectedNodes.length - 1} downstream nodes impacted</span>
              </div>
            )}
          </div>
        </div>
        <div className="instructions-overlay">
          <strong>Interactive Controls</strong>
          <ul>
            <li>Drag to pan the workspace.</li>
            <li>Scroll to zoom in/out.</li>
            <li>Click a node to inspect and trigger downstream disruption simulations.</li>
          </ul>
        </div>
        <div className="graph-canvas" ref={containerRef} />
      </div>
    </div>
  );
}

export default App;

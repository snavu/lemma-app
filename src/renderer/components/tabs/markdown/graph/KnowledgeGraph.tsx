import './knowledge-graph.css'
import ForceGraph3D from '3d-force-graph';
import { useEffect, useRef, useState } from 'react';

interface KnowledgeGraphProps {
  onChange?: (content: string, hashtags: string[], klinks: string[]) => void;
  graphJsonPath: string;
  graphRefreshTrigger?: number; // Added prop to trigger refreshes
}

// Define the graph data structure
interface GraphData {
  nodes: Array<{
    id: string;
    [key: string]: any;
  }>;
  links: Array<{
    source: string;
    target: string;
    [key: string]: any;
  }>;
}

const KnowledgeGraph = ({ graphJsonPath, onChange, graphRefreshTrigger = 0 }: KnowledgeGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const graphInstanceRef = useRef<any>(null);

  const loadGraphData = async () => {
    try {
      if (!graphJsonPath) {
        setError('Graph path is not available');
        return;
      }

      console.log('Loading graph data from:', graphJsonPath);
      const fileContent = await window.electron.fs.readFile(graphJsonPath);
      
      // Parse the JSON content
      const data = JSON.parse(fileContent) as GraphData;
      console.log('Graph data loaded:', data);
      setGraphData(data);
    } catch (err) {
      console.error('Error loading graph data:', err);
      setError(`Failed to load graph data: ${err}`);
    }
  };

  // Load graph data when path changes or refreshTrigger changes
  useEffect(() => {
    loadGraphData();
  }, [graphJsonPath, graphRefreshTrigger]);

  useEffect(() => {
    // Only initialize the graph when we have data and a container
    if (!containerRef.current || !graphData) return;

    // Cleanup any previous instances that might be in the container
    containerRef.current.innerHTML = '';

    // Calculate the width and height based on the container
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Initialize the graph
    const graph = new ForceGraph3D(containerRef.current)
      .graphData(graphData)
      .width(width)
      .height(height)
      .backgroundColor("#1d2026")
      .nodeColor(() => "#4169E1") // Default color for nodes
      //.nodeColor(((node: any) => node.type === 'user' ? "#41E1B9" : "#4169E1")) // Different color based on node type
      .nodeRelSize(4) // node size
      .linkColor(() => "#d8d8d8")
      .nodeResolution(16)
      .nodeLabel((node: any) => node.name)
      .onNodeClick((node: any) => {
        // Handle node click - you could navigate to the note
        console.log('Node clicked:', node);
      });

    // Store the graph instance reference
    graphInstanceRef.current = graph;

    // Set initial camera position
    setTimeout(() => {
      const graphBbox = graph.getGraphBbox();
      if (graphBbox) {
        const maxDim = Math.max(
          graphBbox.x[1] - graphBbox.x[0],
          graphBbox.y[1] - graphBbox.y[0],
          graphBbox.z[1] - graphBbox.z[0]
        );

        const distance = maxDim * 2;

        graph.cameraPosition(
          { x: 0, y: 0, z: distance },
          { x: 0, y: 0, z: 0 },
          1000
        );
      } else {
        graph.cameraPosition(
          { x: 0, y: 0, z: 1000 },
          { x: 0, y: 0, z: 0 },
          0
        );
      }
    }, 300);


  }, [graphData]);

  if (error) {
    return (
      <div className="knowledge-graph-error">
        <p>Error: {error}</p>
        <button onClick={loadGraphData}>Retry</button>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="knowledge-graph-loading">
        <p>Loading graph data...</p>
      </div>
    );
  }

  return (
    <div className="knowledge-graph" ref={containerRef}></div>
  );
};

export default KnowledgeGraph;
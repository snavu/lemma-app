import './knowledge-graph.css'
import ForceGraph3D from '3d-force-graph';
import { useEffect, useRef } from 'react';

interface KnowledgeGraphProps {
  Nodes: any[]
  Edges: any[]
}

const KnowledgeGraph = ({ Nodes, Edges }: KnowledgeGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    // Create the graph when the component mounts and the graph data is loaded
    if (containerRef.current && graphRef.current === null) {
      // Sample data
      const N = 300;
      const gData = {
        nodes: [...Array(N).keys()].map(i => ({ id: i })),
        links: [...Array(N).keys()]
          .filter(id => id)
          .map(id => ({
            source: id,
            target: Math.round(Math.random() * (id - 1))
          }))
      };

      // Calculate the width and height based on the container
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      // Initialize the graph with explicit dimensions
      graphRef.current = new ForceGraph3D(containerRef.current)
        .width(width)
        .height(height)
        .backgroundColor("#1d2026")
        .graphData(gData)

      // Set initial camera position farther away to get a zoomed-out view
      // The setTimeout ensures the graph has had time to initialize properly
      setTimeout(() => {
        if (graphRef.current) {
          // Get the current bounding box of the graph to determine a good distance
          const graphBbox = graphRef.current.getGraphBbox();
          if (graphBbox) {
            // Calculate a distance based on the graph size
            const maxDim = Math.max(
              graphBbox.x[1] - graphBbox.x[0],
              graphBbox.y[1] - graphBbox.y[0],
              graphBbox.z[1] - graphBbox.z[0]
            );
            
            // Set camera position further away (multiplier controls zoom level)
            const distance = maxDim * 2.2; // Increase this value to zoom out more
            
            graphRef.current.cameraPosition(
              { x: 0, y: 0, z: distance }, // Position
              { x: 0, y: 0, z: 0 },        // Look-at point (center of the graph)
              1000                          // Transition duration in ms
            );
          } else {
            // Fallback if graph bbox isn't available yet
            graphRef.current.cameraPosition(
              { x: 0, y: 0, z: 1000 },
              { x: 0, y: 0, z: 0 },
              0
            );
          }
        }
      }, 300);
      
 
    }
  }, []);

  return (
    <div className="knowledge-graph" ref={containerRef}></div>
  );
};

export default KnowledgeGraph;
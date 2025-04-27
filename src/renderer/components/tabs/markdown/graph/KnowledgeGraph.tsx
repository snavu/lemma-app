import './knowledge-graph.css'
import ForceGraph3D from '3d-force-graph';
import { useEffect, useRef } from 'react';

interface KnowledgeGraphProps {
  graphJsonPath: string;
}

const KnowledgeGraph = ({ graphJsonPath }: KnowledgeGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup any previous instances that might be in the container
    containerRef.current.innerHTML = '';

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

    // Initialize the graph
    const graph = new ForceGraph3D(containerRef.current)
      .jsonUrl(graphJsonPath)
      .width(width)
      .height(height)
      .backgroundColor("#1d2026")
      .nodeColor(() => "#4169E1") // Royal blue color
      .nodeRelSize(4) //  node size
      .linkColor(() => "#d8d8d8")
      .nodeResolution(16)
      // .graphData(gData); // Sample data

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

  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div className="knowledge-graph" ref={containerRef}></div>
  );
};

export default KnowledgeGraph;
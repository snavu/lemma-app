import './knowledge-graph.css';
import React, { useEffect, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import * as THREE from 'three';
import { FileInfo } from 'src/renderer/hooks/useFiles';

interface KnowledgeGraphProps {
  graphJsonPath: string;
  graphRefreshTrigger?: number;
  files?: FileInfo[]; // Add files prop
  onFileSelect?: (filePath: string) => void; // Add onFileSelect prop
  notesDirectory?: string; // Add notes directory path
}

interface GraphData {
  nodes: Array<{ id: string; name?: string;[key: string]: any }>;
  links: Array<{ source: string; target: string;[key: string]: any }>;
}

const KnowledgeGraph = ({
  graphJsonPath,
  graphRefreshTrigger = 0,
  files = [],
  onFileSelect,
  notesDirectory
}: KnowledgeGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGraphData = async () => {
    try {
      if (!graphJsonPath) {
        setError('Graph path is not available');
        return;
      }

      console.log('Loading graph data from:', graphJsonPath);
      const fileContent = await window.electron.fs.readFile(graphJsonPath);
      const data = JSON.parse(fileContent) as GraphData;
      console.log('Graph data loaded:', data);
      setGraphData(data);
    } catch (err) {
      console.error('Error loading graph data:', err);
      setError(`Failed to load graph data: ${err}`);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, [graphJsonPath, graphRefreshTrigger]);

  useEffect(() => {
    if (!fgRef.current) return;

    const composer = fgRef.current.postProcessingComposer?.();
    if (composer) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        2,  // strength
        0.4,  // radius
        0.1   // threshold
      );
      composer.addPass(bloomPass);
    }
  }, [graphData !== null]); // re-run when data is loaded

  // Function to find a file by its name
  const findFileByName = (nodeName: string): string | undefined => {
    if (!files || !files.length) return undefined;

    const exactMatch = files.find(file => {
      const fileName = file.name.toLowerCase();
      return fileName === `${nodeName.toLowerCase()}`;
    });

    if (exactMatch) return exactMatch.path;
  };

  return (
    <div className="knowledge-graph" ref={containerRef}>
      {graphData && (
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          width={containerRef.current?.clientWidth || window.innerWidth}
          height={containerRef.current?.clientHeight || window.innerHeight}
          backgroundColor="#020305"
          nodeColor={() => "#4270fc"}
          nodeRelSize={4}
          linkColor={() => "#bababa"}
          nodeResolution={16}
          nodeLabel={(node: any) => node.name || node.id}
          onNodeClick={(node: any) => {
            console.log('Node clicked:', node);

            // If we have onFileSelect prop and node has a name property
            if (onFileSelect && node.name) {
              const filePath = findFileByName(node.name);

              if (filePath) {
                console.log('Opening file:', filePath);
                onFileSelect(filePath);
              } else {
                console.log('No matching file found for node:', node.name);
              }
            }
          }}
        />
      )}
      {!graphData && !error && (
        <div className="knowledge-graph-loading">
          <p>Loading graph data...</p>
        </div>
      )}
      {error && (
        <div className="knowledge-graph-error">
          <p>Error: {error}</p>
          <button onClick={loadGraphData}>Retry</button>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph;
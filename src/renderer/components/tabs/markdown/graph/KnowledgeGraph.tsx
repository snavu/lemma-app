import './knowledge-graph.css';
import React, { useEffect, useRef, useState, memo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import * as THREE from 'three';
import { FileInfo } from 'src/renderer/hooks/useFiles';

interface KnowledgeGraphProps {
  graphJsonPath: string;
  graphRefreshTrigger?: number;
  files?: FileInfo[];
  onFileSelect?: (filePath: string) => void;
  notesDirectory?: string;
  focusNodeId?: string; // Prop to receive active file name for highlighting
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
  focusNodeId,
}: KnowledgeGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  const loadGraphData = async () => {
    try {
      if (!graphJsonPath) {
        setError('Graph path is not available');
        return;
      }

      const fileContent = await window.electron.fs.readFile(graphJsonPath);
      const data = JSON.parse(fileContent) as GraphData;
      setGraphData(data);
    } catch (err) {
      console.error('Error loading graph data:', err);
      setError(`Failed to load graph data: ${err}`);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, [graphJsonPath]);

  // Handle initial graph data loading - try to focus on active file when data first loads
  useEffect(() => {
    // This effect runs when graphData changes from null to populated
    if (graphData && focusNodeId) {
      const nodeToFocus = findNodeByFileName(focusNodeId);
      if (nodeToFocus) {
        setHighlightedNode(nodeToFocus.id);

        // Use a longer delay for initial graph stabilization
        setTimeout(() => {
          focusOnNode(nodeToFocus);
        }, 600);
      }
    }
  }, [!!graphData]); // Only runs when graphData goes from falsy to truthy


  const refreshGraphData = async () => {
    try {
      if (!graphJsonPath) {
        setError('Graph path is not available');
        return;
      }

      const fileContent = await window.electron.fs.readFile(graphJsonPath);
      const data = JSON.parse(fileContent) as GraphData;

      if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
        console.log('Setting initial graph data');
        setGraphData(data);
        return;
      }

      // Get the old data
      const oldNodes = graphData?.nodes || [];
      const oldLinks = graphData?.links || [];
      const newNodes = data.nodes || [];
      const newLinks = data.links || [];

      // Find added nodes (in new data but not in old data)
      const addedNodes = newNodes.filter(newNode =>
        !oldNodes.some(oldNode => oldNode.id === newNode.id)
      );

      // Find added links (in new data but not in old data)
      const addedLinks = newLinks.filter(newLink =>
        !oldLinks.some(oldLink =>
          oldLink.source === newLink.source && oldLink.target === newLink.target
        )
      );

      // Find removed nodes (in old data but not in new data)
      const removedNodeIds = oldNodes
        .filter(oldNode => !newNodes.some(newNode => newNode.id === oldNode.id))
        .map(node => node.id);

      // Find removed links (in old data but not in new data)
      const removedLinkIndices = oldLinks
        .map((oldLink, index) => {
          const exists = newLinks.some(newLink =>
            newLink.source === oldLink.source && newLink.target === oldLink.target
          );
          return exists ? -1 : index;
        })
        .filter(index => index !== -1);

      // Update the graph data with additions and removals
      setGraphData(prevData => {
        if (!prevData) return data; // If no previous data, just use the new data

        // Keep nodes that weren't removed and add new ones
        const updatedNodes = prevData.nodes
          .filter(node => !removedNodeIds.includes(node.id))
          .concat(addedNodes);

        // Keep links that weren't removed and add new ones
        const updatedLinks = prevData.links
          .filter((_, index) => !removedLinkIndices.includes(index))
          .concat(addedLinks);

        return {
          nodes: updatedNodes,
          links: updatedLinks
        };
      });

      console.log('Graph data refreshed with additions and removals');

    } catch (err) {
      console.error('Error refreshing graph data:', err);
      setError(`Failed to refresh graph data: ${err}`);
    }
  };

  useEffect(() => {
    if (graphRefreshTrigger) {
      refreshGraphData();
    }
  }, [graphRefreshTrigger]);


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

  // Find node by file name
  const findNodeByFileName = (fileName: string) => {
    if (!graphData || !graphData.nodes || !fileName) return null;

    return graphData.nodes.find(node => {
      // If node has name property, check if it matches the file name
      // You might need to adjust this depending on how node names are formatted
      if (node.name) {
        return node.name.toLowerCase() === fileName.toLowerCase();
      }

    });
  };

  // Function to find a file by its name
  const findFileByNodeName = (nodeName: string): string | undefined => {
    if (!files || !files.length) return undefined;

    const exactMatch = files.find(file => {
      const fileName = file.name.toLowerCase();
      return fileName === `${nodeName.toLowerCase()}`;
    });

    if (exactMatch) return exactMatch.path;
  };

  // Function to focus camera on a node
  const focusOnNode = (node: any) => {
    if (!fgRef.current) return;

    // Disable navigation controls temporarily
    if (fgRef.current.controls) {
      fgRef.current.controls().enabled = false;
    }

    // Calculate distance ratio for positioning
    const distance = 400;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    // Calculate new position
    const newPos = node.x || node.y || node.z
      ? {
        x: node.x * distRatio,
        y: node.y * distRatio,
        z: node.z * distRatio
      }
      : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

    // Animate camera to focus on node
    fgRef.current.cameraPosition(
      newPos,           // new position
      node,             // lookAt ({ x, y, z })
      3000              // ms transition duration
    );

    // Re-enable navigation controls after animation completes
    setTimeout(() => {
      if (fgRef.current && fgRef.current.controls) {
        fgRef.current.controls().enabled = true;
      }
    }, 3000);
  };

  const openFile = (nodeName: string) => {
    // If we have onFileSelect prop and node has a name property
    if (onFileSelect && nodeName) {
      const filePath = findFileByNodeName(nodeName);

      if (filePath) {
        console.log('Opening file:', filePath);
        onFileSelect(filePath);
      } else {
        console.log('No matching file found for node:', nodeName);
      }
    }
  }

  // Effect to focus on node when focusNodeId changes
  useEffect(() => {
    if (!focusNodeId || !graphData) return;

    // Find the node matching the focusNodeId
    const nodeToFocus = findNodeByFileName(focusNodeId);

    if (nodeToFocus) {
      setHighlightedNode(nodeToFocus.id);
      setTimeout(() => {
        focusOnNode(nodeToFocus);
      }, 200);
    }
  }, [focusNodeId]);

  return (
    <div className="knowledge-graph" ref={containerRef}>
      {graphData && (
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          width={containerRef.current?.clientWidth || window.innerWidth}
          height={containerRef.current?.clientHeight || window.innerHeight}
          backgroundColor="#020305"
          linkColor={() => "#bababa"}
          nodeResolution={16}
          nodeLabel={(node: any) => node.name || node.id}
          onNodeClick={(node: any) => {

            // Set this node as highlighted
            setHighlightedNode(node.id);

            // Focus the camera on the clicked node
            focusOnNode(node);

            // Open the file associated with the node
            openFile(node.name);

          }}
          nodeThreeObject={(node: any) => {
            // Create a sphere for the node
            const material = new THREE.MeshLambertMaterial({
              color: node.id === highlightedNode ? "#96b0ff" : "#4270fc",
              transparent: true,
              opacity: 0.9
            });

            // Make highlighted nodes larger
            const size = node.id === highlightedNode ? 6 : 4;
            const geometry = new THREE.SphereGeometry(size);
            return new THREE.Mesh(geometry, material);
          }}
          nodeThreeObjectExtend={false}
        />
      )}
      {!graphData && !error && (
        <div className="knowledge-graph">
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

// Use React.memo to prevent unnecessary re-renders
export default memo(KnowledgeGraph);
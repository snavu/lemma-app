import './knowledge-graph.css';
import React, { useEffect, useRef, useState, memo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import * as THREE from 'three';
import { FileInfo } from 'src/renderer/hooks/useFiles';
import elementResizeDetectorMaker from 'element-resize-detector';

interface KnowledgeGraphProps {
  graphJsonPath: string;
  graphRefreshTrigger?: number;
  files?: FileInfo[];
  onFileSelect?: (filePath: string) => void;
  notesDirectory?: string;
  focusNodeName?: string; // Prop to receive active file name for highlighting
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
  focusNodeName,
}: KnowledgeGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({
    width: containerRef.current?.clientWidth || window.innerWidth,
    height: containerRef.current?.clientHeight || window.innerHeight,
  });

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
    if (graphData && focusNodeName) {
      console.log('Graph data loaded, focusing on node:', focusNodeName);
      const nodeToFocus = findNodeByFileName(focusNodeName);
      if (nodeToFocus) {
        // Use a longer delay for initial graph stabilization
        setTimeout(() => {
          setHighlightedNode(nodeToFocus.id);
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
      if (node.name) {
        return node.name === fileName;
      }
      else {
        return null;
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

    if (exactMatch) {
      return exactMatch.path;
    }
    else {
      return null;
    }
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
      2000              // ms transition duration
    );

    // Re-enable navigation controls after animation completes
    setTimeout(() => {
      if (fgRef.current && fgRef.current.controls) {
        fgRef.current.controls().enabled = true;
      }
    }, 2000);
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

  // Effect to focus on node when focusNodeName changes
  useEffect(() => {
    if (!focusNodeName || !graphData) return;
    console.log('Focus node ID changed:', focusNodeName);
    // Find the node matching the focusNodeName
    const nodeToFocus = findNodeByFileName(focusNodeName);
    if (nodeToFocus) {
      setTimeout(() => {
        setHighlightedNode(nodeToFocus.id);
        focusOnNode(nodeToFocus);
      }, 200);
    }
  }, [focusNodeName]);

  useEffect(() => {
    if (!containerRef.current) return;

    const erd = elementResizeDetectorMaker();

    erd.listenTo(containerRef.current, (element) => {
      setDimensions({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    });

    return () => {
      erd.removeAllListeners(containerRef.current!);
    };
  }, []);

  return (
    <div className="knowledge-graph" ref={containerRef}>
      {graphData && (
        <ForceGraph3D
        
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width || window.innerWidth}
          height={dimensions.height || window.innerHeight}
          backgroundColor="#020305"
          linkColor={(link) => {
            // Define colors for edges based on source node type
            const edgeColors: any = {
              user: "#4270fc",      // Blue for user connections
              assisted: "#ff9800",  // Orange for assisted connections
              generated: "#e74c3c", // Red for generated connections
              default: "#bababa"    // Light gray for default
            };

            // Get the source node
            const sourceNode = typeof link.source === 'object' ? link.source :
              graphData.nodes.find(node => node.id === link.source);

            // Return color based on source node type with lower opacity
            return sourceNode && sourceNode.type
              ? `${edgeColors[sourceNode.type]}80` // 80 is hex for 50% opacity
              : `${edgeColors.default}80`;
          }} nodeResolution={16}
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
            // Define base colors for different node types
            const baseColors: any = {
              user: "#4270fc",      // Blue for user nodes
              assisted: "#ff9800",  // Orange for assisted nodes
              generated: "#e74c3c", // Red for generated nodes
              default: "#4270fc"    // Default to blue for nodes without a type
            };

            // Define brighter versions for highlighted state
            const brightColors: any = {
              user: "#96b0ff",      // Brighter blue 
              assisted: "#ffb74d",  // Brighter orange
              generated: "#ff6b6b", // Brighter red
              default: "#96b0ff"    // Default to brighter blue
            };

            // Determine the node color based on type and highlight state
            const nodeType = node.type;
            const nodeColor = node.id === highlightedNode
              ? brightColors[nodeType]
              : baseColors[nodeType];

            // Create material with the determined color
            const material = new THREE.MeshLambertMaterial({
              color: nodeColor,
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
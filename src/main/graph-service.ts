import * as fs from 'fs';
import * as path from 'path';
import * as fileService from './file-service';
import { viewMode } from 'src/shared/types';

// Types for graph data
interface Node {
    id: number;
    name: string;
    type: string;
}

interface Link {
    source: number;
    target: number;
    type: string;
}

interface GraphData {
    nodes: Node[];
    links: Link[];
}

/**
 *  note: mode is used to determine which graph.json file to use
 *        - 'main' for the main graph.json
 *        - 'generated' for the generated graph.json
 *        graph-loader.ts is called when the user selects new notes directory
 *        and the mode passed is 'main'
 *        the user should not select the generated directory
 *        the generated directory syncs using the sync-agi.ts functions
 *        and we may refactor the sync-agi.ts functions to use this function by passing the mode as 'generated' 
 *        
 */


// Helper function to read graph.json
const readGraphJson = (mode: viewMode): GraphData | null => {
    const graphPath = fileService.getGraphJsonPath(mode);
    if (!graphPath || !fs.existsSync(graphPath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(graphPath, 'utf8');
        return JSON.parse(data) as GraphData;
    } catch (error) {
        console.error('Error reading graph.json:', error);
        return null;
    }
};

// Helper function to write graph.json
const writeGraphJson = (mode: viewMode, graphData: GraphData): boolean => {
    const graphPath = fileService.getGraphJsonPath(mode);
    if (!graphPath) {
        return false;
    }

    try {
        fs.writeFileSync(graphPath, JSON.stringify(graphData, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing graph.json:', error);
        return false;
    }
};

// Create node in the graph and add links to connected files
export const create_node = (mode:viewMode, filename: string, linked_files: string[], type: string): Node | null => {
    const graphData = readGraphJson(mode);
    if (!graphData) {
        return null;
    }

    // Check if node already exists
    const existingNode = graphData.nodes.find(node => node.name === filename);
    if (existingNode) {
        return existingNode; // Node already exists, return it
    }

    // Calculate new node ID (max id + 1, or 0 if no nodes exist)
    const newId = graphData.nodes.length > 0
        ? Math.max(...graphData.nodes.map(node => node.id)) + 1
        : 0;

    // Create new node
    const newNode: Node = {
        id: newId,
        name: filename,
        type: type
    };

    // Add node to graph
    graphData.nodes.push(newNode);
    writeGraphJson(mode, graphData);

    // Create links to connected files
    for (const linkedFile of linked_files) {
        create_link(mode, newId, linkedFile, type);
    }

    return newNode;
};

// Create a link between two nodes
export const create_link = (mode:viewMode, source: number | string, target: number | string, type: string): boolean => {
    const graphData = readGraphJson(mode);
    if (!graphData) {
        return false;
    }

    // Convert source and target to IDs if they are filenames
    let sourceId: number;
    let targetId: number;

    if (typeof source === 'string') {
        const sourceNode = get_node(mode, source);
        if (!sourceNode) {
            const newSourceNode = create_node(mode, source, [], type);
            if (!newSourceNode) return false;
            sourceId = newSourceNode.id;
        } else {
            sourceId = sourceNode.id;
        }
    } else {
        sourceId = source;
    }

    if (typeof target === 'string') {
        const targetNode = get_node(mode, target);
        if (!targetNode) {
            const newTargetNode = create_node(mode, target, [], type);
            if (!newTargetNode) return false;
            targetId = newTargetNode.id;
        } else {
            targetId = targetNode.id;
        }
    } else {
        targetId = target;
    }

    // Check if link already exists
    const existingLink = graphData.links.find(
        link => link.source === sourceId && link.target === targetId
    );

    if (existingLink) {
        return true; // Link already exists
    }

    // Create new link
    const newLink: Link = {
        source: sourceId,
        target: targetId,
        type: type
    };

    // Add link to graph
    graphData.links.push(newLink);
    return writeGraphJson(mode, graphData);
};

// Get all nodes from the graph
export const get_nodes = (mode: viewMode): Node[] | null => {
    const graphData = readGraphJson(mode);
    if (!graphData) {
        return null;
    }
    return graphData.nodes;
};

// Get a specific node by filename
export const get_node = (mode: viewMode, filename: string): Node | null => {
    const graphData = readGraphJson(mode);
    if (!graphData) {
        return null;
    }

    const node = graphData.nodes.find(node => node.name === filename);
    return node || null;
};

// Delete a node and all its connected links
export const delete_node = (mode: viewMode, id?: number, filename?: string): boolean => {
    const graphData = readGraphJson(mode);
    if (!graphData) {
        return false;
    }

    // Determine node ID if filename is provided
    let nodeId = id;
    if (!nodeId && filename) {
        const node = get_node(mode, filename);
        if (node) {
            nodeId = node.id;
        } else {
            return false; // Node not found
        }
    }

    if (nodeId === undefined) {
        return false;
    }

    // Delete node
    const nodeIndex = graphData.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) {
        return false; // Node not found
    }
    graphData.nodes.splice(nodeIndex, 1);

    // Delete all links where this node is source OR target
    graphData.links = graphData.links.filter(
        link => link.source !== nodeId && link.target !== nodeId
    );

    return writeGraphJson(mode, graphData);
};

// Delete a specific link between two nodes
export const delete_link = (mode: viewMode, source: number | string, target: number | string): boolean => {
    const graphData = readGraphJson(mode);
    if (!graphData) {
        return false;
    }

    // Convert source and target to IDs if they are filenames
    let sourceId: number;
    let targetId: number;

    if (typeof source === 'string') {
        const sourceNode = get_node(mode, source);
        if (!sourceNode) return false;
        sourceId = sourceNode.id;
    } else {
        sourceId = source;
    }

    if (typeof target === 'string') {
        const targetNode = get_node(mode, target);
        if (!targetNode) return false;
        targetId = targetNode.id;
    } else {
        targetId = target;
    }

    // Find and remove link
    const linkIndex = graphData.links.findIndex(
        link => link.source === sourceId && link.target === targetId
    );

    if (linkIndex === -1) {
        return false; // Link not found
    }

    graphData.links.splice(linkIndex, 1);
    return writeGraphJson(mode, graphData);
};

// Get all links from the graph
export const get_links = (mode: viewMode): Link[] | null => {
    const graphData = readGraphJson(mode);
    if (!graphData) {
        return null;
    }
    return graphData.links;
};

// Parse file content to extract linked files
export const parse_file_links = (content: string, availableFiles: string[]): string[] => {
    const linkedFiles: string[] = [];
    
    // Regex for both escaped links \[\[filename\]\] and non-escaped links [[filename]]
    const regex = /(?:\\\[\\\[(.*?)\\\]\\\])|(?:\[\[(.*?)\]\])/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        // The filename will be in either group 1 (escaped) or group 2 (non-escaped)
        const filename = match[1] || match[2];
        if (filename) {
            const linkedFile = filename.trim() + '.md';
            // Only include files that exist in the available files list
            if (availableFiles.includes(linkedFile)) {
                linkedFiles.push(linkedFile);
            }
        }
    }
    
    // Remove duplicates
    return [...new Set(linkedFiles)];
}
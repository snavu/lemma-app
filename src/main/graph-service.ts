import * as fs from 'fs';
import * as path from 'path';
import * as fileService from './file-service';

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

// Helper function to read graph.json
const readGraphJson = (): GraphData | null => {
    const graphPath = fileService.getGraphJsonPath();
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
const writeGraphJson = (graphData: GraphData): boolean => {
    const graphPath = fileService.getGraphJsonPath();
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
export const create_node = (filename: string, linked_files: string[], type: string): Node | null => {
    const graphData = readGraphJson();
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
    writeGraphJson(graphData);

    // Create links to connected files
    for (const linkedFile of linked_files) {
        create_link(newId, linkedFile, type);
    }

    return newNode;
};

// Create a link between two nodes
export const create_link = (source: number | string, target: number | string, type: string): boolean => {
    const graphData = readGraphJson();
    if (!graphData) {
        return false;
    }

    // Convert source and target to IDs if they are filenames
    let sourceId: number;
    let targetId: number;

    if (typeof source === 'string') {
        const sourceNode = get_node(source);
        if (!sourceNode) {
            const newSourceNode = create_node(source, [], type);
            if (!newSourceNode) return false;
            sourceId = newSourceNode.id;
        } else {
            sourceId = sourceNode.id;
        }
    } else {
        sourceId = source;
    }

    if (typeof target === 'string') {
        const targetNode = get_node(target);
        if (!targetNode) {
            const newTargetNode = create_node(target, [], type);
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
    return writeGraphJson(graphData);
};

// Get all nodes from the graph
export const get_nodes = (): Node[] | null => {
    const graphData = readGraphJson();
    if (!graphData) {
        return null;
    }
    return graphData.nodes;
};

// Get a specific node by filename
export const get_node = (filename: string): Node | null => {
    const graphData = readGraphJson();
    if (!graphData) {
        return null;
    }

    const node = graphData.nodes.find(node => node.name === filename);
    return node || null;
};

// Delete a node and all its connected links
export const delete_node = (id?: number, filename?: string): boolean => {
    const graphData = readGraphJson();
    if (!graphData) {
        return false;
    }

    // Determine node ID if filename is provided
    let nodeId = id;
    if (!nodeId && filename) {
        const node = get_node(filename);
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

    return writeGraphJson(graphData);
};

// Delete a specific link between two nodes
export const delete_link = (source: number | string, target: number | string): boolean => {
    const graphData = readGraphJson();
    if (!graphData) {
        return false;
    }

    // Convert source and target to IDs if they are filenames
    let sourceId: number;
    let targetId: number;

    if (typeof source === 'string') {
        const sourceNode = get_node(source);
        if (!sourceNode) return false;
        sourceId = sourceNode.id;
    } else {
        sourceId = source;
    }

    if (typeof target === 'string') {
        const targetNode = get_node(target);
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
    return writeGraphJson(graphData);
};

// Get all links from the graph
export const get_links = (): Link[] | null => {
    const graphData = readGraphJson();
    if (!graphData) {
        return null;
    }
    return graphData.links;
};

// Parse file content to extract linked files
export const parse_file_links = (content: string, availableFiles: string[]): string[] => {
    const linkedFiles: string[] = [];
    const regex = /\\\[\\\[(.*?)\\\]\\\]/g;  // Escaped links: \[\[filename\]\]
    let match;

    while ((match = regex.exec(content)) !== null) {
        const linkedFile = match[1].trim() + '.md';
        // Only include files that exist in the available files list
        if (availableFiles.includes(linkedFile)) {
            linkedFiles.push(linkedFile);
        }
    }

    // Remove duplicates
    return [...new Set(linkedFiles)];
}

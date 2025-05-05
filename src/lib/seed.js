// This script generates markdown files based on the graph structure

const fs = require('fs');
const path = require('path');

// Parse the graph data
const graphData = {
  "nodes": [
    {"id": "A", "name": "A"},
    {"id": "A-1", "name": "A-1"},
    {"id": "A-2", "name": "A-2"},
    {"id": "A-3", "name": "A-3"},
    {"id": "A-4", "name": "A-4"},
    {"id": "A-5", "name": "A-5"},
    {"id": "A-6", "name": "A-6"},
    {"id": "A-7", "name": "A-7"},
    {"id": "A-8", "name": "A-8"},
    
    {"id": "B", "name": "B"},
    {"id": "B-1", "name": "B-1"},
    {"id": "B-2", "name": "B-2"},
    {"id": "B-3", "name": "B-3"},
    {"id": "B-4", "name": "B-4"},
    {"id": "B-5", "name": "B-5"},
    {"id": "B-6", "name": "B-6"},
    {"id": "B-7", "name": "B-7"},
    
    {"id": "C", "name": "C"},
    {"id": "C-1", "name": "C-1"},
    {"id": "C-2", "name": "C-2"},
    {"id": "C-3", "name": "C-3"},
    {"id": "C-4", "name": "C-4"},
    {"id": "C-5", "name": "C-5"},
    {"id": "C-6", "name": "C-6"},
    {"id": "C-7", "name": "C-7"},
    {"id": "C-8", "name": "C-8"},
    {"id": "C-9", "name": "C-9"},
    
    {"id": "D", "name": "D"},
    {"id": "D-1", "name": "D-1"},
    {"id": "D-2", "name": "D-2"},
    {"id": "D-3", "name": "D-3"},
    {"id": "D-4", "name": "D-4"},
    {"id": "D-5", "name": "D-5"},
    {"id": "D-6", "name": "D-6"},
    
    {"id": "E", "name": "E"},
    {"id": "E-1", "name": "E-1"},
    {"id": "E-2", "name": "E-2"},
    {"id": "E-3", "name": "E-3"},
    {"id": "E-4", "name": "E-4"},
    {"id": "E-5", "name": "E-5"},
    
    {"id": "F", "name": "F"},
    {"id": "F-1", "name": "F-1"},
    {"id": "F-2", "name": "F-2"},
    {"id": "F-3", "name": "F-3"},
    {"id": "F-4", "name": "F-4"},
    {"id": "F-5", "name": "F-5"},
    {"id": "F-6", "name": "F-6"},
    {"id": "F-7", "name": "F-7"},
    
    {"id": "G", "name": "G"},
    {"id": "G-1", "name": "G-1"},
    {"id": "G-2", "name": "G-2"},
    {"id": "G-3", "name": "G-3"},
    {"id": "G-4", "name": "G-4"},
    {"id": "G-5", "name": "G-5"},
    {"id": "G-6", "name": "G-6"},
    
    {"id": "H", "name": "H"},
    {"id": "H-1", "name": "H-1"},
    {"id": "H-2", "name": "H-2"},
    {"id": "H-3", "name": "H-3"},
    {"id": "H-4", "name": "H-4"},
    {"id": "H-5", "name": "H-5"},
    {"id": "H-6", "name": "H-6"},
    {"id": "H-7", "name": "H-7"},
    
    {"id": "I", "name": "I"},
    {"id": "I-1", "name": "I-1"},
    {"id": "I-2", "name": "I-2"},
    {"id": "I-3", "name": "I-3"},
    {"id": "I-4", "name": "I-4"},
    {"id": "I-5", "name": "I-5"},
    {"id": "I-6", "name": "I-6"},
    
    {"id": "J", "name": "J"},
    {"id": "J-1", "name": "J-1"},
    {"id": "J-2", "name": "J-2"},
    {"id": "J-3", "name": "J-3"},
    {"id": "J-4", "name": "J-4"},
    {"id": "J-5", "name": "J-5"},
    {"id": "J-6", "name": "J-6"},
    {"id": "J-7", "name": "J-7"},
    {"id": "J-8", "name": "J-8"},
    {"id": "J-9", "name": "J-9"},
    {"id": "J-10", "name": "J-10"},
    {"id": "J-11", "name": "J-11"},
    {"id": "J-12", "name": "J-12"},
    {"id": "J-13", "name": "J-13"},
    {"id": "J-14", "name": "J-14"}
  ],
  "links": [
    {"source": "A", "target": "A-1"},
    {"source": "A", "target": "A-2"},
    {"source": "A", "target": "A-3"},
    {"source": "A", "target": "A-4"},
    {"source": "A", "target": "A-5"},
    {"source": "A", "target": "A-6"},
    {"source": "A", "target": "A-7"},
    {"source": "A", "target": "A-8"},
    {"source": "A-3", "target": "A-4"},
    {"source": "A-1", "target": "A-5"},
    
    {"source": "B", "target": "B-1"},
    {"source": "B", "target": "B-2"},
    {"source": "B", "target": "B-3"},
    {"source": "B", "target": "B-4"},
    {"source": "B", "target": "B-5"},
    {"source": "B", "target": "B-6"},
    {"source": "B", "target": "B-7"},
    {"source": "B-1", "target": "B-4"},
    {"source": "B-2", "target": "B-5"},
    
    {"source": "C", "target": "C-1"},
    {"source": "C", "target": "C-2"},
    {"source": "C", "target": "C-3"},
    {"source": "C", "target": "C-4"},
    {"source": "C", "target": "C-5"},
    {"source": "C", "target": "C-6"},
    {"source": "C", "target": "C-7"},
    {"source": "C", "target": "C-8"},
    {"source": "C", "target": "C-9"},
    {"source": "C-1", "target": "C-5"},
    {"source": "C-3", "target": "C-7"},
    
    {"source": "D", "target": "D-1"},
    {"source": "D", "target": "D-2"},
    {"source": "D", "target": "D-3"},
    {"source": "D", "target": "D-4"},
    {"source": "D", "target": "D-5"},
    {"source": "D", "target": "D-6"},
    {"source": "D-2", "target": "D-4"},
    
    {"source": "E", "target": "E-1"},
    {"source": "E", "target": "E-2"},
    {"source": "E", "target": "E-3"},
    {"source": "E", "target": "E-4"},
    {"source": "E", "target": "E-5"},
    {"source": "E-1", "target": "E-3"},
    
    {"source": "F", "target": "F-1"},
    {"source": "F", "target": "F-2"},
    {"source": "F", "target": "F-3"},
    {"source": "F", "target": "F-4"},
    {"source": "F", "target": "F-5"},
    {"source": "F", "target": "F-6"},
    {"source": "F", "target": "F-7"},
    {"source": "F-2", "target": "F-5"},
    {"source": "F-3", "target": "F-6"},
    
    {"source": "G", "target": "G-1"},
    {"source": "G", "target": "G-2"},
    {"source": "G", "target": "G-3"},
    {"source": "G", "target": "G-4"},
    {"source": "G", "target": "G-5"},
    {"source": "G", "target": "G-6"},
    {"source": "G-1", "target": "G-4"},
    
    {"source": "H", "target": "H-1"},
    {"source": "H", "target": "H-2"},
    {"source": "H", "target": "H-3"},
    {"source": "H", "target": "H-4"},
    {"source": "H", "target": "H-5"},
    {"source": "H", "target": "H-6"},
    {"source": "H", "target": "H-7"},
    {"source": "H-2", "target": "H-5"},
    {"source": "H-3", "target": "H-6"},
    
    {"source": "I", "target": "I-1"},
    {"source": "I", "target": "I-2"},
    {"source": "I", "target": "I-3"},
    {"source": "I", "target": "I-4"},
    {"source": "I", "target": "I-5"},
    {"source": "I", "target": "I-6"},
    {"source": "I-1", "target": "I-4"},
    
    {"source": "J", "target": "J-1"},
    {"source": "J", "target": "J-2"},
    {"source": "J", "target": "J-3"},
    {"source": "J", "target": "J-4"},
    {"source": "J", "target": "J-5"},
    {"source": "J", "target": "J-6"},
    {"source": "J", "target": "J-7"},
    {"source": "J", "target": "J-8"},
    {"source": "J-2", "target": "J-5"},
    {"source": "J-3", "target": "J-6"},
    
    {"source": "A", "target": "B"},
    {"source": "B", "target": "C"},
    {"source": "C", "target": "D"},
    {"source": "D", "target": "E"},
    {"source": "E", "target": "F"},
    {"source": "F", "target": "G"},
    {"source": "G", "target": "H"},
    {"source": "H", "target": "I"},
    {"source": "I", "target": "J"},
    {"source": "J", "target": "A"},
    
    {"source": "A-2", "target": "C-1"},
    {"source": "B-3", "target": "E-2"},
    {"source": "D-1", "target": "F-4"},
    {"source": "G-2", "target": "I-3"},
    {"source": "H-4", "target": "J-2"},
    {"source": "C-4", "target": "F-1"},
    {"source": "E-4", "target": "H-3"},
    {"source": "A-6", "target": "J-4"},
    {"source": "B-5", "target": "D-3"},
    {"source": "I-5", "target": "G-3"}
  ]
};

// Create a map of node links
const nodeLinks = {};
graphData.nodes.forEach(node => {
  nodeLinks[node.id] = [];
});

// Populate the links (both directions for bidirectional linking)
graphData.links.forEach(link => {
  nodeLinks[link.source].push(link.target);
  // Don't add duplicate links
  if (!nodeLinks[link.target].includes(link.source)) {
    nodeLinks[link.target].push(link.source);
  }
});

// Generate the content for each file
function generateContent(nodeId) {
  const node = graphData.nodes.find(n => n.id === nodeId);
  if (!node) return "";
  
  let content = `# ${node.name}\n\n`;
  
  // Add some descriptive text
  content += `This is note ${node.name}. It's part of the knowledge graph demo.\n\n`;
  
  // Add links section
  if (nodeLinks[nodeId].length > 0) {
    content += `## Related Notes\n\n`;
    nodeLinks[nodeId].forEach(linkedId => {
      const linkedNode = graphData.nodes.find(n => n.id === linkedId);
      content += `- [[${linkedNode.name}]]\n`;
    });
  }
  
  // Add some mock content
  content += `\n## Content\n\n`;
  content += `This note contains information relevant to topic ${node.name}.\n`;
  content += `Each note has connections to other notes, forming a knowledge graph.\n\n`;
  content += `When you link to another note using the [[note-name]] syntax, \n`;
  content += `the system will automatically create connections in the graph.\n`;
  
  return content;
}

// Create files in a directory structure
const baseDir = 'knowledge_graph_notes';

// Create the base directory and required subdirectories
function createDirectories() {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }
  
  // Create the 'generated' subdirectory
  const generatedDir = path.join(baseDir, 'generated');
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir);
  }
  
  // Create empty graph.json files
  const graphData = { nodes: [], links: [] };
  fs.writeFileSync(path.join(baseDir, 'graph.json'), JSON.stringify(graphData, null, 2));
  fs.writeFileSync(path.join(generatedDir, 'graph.json'), JSON.stringify(graphData, null, 2));
}

// Generate all the files
function generateFiles() {
  createDirectories();
  
  // Create a file for each node
  graphData.nodes.forEach(node => {
    const content = generateContent(node.id);
    const filePath = path.join(baseDir, `${node.name}.md`);
    fs.writeFileSync(filePath, content);
  });
  
  console.log(`Created ${graphData.nodes.length} markdown files in ${baseDir}.`);
}

// Generate the markdown files
generateFiles();
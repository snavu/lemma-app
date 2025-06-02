import * as fileService from '../../src/main/file-service';
import * as graphLoader from '../../src/main/graph-loader';
import * as graphService from '../../src/main/graph-service';
import * as fs from 'fs';
import * as path from 'path';

const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'knowledge-graph');

fileService.MainNotesDirectory(fixturePath);
fs.mkdirSync(fixturePath, { recursive: true });
fileService.ensureNotesDirectoryStructure(fixturePath);
const testMode = 'main';
const testType = 'user';

const fileNodes = [
  { id: 0, name: 'new-file0.md', type: testType },
  { id: 1, name: 'new-file1.md', type: testType },
  { id: 2, name: 'new-file2.md', type: testType }
];
const parseFileLinksData = {
    content: '[[new-file0]]\n\n[[new-file1]]\n\n[[new-file2]]',
    links: ['new-file0.md', 'new-file1.md', 'new-file2.md']
};

const verifyCreatedNode = (newNode: {id: number, name: string, type: string}) => {
  const createdNode = graphService.get_node(testMode, newNode.name);
  expect(createdNode).not.toBeNull();
  // Check node properties
  expect(createdNode.id).toBe(newNode.id);
  expect(createdNode.name).toBe(newNode.name);
  expect(createdNode.type).toBe(newNode.type);
};

const verifyDeletedNode = (deletedNode: {id: number, name: string, type: string}) => {
  const node = graphService.get_node(testMode, deletedNode.name);
  expect(node).toBeNull();
};

const verifyCreatedLink = (sourceId: number, targetId: number) => {
  const links = graphService.get_links(testMode);
  expect(links).not.toBeNull();
  const link = links.find(link => (link.source === sourceId && link.target === targetId));
  expect(link).not.toBeNull();
};

const verifyDeletedLink = (sourceId: number, targetId: number) => {
  const links = graphService.get_links(testMode);
  const deletedLink = links.find(link => (link.source === sourceId && link.target === targetId));
  // Confirm link is deleted
  expect(deletedLink).toBeUndefined();
};

const deleteAllNodes = () => {
  const graphNodes = graphService.get_nodes(testMode);
  for (const node of graphNodes) {
    graphService.delete_node(testMode, node.id);
  }
};

const createLinkedContent = (
  targetNode: {id: number, name: string, type: string}
): string => {
  return `[[${targetNode.name.replace(/\.md$/, '')}]]`
};

const removeFixtures = async () => {
  const files = await fileService.getFilesFromDirectory(testMode);
  for (const file of files) {
    fileService.deleteFile(file.path);
  }
};

describe('graph-service', () => {
  describe('createNode()', () => {
    it('create node 1', () => {
      const newNode = fileNodes[0];
      // Create node
      const createdNode = graphService.create_node(testMode, newNode.name, [], newNode.type);

      expect(createdNode).not.toBeNull();
      // Check node in graph
      verifyCreatedNode(newNode);
    });

    it('create node 2', () => {
      const newNode = fileNodes[1];
      const createdNode = graphService.create_node(testMode, newNode.name, [], newNode.type);

      expect(createdNode).not.toBeNull();
      // Check node in graph
      verifyCreatedNode(newNode);

      deleteAllNodes();
    });

    it('create node with links', () => {
      const sourceNode = fileNodes[1];
      const targetNode = fileNodes[0];
      graphService.create_node(testMode, targetNode.name, [], testType);
      // Create node with link
      const createdNode = graphService.create_node(testMode, sourceNode.name, [targetNode.name], testType);
      expect(createdNode).not.toBeNull();

      // Check node in graph
      verifyCreatedNode(sourceNode);
      // Check link in graph
      verifyCreatedLink(sourceNode.id, targetNode.id);

      deleteAllNodes();
    });
  });

  describe('createLink()', () => {
    it('create link 1', () => {
      const newNode1 = fileNodes[0];
      const newNode2 = fileNodes[1];
      // Insert every node into graph
      fileNodes.forEach(node => graphService.create_node(testMode, node.name, [], testType));

      const sourceId = newNode1.id;
      const targetId = newNode2.id;

      // Create link
      const success = graphService.create_link(testMode, sourceId, targetId, testType);
      expect(success).toBe(true);

      // Check link in graph
      verifyCreatedLink(sourceId, targetId);

      deleteAllNodes();
    });

    it('create link 2', () => {
      const newNode1 = fileNodes[0];
      const newNode2 = fileNodes[1];
      // Insert every node into graph
      fileNodes.forEach(node => graphService.create_node(testMode, node.name, [], testType));

      const sourceId = newNode2.id;
      const targetId = newNode1.id;

      // Create link
      const success = graphService.create_link(testMode, sourceId, targetId, testType);
      expect(success).toBe(true);

      // Check link in graph
      verifyCreatedLink(sourceId, targetId);

      deleteAllNodes();
    });
  });

  describe('deleteNode()', () => {
    it('delete node 1', () => {
      const testNode = fileNodes[0];
      // Insert every node into graph
      fileNodes.forEach(node => graphService.create_node(testMode, node.name, [], testType));

      // Delete node
      const success = graphService.delete_node(testMode, testNode.id);
      expect(success).toBe(true);

      // Confirm node is deleted
      verifyDeletedNode(testNode);

      deleteAllNodes();
    });

    it('delete node 2', () => {
      const testNode = fileNodes[1];
      // Insert every node into graph
      fileNodes.forEach(node => graphService.create_node(testMode, node.name, [], testType));

      // Delete node
      const success = graphService.delete_node(testMode, testNode.id);
      expect(success).toBe(true);

      // Confirm node is deleted
      verifyDeletedNode(testNode);

      deleteAllNodes();
    });

    it('delete node with link', () => {
      const sourceNode = fileNodes[0];
      const targetNode = fileNodes[1];
      // Insert every node into graph
      fileNodes.forEach(node => graphService.create_node(testMode, node.name, [], testType));
      // Create link
      graphService.create_link(testMode, sourceNode.id, targetNode.id, testType);

      // Delete node with link
      graphService.delete_node(testMode, sourceNode.id);

      // Confirm node and link are deleted
      verifyDeletedNode(sourceNode);
      verifyCreatedLink(sourceNode.id, targetNode.id);
    });
  });

  describe('deleteLink()', () => {
    it('delete link 1', () => {
      const newNode1 = fileNodes[0];
      const newNode2 = fileNodes[1];
      const newNode3 = fileNodes[2];

      const sourceId = newNode1.id;
      const targetId = newNode2.id;

      // Insert every node into graph
      fileNodes.forEach(node => graphService.create_node(testMode, node.name, [], testType));
      // Create link
      graphService.create_link(testMode, sourceId, targetId, testType);
      graphService.create_link(testMode, newNode2.id, newNode3.id, testType);

      // Delete link
      const success = graphService.delete_link(testMode, sourceId, targetId);
      expect(success).toBe(true);

      // Confirm link is deleted
      verifyDeletedLink(sourceId, targetId);

      deleteAllNodes();
    });

    it('delete link 2', () => {
      const newNode1 = fileNodes[0];
      const newNode2 = fileNodes[1];
      const newNode3 = fileNodes[2];

      const sourceId = newNode2.id;
      const targetId = newNode3.id;

      // Insert every node into graph
      fileNodes.forEach(node => graphService.create_node(testMode, node.name, [], testType));
      // Create link
      graphService.create_link(testMode, sourceId, targetId, testType);
      graphService.create_link(testMode, newNode1.id, newNode2.id, testType);

      // Delete link
      const success = graphService.delete_link(testMode, sourceId, targetId);
      expect(success).toBe(true);

      // Confirm link is deleted
      verifyDeletedLink(sourceId, targetId);

      deleteAllNodes();
    });
  });

  describe('parseFileLinks()', () => {
    it('all available files', () => {
      const links = graphService.parse_file_links(parseFileLinksData.content, parseFileLinksData.links);
      expect(links.length).toBe(parseFileLinksData.links.length);

      expect(new Set(links)).toEqual(new Set(parseFileLinksData.links));
    });

    it('partially available files', () => {
      const partiallyAvailableFiles = parseFileLinksData.links.slice(0,2);
      const links = graphService.parse_file_links(parseFileLinksData.content, partiallyAvailableFiles);
      expect(links.length).toBe(partiallyAvailableFiles.length);

      expect(new Set(links)).toEqual(new Set(partiallyAvailableFiles));
    });
  });
});

describe('graph-loader', () => {
  describe('syncGraphWithFiles()', () => {
    it('sync new file 1', async () => {
      const newFile = fileNodes[0];
      // Write blank file to directory
      fileService.createFile(newFile.name);

      // Sync graph with files
      const success = await graphLoader.syncGraphWithFiles(testMode);
      expect(success).toBe(true);

      // Check node in graph
      verifyCreatedNode(newFile);
    });

    it('sync new file 2', async () => {
      const newFile = fileNodes[1];
      // Write blank file to directory
      fileService.createFile(newFile.name);

      // Sync graph with files
      const success = await graphLoader.syncGraphWithFiles(testMode);
      expect(success).toBe(true);

      // Check node in graph
      verifyCreatedNode(newFile);

      await removeFixtures();
      deleteAllNodes();
    });

    it('sync new file with links', async () => {
      const sourceFile = fileNodes[1];
      const targetFile = fileNodes[0];
      // Add existing files and sync graph
      fileService.createFile(targetFile.name);
      await graphLoader.syncGraphWithFiles(testMode);

      // Add file with link
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      // Sync graph with files
      const success = await graphLoader.syncGraphWithFiles(testMode);
      expect(success).toBe(true);

      // Check node in graph
      verifyCreatedNode(sourceFile);
      // Check link in graph
      verifyCreatedLink(sourceFile.id, targetFile.id);
      
      await removeFixtures();
      deleteAllNodes();
    });

    it('sync new link to file 1', async () => {
      const sourceFile = fileNodes[0];
      const targetFile = fileNodes[1];
      // Add all files and sync graph
      fileNodes.forEach(file => fileService.createFile(file.name));
      await graphLoader.syncGraphWithFiles(testMode);

      // Update file with link
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      const success = await graphLoader.syncGraphWithFiles(testMode);
      expect(success).toBe(true);

      // Check link in graph
      verifyCreatedLink(sourceFile.id, targetFile.id);
      
      await removeFixtures();
      deleteAllNodes();
    });

    it('sync new link to file 2', async () => {
      const sourceFile = fileNodes[1];
      const targetFile = fileNodes[2];
      // Add all files and sync graph
      fileNodes.forEach(file => fileService.createFile(file.name));
      await graphLoader.syncGraphWithFiles(testMode);

      // Update file with link
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      const success = await graphLoader.syncGraphWithFiles(testMode);
      expect(success).toBe(true);

      // Check link in graph
      verifyCreatedLink(sourceFile.id, targetFile.id);
      
      await removeFixtures();
      deleteAllNodes();
    });

    it('sync deleted file 1', async () => {
      const testFile = fileNodes[0];
      // Add all files and sync graph
      fileNodes.forEach(file => fileService.createFile(file.name));
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete file and sync graph
      fileService.deleteFile(path.join(fixturePath, testFile.name));
      const success = await graphLoader.syncGraphWithFiles(testMode);
      expect(success).toBe(true);

      // Check node of file is deleted in graph
      verifyDeletedNode(testFile);

      await removeFixtures();
      deleteAllNodes();
    });

    it('sync deleted file 2', async () => {
      const testFile = fileNodes[1];
      // Add all files and sync graph
      fileNodes.forEach(file => fileService.createFile(file.name));
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete file and sync graph
      fileService.deleteFile(path.join(fixturePath, testFile.name));
      const success = await graphLoader.syncGraphWithFiles(testMode);
      expect(success).toBe(true);

      // Check node of file is deleted in graph
      verifyDeletedNode(testFile);

      await removeFixtures();
      deleteAllNodes();
    });

    it('sync deleted file with links', async () => {
      const sourceFile = fileNodes[0];
      const targetFile = fileNodes[1];
      // Add all files
      fileNodes.forEach(file => fileService.createFile(file.name));
      // Update file with link and sync graph
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete file with link and sync graph
      fileService.deleteFile(path.join(fixturePath, sourceFile.name));
      const success = await graphLoader.syncGraphWithFiles(testMode);
      expect(success).toBe(true);

      // Confirm node of file and link are deleted
      verifyDeletedNode(sourceFile);
      verifyDeletedLink(sourceFile.id, targetFile.id);

      await removeFixtures();
      deleteAllNodes();
    });

    it('sync deleted link from file 1', async () => {
      const newFile1 = fileNodes[0];
      const newFile2 = fileNodes[1];
      const newFile3 = fileNodes[2];

      const sourceFile = newFile1;
      const targetFile = newFile2;

      // Add all files
      fileNodes.forEach(file => fileService.createFile(file.name));
      // Update file with link and sync graph
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      await fileService.saveFile(path.join(fixturePath, newFile2.name), createLinkedContent(newFile3), []);
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete link by rewriting source file content
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), '', []);
      await graphLoader.syncGraphWithFiles(testMode);

      // Confirm link is deleted
      verifyDeletedLink(sourceFile.id, targetFile.id);

      await removeFixtures();
      deleteAllNodes();
    });

    it('sync deleted link from file 2', async () => {
      const newFile1 = fileNodes[0];
      const newFile2 = fileNodes[1];
      const newFile3 = fileNodes[2];

      const sourceFile = newFile2;
      const targetFile = newFile3;

      // Add all files
      fileNodes.forEach(file => fileService.createFile(file.name));
      // Update file with link and sync graph
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      await fileService.saveFile(path.join(fixturePath, newFile1.name), createLinkedContent(newFile2), []);
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete link by rewriting source file content
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), '', []);
      await graphLoader.syncGraphWithFiles(testMode);

      // Confirm link is deleted
      verifyDeletedLink(sourceFile.id, targetFile.id);

      await removeFixtures();
      deleteAllNodes();
    });
  });

  describe('updateFileInGraph()', () => {
    it('update new file', async () => {
      const newFile = fileNodes[2];
      const existingFiles = fileNodes.slice(0, 2);
      // Add exisiting files and sync graph
      existingFiles.forEach(file => fileService.createFile(file.name));
      await graphLoader.syncGraphWithFiles(testMode);

      // Add new file and update file in graph
      fileService.createFile(newFile.name);
      const success = await graphLoader.updateFileInGraph(testMode, newFile.name);
      expect(success).toBe(true);

      // Check node in graph
      verifyCreatedNode(newFile);

      await removeFixtures();
      deleteAllNodes();
    });

    it('update new file with link', async () => {
      const sourceFile = fileNodes[1];
      const targetFile = fileNodes[0];
      // Add existing files and sync graph
      fileService.createFile(targetFile.name);
      await graphLoader.syncGraphWithFiles(testMode);

      // Add file with link
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      // Update file in graph
      const success = await graphLoader.updateFileInGraph(testMode, sourceFile.name);
      expect(success).toBe(true);

      // Check node in graph
      verifyCreatedNode(sourceFile);
      // Check link in graph
      verifyCreatedLink(sourceFile.id, targetFile.id);
      
      await removeFixtures();
      deleteAllNodes();
    });

    it('update new link to file', async () => {
      const sourceFile = fileNodes[0];
      const targetFile = fileNodes[1];
      // Add all files and sync graph
      fileNodes.forEach(file => fileService.createFile(file.name));
      await graphLoader.syncGraphWithFiles(testMode);

      // Update file with link and update graph
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      const success = await graphLoader.updateFileInGraph(testMode, sourceFile.name);
      expect(success).toBe(true);

      // Check link in graph
      verifyCreatedLink(sourceFile.id, targetFile.id);
      
      await removeFixtures();
      deleteAllNodes();
    });

    it('update deleted file', async () => {
      const testFile = fileNodes[0];
      // Add all files and sync graph
      fileNodes.forEach(file => fileService.createFile(file.name));
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete file and update graph
      fileService.deleteFile(path.join(fixturePath, testFile.name));
      const success = await graphLoader.updateFileInGraph(testMode, testFile.name);
      expect(success).toBe(true);

      // Check node of file is deleted in graph
      verifyDeletedNode(testFile);

      await removeFixtures();
      deleteAllNodes();
    });

    it('update deleted file with links', async () => {
      const sourceFile = fileNodes[0];
      const targetFile = fileNodes[1];
      // Add all files
      fileNodes.forEach(file => fileService.createFile(file.name));
      // Update file with link and sync graph
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete file with link and update graph
      fileService.deleteFile(path.join(fixturePath, sourceFile.name));
      const success = await graphLoader.updateFileInGraph(testMode, sourceFile.name);
      expect(success).toBe(true);

      // Confirm node of file and link are deleted
      verifyDeletedNode(sourceFile);
      verifyDeletedLink(sourceFile.id, targetFile.id);

      await removeFixtures();
      deleteAllNodes();
    });

    it('update deleted link from file', async () => {
      const newFile1 = fileNodes[0];
      const newFile2 = fileNodes[1];
      const newFile3 = fileNodes[2];

      const sourceFile = newFile1;
      const targetFile = newFile2;

      // Add all files
      fileNodes.forEach(file => fileService.createFile(file.name));
      // Update file with link and sync graph
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      await fileService.saveFile(path.join(fixturePath, newFile2.name), createLinkedContent(newFile3), []);
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete link by rewriting source file content
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), '', []);
      await graphLoader.updateFileInGraph(testMode, sourceFile.name);

      // Confirm link is deleted
      verifyDeletedLink(sourceFile.id, targetFile.id);

      await removeFixtures();
      deleteAllNodes();
    });
  });

  describe('removeFileFromGraph()', () => {
    it('remove file', async () => {
      const testFile = fileNodes[0];
      // Add all files and sync graph
      fileNodes.forEach(file => fileService.createFile(file.name));
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete file and remove from graph
      fileService.deleteFile(path.join(fixturePath, testFile.name));
      const success = graphLoader.removeFileFromGraph(testMode, testFile.name);
      expect(success).toBe(true);

      // Check node of file is deleted in graph
      verifyDeletedNode(testFile);

      await removeFixtures();
      deleteAllNodes();
    });

    it('remove file with links', async () => {
      const sourceFile = fileNodes[0];
      const targetFile = fileNodes[1];
      // Add all files
      fileNodes.forEach(file => fileService.createFile(file.name));
      // Update file with link and sync graph
      await fileService.saveFile(path.join(fixturePath, sourceFile.name), createLinkedContent(targetFile), []);
      await graphLoader.syncGraphWithFiles(testMode);

      // Delete file with link and remove from graph
      fileService.deleteFile(path.join(fixturePath, sourceFile.name));
      const success = graphLoader.removeFileFromGraph(testMode, sourceFile.name);
      expect(success).toBe(true);

      // Confirm node of file and link are deleted
      verifyDeletedNode(sourceFile);
      verifyDeletedLink(sourceFile.id, targetFile.id);

      await removeFixtures();
      deleteAllNodes();
    });
  });
});
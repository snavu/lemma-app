const { OllamaEmbeddingFunction } = require('chromadb');
import { ChromaClient, Collection, GetResponse, Metadata, QueryResponse } from 'chromadb';
import os from 'os';
import ollama from 'ollama';

type FileType = 'user' | 'assisted' | 'generated';
type SearchMode = 'similarity' | 'full-text' | 'tag';

interface Note {
  id: string,
  filePath: string,
  content: string,
  type: FileType
}

const defaultModelName = 'nomic-embed-text';
const primaryCollection = 'notes';

// Get file or collection ID based on file or directory path
// Replace all forbidden characters for specifying a collection ID
const getId = (filePath: string, type: string): string => {
  // Check if system is Windows or Linux
  const isWindows = os.platform() === 'win32';
  // Replace all colons and backslashes for Windows file paths
  // Replace all slashes for Linux file paths
  const unsafeChars = isWindows ? /[\\/:]/g : /\//g;

  return filePath
    .replace(unsafeChars, '-')
    .replace(/\s+/g, '_')
    .replace(/^/, `${type}-`)
    .replace(/-+/g, '-');
};

// An instance that connects to a collection in the vector database
export class DbClient {
  private collection: Collection | null;
  private collectionName: string;
  // private embedFunc: typeof DefaultEmbeddingFunction;
  private embedFunc: typeof OllamaEmbeddingFunction | null;
  private modelName: string;
  private client: ChromaClient;

  constructor(collection: string = primaryCollection, model: string = defaultModelName) {
    this.client = new ChromaClient();
    this.embedFunc = null;
    this.modelName = model;
    this.collection = null;
    this.collectionName = collection;
  }

  // Initializes connection to the collection. Will be done only once
  private initCollection = async (): Promise<void> => {
    if (!this.collection) {
      try {
        this.collection = await this.client.getOrCreateCollection({
          name: this.collectionName,
          embeddingFunction: this.embedFunc,
        });
      } catch (error) {
        console.error('Error during ChromaDB initialization:', error);
      }
    }
  };

  // Initializes embedding function, downloading embedding model if not already installed. Will be done only once.
  private initEmbeddingFunc = async (): Promise<void> => {
    const modelList = await ollama.list();
    // Model has not been installed yet
    if (!modelList.models.find(obj => obj.model.split(':')[0] === this.modelName)) {
      console.log(`Downloading '${this.modelName}'...`);
      await ollama.pull({ model: this.modelName });
      console.log(`Successfully downloaded '${this.modelName}...`);
    }
    // Embedding function not initialized yet
    if (!this.embedFunc) {
      this.embedFunc = new OllamaEmbeddingFunction({
        url: 'http://127.0.0.1:11434/',
        model: this.modelName
      });
    }
  };

  // Add/update embeddings for one notes or multiple notes
  public upsertNotes = async (
    notesDirectory: string, 
    filePath: string | string[], 
    content: string | string[], 
    fileType: FileType | FileType[]
  ) => {
    let docIds: string[];
    let notesContent: string[];
    let metadatas: any[];

    // Mismatched parameter types
    if (!([filePath, content, fileType].every(item => Array.isArray(item)) 
      || [filePath, content, fileType].every(item => !Array.isArray(item)))) {
      throw TypeError('upsertNote(): filePath, content, and/or fileType have different types.');
    }
    // If inserting multiple notes
    if (Array.isArray(filePath) && Array.isArray(content) && Array.isArray(fileType)) {
      // Mismatched length of parameters
      if (!(filePath.length === content.length && content.length === fileType.length)) {
        throw Error('upsertNote(): filePath, content, and fileType must have the same size.');
      }

      docIds = filePath.map((value) => { return getId(value, 'file') });
      notesContent = content.map((value) => { return value.toLowerCase() });
      metadatas = filePath.map(((value, i) => ({ directory: notesDirectory, filePath: value, type: fileType[i] })));
    } else {
      // If inserting individual note
      docIds = [getId(String(filePath), 'file')];
      notesContent = [String(content).toLowerCase()];
      metadatas = [{
        directory: notesDirectory,
        filePath: filePath,
        type: fileType
      }];
    }

    try {
      await this.initEmbeddingFunc();
      await this.initCollection();

      // Add/update notes to vector database
      await this.collection.upsert({
        ids: docIds,
        documents: notesContent,
        metadatas: metadatas,
      });

      // Get document from database for debugging
      // const results = await this.queryNotes(notesDirectory, content);
      console.log('Document(s) successfully upserted:', filePath); // Output results
    } catch (error) {
      console.error('Error during ChromaDB operation:', error);
    }
  };

  // Deletes the document of the specified note(s) in the directory.
  // If no specific document(s) is specified, deletes all documents of each note in the directory
  public deleteNotes = async (notesDirectory: string, filePath?: string | string[]) => {
    try {
      await this.initEmbeddingFunc();
      await this.initCollection();

      if (filePath) {
        if (Array.isArray(filePath)) {
          // Delete multiple notes from vector database
          await this.collection.delete({
            ids: filePath.map(file => getId(file, 'file')),
            where: {'directory': notesDirectory}
          });
        } else {
          // Delete individual note from vector database
          await this.collection.delete({
            ids: [getId(filePath, 'file')],
            where: {'directory': notesDirectory}
          });
        }
      } else {
        // Delete all notes from vector database
        await this.collection.delete({
          where: {'directory': notesDirectory}
        });
      }

      if (filePath) console.log('Document(s) successfully deleted:', filePath);
      else console.log(`All documents successfully deleted from ${notesDirectory}`);
    } catch (error) {
      console.error('Error during ChromaDB operation:', error);
    }
  };

  // Return a list of notes that matches the search query.
  // If no search query given, return all notes in the directory
  public queryNotes = async (notesDirectory: string, searchQuery?: string, searchMode: SearchMode = 'full-text'): Promise<Note[]> => {
    let data: QueryResponse | GetResponse;

    try {
      await this.initEmbeddingFunc();
      await this.initCollection();
      
      if (searchQuery) {
        if (searchMode === 'similarity') {
          // Query notes by similarity search
          data = await this.collection.query({
            queryTexts: searchQuery.toLowerCase(), 
            where: {'directory': {'$eq': notesDirectory}},
          });
        } else {
          const fullTextQuery = searchMode === 'tag' ? `#${searchQuery.toLowerCase()}` : searchQuery.toLowerCase();
          // Query notes by search query
          data = await this.collection.get({ 
            where: {'directory': notesDirectory},
            whereDocument: {'$contains': fullTextQuery}
          });
        }
      } else {
        // Query all notes
        data = await this.collection.get({ 
          where: {'directory': notesDirectory},
        });
      }
    } catch (error) {
      console.error('Error during ChromaDB operation:', error);
    }

    // Normalize results
    const ids: string[] =
      Array.isArray(data.ids[0]) // Multi-query case
        ? (data.ids as string[][]).flat()
        : (data.ids as string[]);

    const documents: (string | null)[] =
      Array.isArray(data.documents[0]) // Multi-query case
        ? (data.documents as (string | null)[][]).flat()
        : (data.documents as (string | null)[]);

    const metadatas: (Metadata | null)[] =
      Array.isArray(data.metadatas[0]) // Multi-query case
        ? (data.metadatas as (Metadata | null)[][]).flat()
        : (data.metadatas as (Metadata | null)[]);

    const results: Note[] = ids.map((id, index) => {
      const metadata = metadatas[index];
      const content = documents[index];

      return {
        id: String(id),
        filePath: String(metadata?.filePath || ''), // fallback for nulls
        content: Array.isArray(content) ? content.join('\n') : String(content ?? ''), // handle string[] or null
        type: (metadata?.type as FileType) ?? 'user', // default fallback
      };
    });

    return results;
  };
}

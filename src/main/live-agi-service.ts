import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import { DbClient, FileType } from './database';
import { InferenceService } from './inference';
import { config } from './main';
import * as fileService from './file-service';
import * as agiSync from './agi-sync';
import * as graphService from './graph-service';

// FSM States for the Live AGI
enum AgiState {
  IDLE = 'idle',
  EXPLORING = 'exploring',
  CONTEMPLATING = 'contemplating',
  SYNTHESIZING = 'synthesizing',
  GENERATING = 'generating',
  COOLDOWN = 'cooldown'
}

// Perception modes for agency mechanism
enum PerceptionMode {
  RANDOM_WALK = 'random_walk',
  SIMILARITY_CLUSTER = 'similarity_cluster',
  TEMPORAL_RECENT = 'temporal_recent',
  CONCEPT_BRIDGE = 'concept_bridge',
  KNOWLEDGE_GAP = 'knowledge_gap'
}

interface AgiThought {
  timestamp: Date;
  state: AgiState;
  perceptionMode: PerceptionMode;
  selectedNotes: string[];
  synthesisPrompt?: string;
  generatedContent?: string;
  reasoning?: string;
}

interface MarkovTransition {
  from: PerceptionMode;
  to: PerceptionMode;
  weight: number;
  condition?: () => boolean;
}

export class LiveAgiService {
  private isRunning: boolean = false;
  private currentState: AgiState = AgiState.IDLE;
  private currentPerceptionMode: PerceptionMode = PerceptionMode.RANDOM_WALK;
  private database: DbClient;
  private inferenceService: InferenceService;
  private stateInterval: NodeJS.Timeout | null = null;
  private thoughtHistory: AgiThought[] = [];
  private lastGenerationTime: Date = new Date(0);

  // CACHE  Cache frequently accessed data
  private notesCache: { data: any[], lastUpdated: number } = { data: [], lastUpdated: 0 };
  private filesCache: { data: string[], lastUpdated: number } = { data: [], lastUpdated: 0 };
  private cacheTimeout = 30000; // 30 seconds cache

  // PRE-SELECTED NOTES  Batch prepare notes for faster transitions
  private preSelectedNotes: any[] = [];
  private currentThought: AgiThought | null = null;

  // Markov chain for dynamic perception switching
  private markovTransitions: MarkovTransition[] = [
    { from: PerceptionMode.RANDOM_WALK, to: PerceptionMode.SIMILARITY_CLUSTER, weight: 0.3 },
    { from: PerceptionMode.RANDOM_WALK, to: PerceptionMode.TEMPORAL_RECENT, weight: 0.2 },
    { from: PerceptionMode.RANDOM_WALK, to: PerceptionMode.CONCEPT_BRIDGE, weight: 0.25 },
    { from: PerceptionMode.RANDOM_WALK, to: PerceptionMode.KNOWLEDGE_GAP, weight: 0.15 },
    { from: PerceptionMode.RANDOM_WALK, to: PerceptionMode.RANDOM_WALK, weight: 0.1 },

    { from: PerceptionMode.SIMILARITY_CLUSTER, to: PerceptionMode.CONCEPT_BRIDGE, weight: 0.4 },
    { from: PerceptionMode.SIMILARITY_CLUSTER, to: PerceptionMode.RANDOM_WALK, weight: 0.2 },
    { from: PerceptionMode.SIMILARITY_CLUSTER, to: PerceptionMode.KNOWLEDGE_GAP, weight: 0.2 },
    { from: PerceptionMode.SIMILARITY_CLUSTER, to: PerceptionMode.TEMPORAL_RECENT, weight: 0.1 },
    { from: PerceptionMode.SIMILARITY_CLUSTER, to: PerceptionMode.SIMILARITY_CLUSTER, weight: 0.1 },

    { from: PerceptionMode.TEMPORAL_RECENT, to: PerceptionMode.RANDOM_WALK, weight: 0.3 },
    { from: PerceptionMode.TEMPORAL_RECENT, to: PerceptionMode.SIMILARITY_CLUSTER, weight: 0.3 },
    { from: PerceptionMode.TEMPORAL_RECENT, to: PerceptionMode.CONCEPT_BRIDGE, weight: 0.2 },
    { from: PerceptionMode.TEMPORAL_RECENT, to: PerceptionMode.KNOWLEDGE_GAP, weight: 0.1 },
    { from: PerceptionMode.TEMPORAL_RECENT, to: PerceptionMode.TEMPORAL_RECENT, weight: 0.1 },

    { from: PerceptionMode.CONCEPT_BRIDGE, to: PerceptionMode.KNOWLEDGE_GAP, weight: 0.35 },
    { from: PerceptionMode.CONCEPT_BRIDGE, to: PerceptionMode.SIMILARITY_CLUSTER, weight: 0.25 },
    { from: PerceptionMode.CONCEPT_BRIDGE, to: PerceptionMode.RANDOM_WALK, weight: 0.2 },
    { from: PerceptionMode.CONCEPT_BRIDGE, to: PerceptionMode.TEMPORAL_RECENT, weight: 0.1 },
    { from: PerceptionMode.CONCEPT_BRIDGE, to: PerceptionMode.CONCEPT_BRIDGE, weight: 0.1 },

    { from: PerceptionMode.KNOWLEDGE_GAP, to: PerceptionMode.CONCEPT_BRIDGE, weight: 0.3 },
    { from: PerceptionMode.KNOWLEDGE_GAP, to: PerceptionMode.RANDOM_WALK, weight: 0.25 },
    { from: PerceptionMode.KNOWLEDGE_GAP, to: PerceptionMode.SIMILARITY_CLUSTER, weight: 0.2 },
    { from: PerceptionMode.KNOWLEDGE_GAP, to: PerceptionMode.TEMPORAL_RECENT, weight: 0.15 },
    { from: PerceptionMode.KNOWLEDGE_GAP, to: PerceptionMode.KNOWLEDGE_GAP, weight: 0.1 }
  ];

  private config = {
    minGenerationInterval: 1 * 1000, // 1 second minimum 
    maxGenerationInterval: 10 * 60 * 1000, // 10 minutes maximum 
    stateTransitionInterval: 1 * 1000, // 1 second between state checks 
    thoughtHistoryLimit: 100,
    notesPerSynthesis: 3,
    cooldownTime: 500, // 500ms cooldown 
  };

  constructor(inferenceService: InferenceService) {
    this.database = new DbClient('agi-notes');
    this.inferenceService = inferenceService;
  }

  public start(): void {
    if (this.isRunning) {
      console.log('Live AGI is already running');
      return;
    }

    this.isRunning = true;
    this.currentState = AgiState.IDLE;
    console.log('  Live AGI system started');

    //  Pre-warm caches on startup
    this.warmUpCaches();

    // Start the finite state machine loop
    this.stateInterval = setInterval(() => {
      this.processState();
    }, this.config.stateTransitionInterval);

    this.notifyRenderer('agi-status-changed', {
      isRunning: true,
      state: this.currentState,
      perceptionMode: this.currentPerceptionMode
    });
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('Live AGI is not running');
      return;
    }

    this.isRunning = false;
    if (this.stateInterval) {
      clearInterval(this.stateInterval);
      this.stateInterval = null;
    }

    this.currentState = AgiState.IDLE;
    console.log('  Live AGI system stopped');

    this.notifyRenderer('agi-status-changed', {
      isRunning: false,
      state: this.currentState,
      perceptionMode: this.currentPerceptionMode
    });
  }

  //  Pre-warm caches to avoid cold starts
  private async warmUpCaches(): Promise<void> {
    try {
      await this.getCachedNotes();
      await this.getCachedFiles();
      console.log('  AGI: Caches warmed up');
    } catch (error) {
      console.error('Error warming up caches:', error);
    }
  }

  //  Cached notes retrieval
  private async getCachedNotes(): Promise<any[]> {
    const now = Date.now();
    if (now - this.notesCache.lastUpdated < this.cacheTimeout && this.notesCache.data.length > 0) {
      return this.notesCache.data;
    }

    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) return [];

    const notes = await this.database.queryNotes(generatedDir, {});
    this.notesCache = { data: notes, lastUpdated: now };
    return notes;
  }

  //  Cached files retrieval
  private async getCachedFiles(): Promise<string[]> {
    const now = Date.now();
    if (now - this.filesCache.lastUpdated < this.cacheTimeout && this.filesCache.data.length > 0) {
      return this.filesCache.data;
    }

    const files = await this.getAllAvailableFiles();
    this.filesCache = { data: files, lastUpdated: now };
    return files;
  }

  //  Invalidate caches when new content is generated
  private invalidateCaches(): void {
    this.notesCache.lastUpdated = 0;
    this.filesCache.lastUpdated = 0;
  }

  /**
   *  Main finite state machine processor with faster transitions
   */
  private async processState(): Promise<void> {
    if (!this.isRunning || !config.getAgiConfig()?.enableLiveMode) {
      return;
    }

    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      console.error('Generated directory not available for Live AGI');
      return;
    }

    try {
      switch (this.currentState) {
        case AgiState.IDLE:
          await this.processIdleState();
          break;
        case AgiState.EXPLORING:
          await this.processExploringState();
          break;
        case AgiState.CONTEMPLATING:
          //  Skip contemplation for faster cycles
          this.transitionToState(AgiState.SYNTHESIZING);
          break;
        case AgiState.SYNTHESIZING:
          await this.processSynthesizingState();
          break;
        case AgiState.GENERATING:
          await this.processGeneratingState();
          break;
        case AgiState.COOLDOWN:
          await this.processCooldownState();
          break;
      }
    } catch (error) {
      console.error('Error in Live AGI state processing:', error);
      this.currentState = AgiState.IDLE;
    }
  }

  /**
   *  IDLE State with aggressive start probability
   */
  private async processIdleState(): Promise<void> {
    const notes = await this.getCachedNotes();
    const noteCount = notes.length;

    if (noteCount < 2) {
      return;
    }

    //  Always start thinking if enough time has passed
    const timeSinceLastGeneration = Date.now() - this.lastGenerationTime.getTime();
    if (timeSinceLastGeneration > this.config.minGenerationInterval) {
      console.log('  AGI: Entering exploration mode');
      this.transitionToState(AgiState.EXPLORING);
    }
  }

  /**
   *  EXPLORING State with pre-selection
   */
  private async processExploringState(): Promise<void> {
    // Use pre-selected notes if available, otherwise select new ones
    if (this.preSelectedNotes.length === 0) {
      this.preSelectedNotes = await this.selectNotesForThinking();
    }

    const selectedNotes = this.preSelectedNotes.splice(0, this.config.notesPerSynthesis);

    if (selectedNotes.length === 0) {
      console.log('  AGI: No notes selected, returning to idle');
      this.transitionToState(AgiState.IDLE);
      return;
    }

    // Create current thought
    this.currentThought = {
      timestamp: new Date(),
      state: this.currentState,
      perceptionMode: this.currentPerceptionMode,
      selectedNotes: selectedNotes.map(note => note.filePath),
      reasoning: `Selected ${selectedNotes.length} notes using ${this.currentPerceptionMode} mode`
    };

    this.addToThoughtHistory(this.currentThought);

    console.log(`  AGI: Selected ${selectedNotes.length} notes for synthesis`);
    //  Skip contemplation, go directly to synthesis
    this.transitionToState(AgiState.SYNTHESIZING);
  }

  /**
   *  SYNTHESIZING State with streamlined prompt creation
   */
  private async processSynthesizingState(): Promise<void> {
    if (!this.currentThought) {
      this.transitionToState(AgiState.IDLE);
      return;
    }

    //  Create synthesis prompt synchronously with cached data
    const synthesisPrompt = await this.createOptimizedSynthesisPrompt(this.currentThought.selectedNotes);
    this.currentThought.synthesisPrompt = synthesisPrompt;

    console.log('  AGI: Created synthesis prompt, beginning generation');
    this.transitionToState(AgiState.GENERATING);
  }

  /**
   *  GENERATING State with async handling
   */
  private async processGeneratingState(): Promise<void> {
    if (!this.currentThought || !this.currentThought.synthesisPrompt) {
      this.transitionToState(AgiState.IDLE);
      return;
    }

    try {
      //  Start generation and immediately transition to cooldown
      // The actual generation continues in the background
      this.generateContentAsync(this.currentThought);

      console.log('  AGI: Generation started, entering cooldown');
      this.lastGenerationTime = new Date();
      this.transitionToState(AgiState.COOLDOWN);
    } catch (error) {
      console.error('  AGI: Error during generation:', error);
      this.transitionToState(AgiState.IDLE);
    }
  }

  /**
   *  Async generation that doesn't block state machine
   */
  private async generateContentAsync(thought: AgiThought): Promise<void> {
    try {
      const response = await this.inferenceService.synthesisCompletion(thought.synthesisPrompt!);

      if (response.response) {
        thought.generatedContent = response.response;

        // Save in background
        this.saveGeneratedNote(response.response, thought).then(() => {
          console.log('  AGI: Successfully generated and saved new note');
          this.invalidateCaches(); // Invalidate caches after new content
        }).catch(error => {
          console.error('  AGI: Error saving generated note:', error);
        });
      }
    } catch (error) {
      console.error('  AGI: Error in async generation:', error);
    }
  }

  /**
   *  COOLDOWN State with reduced wait time
   */
  private async processCooldownState(): Promise<void> {
    //  Much shorter cooldown
    setTimeout(() => {
      if (this.currentState === AgiState.COOLDOWN) {
        console.log('  AGI: Cooldown complete, returning to idle');
        this.evolvePerceptionMode(); // Evolve perception during cooldown
        this.transitionToState(AgiState.IDLE);
      }
    }, this.config.cooldownTime);
  }

  /**
   *  Batch note selection for different modes
   */
  private async selectNotesForThinking(): Promise<any[]> {
    const notes = await this.getCachedNotes();
    if (notes.length === 0) return [];

    let selectedNotes: any[] = [];

    switch (this.currentPerceptionMode) {
      case PerceptionMode.RANDOM_WALK:
        //  Pre-shuffle and select
        selectedNotes = this.shuffleArray([...notes]).slice(0, this.config.notesPerSynthesis * 2);
        break;
      case PerceptionMode.SIMILARITY_CLUSTER:
        selectedNotes = await this.selectSimilarNotesOptimized(notes);
        break;
      case PerceptionMode.TEMPORAL_RECENT:
        selectedNotes = await this.selectRecentNotesOptimized();
        break;
      case PerceptionMode.CONCEPT_BRIDGE:
        selectedNotes = this.selectBridgeNotesOptimized(notes);
        break;
      case PerceptionMode.KNOWLEDGE_GAP:
        selectedNotes = this.selectGapNotesOptimized(notes);
        break;
    }

    return selectedNotes;
  }

  //  Fast array shuffle
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  //  Similarity selection without additional DB calls
  private async selectSimilarNotesOptimized(allNotes: any[]): Promise<any[]> {
    if (allNotes.length === 0) return [];

    const seedNote = allNotes[Math.floor(Math.random() * allNotes.length)];
    const seedWords = new Set(seedNote.content.toLowerCase().split(/\s+/).filter((w: string | any[]) => w.length > 3));

    // Simple similarity based on word overlap
    const scored = allNotes.map(note => {
      const noteWords = new Set(note.content.toLowerCase().split(/\s+/).filter((w: string | any[]) => w.length > 3));
      const intersection = new Set([...seedWords].filter(x => noteWords.has(x)));
      const similarity = intersection.size / Math.max(seedWords.size, noteWords.size);
      return { note, similarity };
    });

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.config.notesPerSynthesis * 2)
      .map(item => item.note);
  }

  //  Recent notes with filesystem cache
  private async selectRecentNotesOptimized(): Promise<any[]> {
    const files = await this.getCachedFiles();
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) return [];

    try {
      const recentFiles = files
        .map(file => {
          const filePath = path.join(generatedDir, file);
          try {
            const stats = fs.statSync(filePath);
            return { name: file, path: filePath, mtime: stats.mtime.getTime() };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => b!.mtime - a!.mtime)
        .slice(0, this.config.notesPerSynthesis * 2);

      return recentFiles.map(file => ({
        filePath: file!.path,
        content: fileService.readFile(file!.path)
      }));
    } catch (error) {
      console.error('Error selecting recent notes:', error);
      return [];
    }
  }

  //  Bridge notes selection without expensive operations
  private selectBridgeNotesOptimized(notes: any[]): any[] {
    // Fast heuristic: notes with moderate length and diverse vocabulary
    return notes
      .filter(note => {
        const words = note.content.split(/\s+/);
        return words.length > 50 && words.length < 500; // Sweet spot for bridge notes
      })
      .slice(0, this.config.notesPerSynthesis * 2);
  }

  //  Gap notes selection
  private selectGapNotesOptimized(notes: any[]): any[] {
    // Fast selection of shorter notes (potential gaps)
    return notes
      .sort((a, b) => a.content.length - b.content.length)
      .slice(0, this.config.notesPerSynthesis * 2);
  }

  //  Streamlined synthesis prompt creation
  private async createOptimizedSynthesisPrompt(selectedNotePaths: string[]): Promise<string> {
    const maxContentLength = 300; // Limit content length for faster processing
    let contextContent = '';
    const sourceNoteNames: string[] = [];

    for (let i = 0; i < Math.min(selectedNotePaths.length, 3); i++) { // Limit to 3 notes max
      try {
        const fullContent = fileService.readFile(selectedNotePaths[i]);
        const truncatedContent = fullContent.length > maxContentLength
          ? fullContent.substring(0, maxContentLength) + '...'
          : fullContent;

        const fileName = path.basename(selectedNotePaths[i], '.md');
        sourceNoteNames.push(fileName);
        contextContent += `\n## Source ${i + 1}: ${fileName}\n${truncatedContent}\n`;
      } catch (error) {
        console.error(`Error reading note ${selectedNotePaths[i]}:`, error);
      }
    }

    //  Shorter, more focused prompt
    return `Synthesize these notes into a new thought (200-400 words):

${contextContent}

Create a new note that connects these ideas with a clear title. Focus on novel insights and connections. Use markdown formatting.`;
  }

  //  Async file operations for save
  private async saveGeneratedNote(content: string, thought: AgiThought): Promise<void> {
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      throw new Error('Generated directory not available');
    }

    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'AGI Generated Thought';

    const safeTitle = title
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30); // Shorter filename

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `fully_generated_${safeTitle}_${timestamp}.md`;
    const filePath = path.join(generatedDir, filename);

    const linkedNotesSection = this.createLinkedNotesSection(thought.selectedNotes);
    const metadata = `<!-- AGI Generated: ${thought.timestamp.toISOString()} -->\n`;
    const fullContent = metadata + content + linkedNotesSection;

    //  Async file operations
    await fs.promises.writeFile(filePath, fullContent);
    agiSync.notifyGraphRefresh();

    //  Run database and graph operations in parallel
    const [, linkedFiles] = await Promise.all([
      this.database.upsertNotes(generatedDir, filePath, content, 'generated'),
      Promise.resolve(graphService.parse_file_links(fullContent, await this.getCachedFiles()))
    ]);

    // Background operations
    Promise.resolve(agiSync.createNodeInAgiGraph(filename, linkedFiles, 'generated')).catch(console.error);
    agiSync.notifyFilesRefresh();

    console.log(`  AGI: Saved generated note: ${filename}`);
  }

  private createLinkedNotesSection(selectedNotePaths: string[]): string {
    if (selectedNotePaths.length === 0) return '';

    let section = '\n\n## Linked Notes\n';
    for (const notePath of selectedNotePaths) {
      const fileName = path.basename(notePath, '.md');
      section += `- [[${fileName}]]\n`;
    }
    return section;
  }

  private async getAllAvailableFiles(): Promise<string[]> {
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) return [];

    try {
      const files = await fs.promises.readdir(generatedDir);
      return files.filter(file => file.endsWith('.md'));
    } catch (error) {
      console.error('Error getting available files:', error);
      return [];
    }
  }

  private evolvePerceptionMode(): void {
    const transitions = this.markovTransitions.filter(t => t.from === this.currentPerceptionMode);
    if (transitions.length === 0) {
      this.currentPerceptionMode = PerceptionMode.RANDOM_WALK;
      return;
    }

    const totalWeight = transitions.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const transition of transitions) {
      random -= transition.weight;
      if (random <= 0) {
        this.currentPerceptionMode = transition.to;
        console.log(`  AGI: Perception mode evolved to ${this.currentPerceptionMode}`);
        break;
      }
    }
  }

  private transitionToState(newState: AgiState): void {
    const oldState = this.currentState;
    this.currentState = newState;

    console.log(`  AGI: State transition ${oldState} -> ${newState}`);

    this.notifyRenderer('agi-status-changed', {
      isRunning: this.isRunning,
      state: this.currentState,
      perceptionMode: this.currentPerceptionMode
    });
  }

  private addToThoughtHistory(thought: AgiThought): void {
    this.thoughtHistory.push(thought);
    if (this.thoughtHistory.length > this.config.thoughtHistoryLimit) {
      this.thoughtHistory.shift();
    }
  }

  private notifyRenderer(channel: string, data: any): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      state: this.currentState,
      perceptionMode: this.currentPerceptionMode,
      thoughtCount: this.thoughtHistory.length,
      lastGenerationTime: this.lastGenerationTime
    };
  }

  public getThoughtHistory(): AgiThought[] {
    return [...this.thoughtHistory];
  }

  public updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
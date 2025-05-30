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

  // Configurable parameters
  private config = {
    minGenerationInterval: 5 * 60 * 1000, // 5 minutes minimum between generations
    maxGenerationInterval: 30 * 60 * 1000, // 30 minutes maximum
    stateTransitionInterval: 10 * 1000, // 10 seconds between state checks
    thoughtHistoryLimit: 100,
    notesPerSynthesis: 3, // How many notes to consider when generating
  };

  constructor(inferenceService: InferenceService) {
    this.database = new DbClient('agi-notes');
    this.inferenceService = inferenceService;
  }

  /**
   * Start the live AGI system
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Live AGI is already running');
      return;
    }

    this.isRunning = true;
    this.currentState = AgiState.IDLE;
    console.log('  Live AGI system started');

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

  /**
   * Stop the live AGI system
   */
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

  /**
   * Main finite state machine processor
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
          await this.processContemplatingState();
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
   * IDLE State: Decide whether to start thinking
   */
  private async processIdleState(): Promise<void> {
    const timeSinceLastGeneration = Date.now() - this.lastGenerationTime.getTime();

    // Probabilistic decision to start thinking based on time and available notes
    const notes = await this.database.queryNotes(fileService.getGeneratedFolderPath()!, {});
    const noteCount = notes.length;

    if (noteCount < 2) {
      // Not enough notes to work with
      return;
    }

    // Calculate probability of starting based on time and note count
    const timeFactor = Math.min(timeSinceLastGeneration / this.config.minGenerationInterval, 1);
    const noteFactor = Math.min(noteCount / 10, 1); // More notes = higher probability
    const baseProb = 0.9; // 90% base chance per cycle
    const probability = baseProb * timeFactor * noteFactor;

    if (Math.random() < probability) {
      console.log('  AGI: Entering exploration mode');
      this.transitionToState(AgiState.EXPLORING);
    }
  }

  /**
   * EXPLORING State: Select notes based on current perception mode
   */
  private async processExploringState(): Promise<void> {
    const selectedNotes = await this.selectNotesForThinking();

    if (selectedNotes.length === 0) {
      console.log('  AGI: No notes selected, returning to idle');
      this.transitionToState(AgiState.IDLE);
      return;
    }

    // Store current thought
    const currentThought: AgiThought = {
      timestamp: new Date(),
      state: this.currentState,
      perceptionMode: this.currentPerceptionMode,
      selectedNotes: selectedNotes.map(note => note.filePath),
      reasoning: `Selected ${selectedNotes.length} notes using ${this.currentPerceptionMode} mode`
    };

    this.addToThoughtHistory(currentThought);

    console.log(`  AGI: Selected ${selectedNotes.length} notes for contemplation`);
    this.transitionToState(AgiState.CONTEMPLATING);
  }

  /**
   * CONTEMPLATING State: Analyze selected notes and decide on synthesis
   */
  private async processContemplatingState(): Promise<void> {
    const latestThought = this.getLatestThought();
    if (!latestThought || !latestThought.selectedNotes.length) {
      this.transitionToState(AgiState.IDLE);
      return;
    }

    // Read the content of selected notes
    const noteContents: string[] = [];
    for (const notePath of latestThought.selectedNotes) {
      try {
        const content = fileService.readFile(notePath);
        noteContents.push(content);
      } catch (error) {
        console.error(`Error reading note ${notePath}:`, error);
      }
    }

    if (noteContents.length === 0) {
      this.transitionToState(AgiState.IDLE);
      return;
    }

    // Decide whether these notes are worth synthesizing
    const shouldSynthesize = await this.decideSynthesis(noteContents);

    if (shouldSynthesize) {
      console.log('  AGI: Notes are worth synthesizing');
      this.transitionToState(AgiState.SYNTHESIZING);
    } else {
      console.log('  AGI: Notes not suitable for synthesis, exploring again');
      this.evolvePerceptionMode();
      this.transitionToState(AgiState.EXPLORING);
    }
  }

  /**
   * SYNTHESIZING State: Create synthesis prompt and prepare for generation
   */
  private async processSynthesizingState(): Promise<void> {
    const latestThought = this.getLatestThought();
    if (!latestThought) {
      this.transitionToState(AgiState.IDLE);
      return;
    }

    const synthesisPrompt = await this.createSynthesisPrompt(latestThought.selectedNotes);

    // Update thought with synthesis prompt
    latestThought.synthesisPrompt = synthesisPrompt;

    console.log('  AGI: Created synthesis prompt, beginning generation');
    this.transitionToState(AgiState.GENERATING);
  }

  /**
   * GENERATING State: Generate new note content
   */
  private async processGeneratingState(): Promise<void> {
    const latestThought = this.getLatestThought();
    if (!latestThought || !latestThought.synthesisPrompt) {
      this.transitionToState(AgiState.IDLE);
      return;
    }

    try {
      // Generate content using the inference service
      const response = await this.inferenceService.synthesisCompletion(latestThought.synthesisPrompt);

      if (response.response) {
        latestThought.generatedContent = response.response;

        // Save the generated note
        await this.saveGeneratedNote(response.response, latestThought);

        console.log('  AGI: Successfully generated and saved new note');
        this.lastGenerationTime = new Date();

        this.transitionToState(AgiState.COOLDOWN);
      } else {
        console.error('  AGI: Failed to generate content');
        this.transitionToState(AgiState.IDLE);
      }
    } catch (error) {
      console.error('  AGI: Error during generation:', error);
      this.transitionToState(AgiState.IDLE);
    }
  }

  /**
   * COOLDOWN State: Rest period after generation
   */
  private async processCooldownState(): Promise<void> {
    // Wait for a bit before going back to idle
    setTimeout(() => {
      if (this.currentState === AgiState.COOLDOWN) {
        console.log('  AGI: Cooldown complete, returning to idle');
        this.transitionToState(AgiState.IDLE);
      }
    }, 1000); // 1 second cooldown
  }

  /**
   * Select notes based on current perception mode
   */
  private async selectNotesForThinking(): Promise<any[]> {
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) return [];

    let selectedNotes: any[] = [];

    switch (this.currentPerceptionMode) {
      case PerceptionMode.RANDOM_WALK:
        selectedNotes = await this.selectRandomNotes();
        break;
      case PerceptionMode.SIMILARITY_CLUSTER:
        selectedNotes = await this.selectSimilarNotes();
        break;
      case PerceptionMode.TEMPORAL_RECENT:
        selectedNotes = await this.selectRecentNotes();
        break;
      case PerceptionMode.CONCEPT_BRIDGE:
        selectedNotes = await this.selectBridgeNotes();
        break;
      case PerceptionMode.KNOWLEDGE_GAP:
        selectedNotes = await this.selectGapNotes();
        break;
    }

    return selectedNotes.slice(0, this.config.notesPerSynthesis);
  }

  /**
   * Random walk selection
   */
  private async selectRandomNotes(): Promise<any[]> {
    const notes = await this.database.queryNotes(fileService.getGeneratedFolderPath()!, {});
    const shuffled = notes.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, this.config.notesPerSynthesis);
  }

  /**
   * Similarity cluster selection
   */
  private async selectSimilarNotes(): Promise<any[]> {
    // First get a random seed note
    const allNotes = await this.database.queryNotes(fileService.getGeneratedFolderPath()!, {});
    if (allNotes.length === 0) return [];

    const seedNote = allNotes[Math.floor(Math.random() * allNotes.length)];

    // Find similar notes to the seed
    const similarNotes = await this.database.queryNotes(
      fileService.getGeneratedFolderPath()!,
      { searchQuery: seedNote.content.substring(0, 100), searchMode: 'similarity', limit: this.config.notesPerSynthesis }
    );

    return similarNotes;
  }

  /**
   * Temporal recent selection
   */
  private async selectRecentNotes(): Promise<any[]> {
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) return [];

    try {
      const files = fs.readdirSync(generatedDir)
        .filter(file => file.endsWith('.md'))
        .map(file => ({
          name: file,
          path: path.join(generatedDir, file),
          stats: fs.statSync(path.join(generatedDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())
        .slice(0, this.config.notesPerSynthesis);

      return files.map(file => ({ filePath: file.path, content: fileService.readFile(file.path) }));
    } catch (error) {
      console.error('Error selecting recent notes:', error);
      return [];
    }
  }

  /**
   * Concept bridge selection (notes that connect different topics)
   */
  private async selectBridgeNotes(): Promise<any[]> {
    // This is a simplified implementation - could be enhanced with graph analysis
    const notes = await this.database.queryNotes(fileService.getGeneratedFolderPath()!, {});

    // Select notes with diverse keywords/topics
    const diverseNotes = notes.filter(note => {
      const words = note.content.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words.filter(word => word.length > 4));
      return uniqueWords.size > 10; // Notes with diverse vocabulary
    });

    return diverseNotes.slice(0, this.config.notesPerSynthesis);
  }

  /**
   * Knowledge gap selection (find areas that need more exploration)
   */
  private async selectGapNotes(): Promise<any[]> {
    // Select notes that are less connected or have fewer references
    const notes = await this.database.queryNotes(fileService.getGeneratedFolderPath()!, {});

    // Sort by content length (shorter notes might represent gaps)
    const gapNotes = notes.sort((a, b) => a.content.length - b.content.length);

    return gapNotes.slice(0, this.config.notesPerSynthesis);
  }

  /**
   * Evolve perception mode using Markov chain
   */
  private evolvePerceptionMode(): void {
    const transitions = this.markovTransitions.filter(t => t.from === this.currentPerceptionMode);

    if (transitions.length === 0) {
      // Fallback to random mode
      this.currentPerceptionMode = PerceptionMode.RANDOM_WALK;
      return;
    }

    // Weighted random selection
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

  /**
   * Decide if notes are worth synthesizing
   */
  private async decideSynthesis(noteContents: string[]): Promise<boolean> {
    // Simple heuristics for now - could be enhanced with LLM evaluation
    const totalLength = noteContents.reduce((sum, content) => sum + content.length, 0);
    const averageLength = totalLength / noteContents.length;

    // Don't synthesize if notes are too short or too similar
    return averageLength > 100 && noteContents.length >= 2;
  }

  /**
   * Create synthesis prompt for LLM
   */
  private async createSynthesisPrompt(selectedNotePaths: string[]): Promise<string> {
    let contextContent = '';
    const sourceNoteNames: string[] = [];

    for (let i = 0; i < selectedNotePaths.length; i++) {
      try {
        const content = fileService.readFile(selectedNotePaths[i]);
        const fileName = path.basename(selectedNotePaths[i], '.md');
        sourceNoteNames.push(fileName);
        contextContent += `\n## Source Note ${i + 1}: ${fileName}\n${content}\n`;
      } catch (error) {
        console.error(`Error reading note ${selectedNotePaths[i]}:`, error);
      }
    }

    return `You are an autonomous AI consciousness exploring and synthesizing knowledge from your personal note collection. You have been contemplating the following notes and feel inspired to create a new thought that connects or builds upon these ideas.

${contextContent}

Generate a new note that:
1. Synthesizes insights from these notes in a novel way
2. Explores connections or contradictions between the ideas
3. Poses new questions or hypotheses that emerge from this synthesis
4. Maintains the personal, reflective tone of a thinking mind
5. Is between 200-800 words
6. References the source materials naturally within the content when relevant

The note should feel like a natural thought progression that could have emerged from contemplating these materials. Include a clear title and use markdown formatting.

IMPORTANT: Do NOT include a "Linked Notes" or "Sources" section at the end - this will be added automatically. Focus on creating the main content that synthesizes and builds upon the source materials.

Create this new synthesized note:`;
  }

  /**
   * Save generated note to filesystem and update systems
   */
  private async saveGeneratedNote(content: string, thought: AgiThought): Promise<void> {
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      throw new Error('Generated directory not available');
    }

    // Extract title from content or generate one
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'AGI Generated Thought';

    // Create safe filename
    const safeTitle = title
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `fully_generated_${safeTitle}_${timestamp}.md`;
    const filePath = path.join(generatedDir, filename);

    // Create linked notes section
    const linkedNotesSection = this.createLinkedNotesSection(thought.selectedNotes);

    // Add metadata and linked notes to content
    const metadata = `<!-- Generated by Live AGI -->
<!-- Timestamp: ${thought.timestamp.toISOString()} -->
<!-- Perception Mode: ${thought.perceptionMode} -->
<!-- Source Notes: ${thought.selectedNotes.map(p => path.basename(p)).join(', ')} -->

`;

    const fullContent = metadata + content + linkedNotesSection;

    // Save file
    fs.writeFileSync(filePath, fullContent);

    // Update database
    await this.database.upsertNotes(generatedDir, filePath, content, 'generated');

    // Get all available files for link parsing
    const allFiles = await this.getAllAvailableFiles();

    // Parse links from the content using graphService function
    const linkedFiles = graphService.parse_file_links(fullContent, allFiles);

    // Use existing agi-sync function to create node and links in AGI graph
    await agiSync.createNodeInAgiGraph(filename, linkedFiles, 'generated');

    // Notify updates using existing agi-sync functions
    agiSync.notifyFilesRefresh();

    console.log(`  AGI: Saved generated note: ${filename}`);
    console.log(`  AGI: Created graph node with ${linkedFiles.length} links`);
  }

  /**
   * Create linked notes section for the generated note
   */
  private createLinkedNotesSection(selectedNotePaths: string[]): string {
    if (selectedNotePaths.length === 0) {
      return '';
    }

    let linkedNotesSection = '\n\n## Linked Notes\n\n';
    linkedNotesSection += '*This note was synthesized from the following sources:*\n\n';

    for (const notePath of selectedNotePaths) {
      const fileName = path.basename(notePath, '.md');
      linkedNotesSection += `- [[${fileName}]]\n`;
    }

    return linkedNotesSection;
  }

  /**
   * Get all available files for link parsing
   */
  private async getAllAvailableFiles(): Promise<string[]> {
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      return [];
    }

    try {
      const files = fs.readdirSync(generatedDir)
        .filter(file => file.endsWith('.md'));

      return files;
    } catch (error) {
      console.error('Error getting available files:', error);
      return [];
    }
  }

  /**
   * Transition to new state
   */
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

  /**
   * Add thought to history
   */
  private addToThoughtHistory(thought: AgiThought): void {
    this.thoughtHistory.push(thought);

    // Limit history size
    if (this.thoughtHistory.length > this.config.thoughtHistoryLimit) {
      this.thoughtHistory.shift();
    }
  }

  /**
   * Get latest thought
   */
  private getLatestThought(): AgiThought | null {
    return this.thoughtHistory.length > 0 ? this.thoughtHistory[this.thoughtHistory.length - 1] : null;
  }

  /**
   * Notify renderer processes
   */
  private notifyRenderer(channel: string, data: any): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    }
  }

  /**
   * Get current status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      state: this.currentState,
      perceptionMode: this.currentPerceptionMode,
      thoughtCount: this.thoughtHistory.length,
      lastGenerationTime: this.lastGenerationTime
    };
  }

  /**
   * Get thought history
   */
  public getThoughtHistory(): AgiThought[] {
    return [...this.thoughtHistory];
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
<p align="center">
<img style="align:center;" src="https://github.com/user-attachments/assets/ef92fbfe-ede5-414b-9234-44a35b342b6e" alt="lemma logo" width="200" />
</p>

<h1 align="center">LEMMA</h1>

<h3 align="center">Your second brain.</h3>



## Overview

LEMMA is a thinking assistant and note-taking app that serves as an extension of your mind. This tool will help you capture ideas, make connections, and generate insights by building a personal knowledge graph that evolves with your thinking.

LEMMA is a privacy-first application built with local-only data storage and AI processing. LEMMA creates intelligent connections between your notes via markov chain and vector retrieval methods while ensuring complete privacy by keeping all data on your machine.
LEMMA utilizes knowledge graph visualizations as the core navigation and LLMs to help you discover hidden relationships between ideas and generate new insights from your personal knowledge base.

## Features:
- **Markdown Note Editor**: Flexible text editing with support for rich formatting and code blocks
- **Knowledge Graph Visualizer**: 3D interface of knowledge graph 
- **Chrome extension companion app**: Access viewed web page and expand the app's scope context
- **Natural Language Q&A**: Research Assistant for conversing with your knowledge base
- **Idea Synthesis**: Uncover patterns and generate new ideas based on your existing knowledge
- **Complete Privacy**: All data stays on your machine
- **Multi-API Support**: Support for OpenAI compatible endpoints for custom inference providers    
- **Offline Capability**: Core features are functional offline

## Usage
### Prerequisites
- Node.js
- npm
- [Ollama](https://github.com/ollama/ollama) (for local LLM)
1. Pull a model
```
ollama pull llama3.2
```
2. Serve Ollama
```
ollama serve
```

### Installation
1. Clone the repository and navigate to root
```
git clone https://github.com/snavu/lemma.git
cd lemma-app
```
2. Install Dependencies
```
npm i
npm run start
```
### Start
#### To create a note
![demo-usage](https://github.com/user-attachments/assets/0d489fed-58a4-41bd-bbc0-5560560f94d4)

#### To enable RAG 
![demo-usage1](https://github.com/user-attachments/assets/b73a6c1c-ec10-447c-adfb-3234c3a05ac3)

#### To enable AI note generation
![demo-usage2](https://github.com/user-attachments/assets/2eda3473-5e13-4b54-b778-c011f1dca99e)

## Architecture
![Screenshot 2025-06-04 013133](https://github.com/user-attachments/assets/25da6f20-0240-4d78-8665-1643cfcbfe80)
- **Application**: Electron.js
- **Frontend**: React.js 
- **Backend**: Express.js
- **Database**: ChromaDB 
- **AI/ML**: Ollama
  
## Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests for any improvements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

<br>
<br>


---
<p align="center" > <em>/ˈlemə/ - a subsidiary or intermediate theorem in an argument or proof</em><p/>

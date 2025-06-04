import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  root: './src/renderer',
  plugins: [
    react({
      jsxRuntime: 'automatic',
    })
  ],
  base: '',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom'],

          // Text editor 
          'editor': [
            '@tiptap/core',
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-bubble-menu',
            '@tiptap/extension-code-block',
            '@tiptap/extension-code-block-lowlight',
            '@tiptap/extension-link',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-task-item',
            '@tiptap/extension-task-list',
            '@tiptap/suggestion',
            'tiptap-markdown',
            'lowlight',
          ],

          // 3D visualization 
          'three': [
            'three',
            'three-stdlib',

          ],

          'graphh': [
            '3d-force-graph',
            'react-force-graph-3d'
          ],

          // AI/ML libraries 
          'ai-ml': [
            'chromadb',
            'chromadb-default-embed',
            'ollama',
            'onnxruntime-common',
            'onnxruntime-node',
            'onnxruntime-web'
          ],

          // Markdown processing
          'markdown': [
            'marked',
            'react-markdown',
            'markdown-to-txt',
            'github-markdown-css'
          ],

          // Utilities
          'utils': [
            'lodash',
            'fuse.js',
            'jsonrepair',
            'async-sema',
            'element-resize-detector'
          ],

          // UI components
          'ui': [
            'lucide-react',
            'tippy.js',
            'sonner'
          ],

          // Server/networking 
          'network': [
            'express'
          ]
        }
      },
    },
    chunkSizeWarningLimit: 1500,

  }
});
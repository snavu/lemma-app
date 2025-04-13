/**
 * Main entry point for the renderer process
 */

import './index.css';
import { createRoot } from 'react-dom/client';
import { App } from './app';

// Get the root element
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// Create a root
const root = createRoot(rootElement);

// Render app to root
root.render(<App />); 

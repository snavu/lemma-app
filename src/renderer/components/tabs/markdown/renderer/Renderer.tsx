/**
 * Markdown Renderer Component
 * 
 * This component parses and renders Markdown text into React components.
 * It follows a three-step process:
 * 1. Tokenize the input text into meaningful blocks
 * 2. Build an Abstract Syntax Tree (AST) from the tokens
 * 3. Render the AST into React components
 */

import React, { useState, useCallback } from 'react';

interface RendererProps {
    /** The markdown text to be rendered */
    text: string;
    onChange: (newText: string) => void;
}

/**
 * Represents a token extracted from the markdown text
 */
interface Token {
    type: 'HEADING' | 'PARAGRAPH' | 'BOLD' | 'ITALIC' | 'LINK' | 'IMAGE' | 'LIST' | 'LIST_ITEM';
    content?: string;
    level?: number;
    url?: string;
    alt?: string;
}

/**
 * Represents a node in the Abstract Syntax Tree
 */
interface AstNode {
    id: string; // Unique identifier for each node
    type: 'Heading' | 'Paragraph' | 'Bold' | 'Italic' | 'Link' | 'Image' | 'List' | 'ListItem';
    content?: string;
    level?: number;
    url?: string;
    lineNumber: number;
    alt?: string;
    children?: AstNode[];
    editing?: boolean;
}

/**
 * Represents the complete Abstract Syntax Tree
 */
interface AstDocument {
    type: 'Document';
    children: AstNode[];
}

/**
 * Tokenizes the input markdown text into a sequence of tokens
 * 
 * @param text - The text to tokenize
 * @returns An array of tokens representing the markdown structure
 */
const Tokenizer = (text: string): Token[] => {
    //console.log("Input text:", text);
    const tokens: Token[] = [];
    let remaining = text;
    
    // Handle empty text
    if (!text || text.trim() === '') {
        //console.log("Empty text, returning empty tokens");
        return tokens;
    }

    while (remaining.length) {
        //console.log("Remaining text:", remaining);
        
        // Check for headings
        if (remaining.startsWith('#')) {
            const headingMatch = remaining.match(/^(#{1,6})\s+(.*)/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const content = headingMatch[2];
                tokens.push({ type: 'HEADING', level, content });
                remaining = remaining.slice(headingMatch[0].length);
                continue;
            }
        }
        
        // Check for bold text
        if (remaining.startsWith('*')) {
            const boldMatch = remaining.match(/^\*(.*?)\*/);
            if (boldMatch) {
                tokens.push({ type: 'BOLD', content: boldMatch[1] });
                remaining = remaining.slice(boldMatch[0].length);
                continue;
            }
        }
        
        // Check for italic text
        if (remaining.startsWith('_')) {
            const italicMatch = remaining.match(/^_(.*?)_/);
            if (italicMatch) {
                tokens.push({ type: 'ITALIC', content: italicMatch[1] });
                remaining = remaining.slice(italicMatch[0].length);
                continue;
            }
        }
        
        // Check for links
        if (remaining.startsWith('[')) {
            const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                tokens.push({ type: 'LINK', content: linkMatch[1], url: linkMatch[2] });
                remaining = remaining.slice(linkMatch[0].length);
                continue;
            }
        }

        // Check for images
        if (remaining.startsWith('![') && remaining.includes('](')) {
            const imageMatch = remaining.match(/^!\[([^\]]+)\]\(([^)]+)\)/);
            if (imageMatch) {
                tokens.push({ type: 'IMAGE', content: imageMatch[1], url: imageMatch[2] });
                remaining = remaining.slice(imageMatch[0].length);
                continue;
            }
        }

        // Check for lists with any indentation
        if (remaining.match(/^[\t ]*-/)) {
            const listItemMatch = remaining.match(/^([\t ]*)-([^\n]+)(?:\n|$)/);
            if (listItemMatch) {
                const indentStr = listItemMatch[1];
                const tabCount = (indentStr.match(/\t/g) || []).length;
                const spaceCount = Math.floor((indentStr.match(/ /g) || []).length / 4);
                const level = tabCount + spaceCount;
                
                tokens.push({ 
                    type: 'LIST_ITEM', 
                    content: listItemMatch[2].trim(),
                    level: level
                });
                remaining = remaining.slice(listItemMatch[0].length);
                continue;
            }
        }
        
        // Handle paragraphs
        const paragraphMatch = remaining.match(/^([^\n]+)(?:\n|$)/);
        if (paragraphMatch) {
            const content = paragraphMatch[1].trim();
            if (content) {
                tokens.push({ type: 'PARAGRAPH', content });
            }
            remaining = remaining.slice(paragraphMatch[0].length);
        }else{
            // If no match is found, remove one character to prevent infinite loop
            remaining = remaining.slice(1);
        }
    }
    
    console.log("Final tokens:", tokens);
    return tokens;
};

/**
 * Parses tokens into an Abstract Syntax Tree
 * 
 * @param tokens - The array of tokens to parse
 * @returns An AST document containing the parsed structure
 */
const parseTokens = (tokens: Token[]): AstDocument => {
    const ast: AstDocument = {
        type: 'Document',
        children: []
    };
    let currentLine = 0;

    while (tokens.length > 0) {
        const token = tokens.shift();
        if (token.type === 'HEADING') {
            const heading: AstNode = {
                id: `heading-${currentLine}`,
                type: 'Heading',
                level: token.level,
                content: token.content,
                lineNumber: currentLine
            };
            ast.children.push(heading);
            currentLine++;
        } else if (token.type === 'PARAGRAPH') {
            const paragraph: AstNode = {
                id: `paragraph-${currentLine}`,
                type: 'Paragraph',
                content: token.content,
                lineNumber: currentLine
            };
            ast.children.push(paragraph);
            currentLine++;
        } else if (token.type === 'BOLD') {
            const bold: AstNode = {
                id: `bold-${currentLine}`,
                type: 'Bold',
                content: token.content,
                lineNumber: currentLine
            };
            ast.children.push(bold);
            currentLine++;
        } else if (token.type === 'ITALIC') {
            const italic: AstNode = {
                id: `italic-${currentLine}`,
                type: 'Italic',
                content: token.content,
                lineNumber: currentLine
            };
            ast.children.push(italic);
            currentLine++;
        } else if (token.type === 'LINK') {
            const link: AstNode = {
                id: `link-${currentLine}`,
                type: 'Link',
                content: token.content,
                url: token.url,
                lineNumber: currentLine
            };
            ast.children.push(link);
            currentLine++;
        } else if (token.type === 'IMAGE') {
            const image: AstNode = {
                id: `image-${currentLine}`,
                type: 'Image',
                alt: token.alt,
                url: token.url,
                lineNumber: currentLine
            };
            ast.children.push(image);
            currentLine++;
        } else if (token.type === 'LIST') {
            const list: AstNode = {
                id: `list-${currentLine}`,
                type: 'List',
                content: token.content,
                lineNumber: currentLine
            };
            ast.children.push(list);
            currentLine++;
        } else if (token.type === 'LIST_ITEM') {
            const listItem: AstNode = {
                id: `list-item-${currentLine}`,
                type: 'ListItem',
                content: token.content,
                lineNumber: currentLine,
                level: token.level || 0
            };
            ast.children.push(listItem);
            currentLine++;
        }
    }
    return ast;
}

/**
 * Renders an AST node or document into React components
 * 
 * @param ast - The AST node or document to render
 * @param currentLine - The current line number for the AST node
 * @param fullAst - The complete AST document (always passed)
 * @param updateAst - Optional function to update the AST and force a re-render
 * @returns A React node representing the rendered content
 */
const renderAst = (
    ast: AstDocument | AstNode, 
    currentLine: number, 
    fullAst: AstDocument,
    updateAst?: (newAst: AstDocument) => void
): React.ReactNode => {
    // Common click handler style
    const clickableStyle: React.CSSProperties = {
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '3px',
        outline: 'none', // Remove the focus outline
    };
    
    // Helper function to convert a node to its markdown representation
    const nodeToMarkdown = (node: AstNode): string => {
        switch (node.type) {
            case 'Heading':
                return `${'#'.repeat(node.level || 1)} ${node.content || ''}`;
            case 'Bold':
                return `*${node.content || ''}*`;
            case 'Italic':
                return `_${node.content || ''}_`;
            case 'Link':
                return `[${node.content || ''}](${node.url || ''})`;
            case 'Image':
                return `![${node.alt || ''}](${node.url || ''})`;
            case 'ListItem':
                return `${'  '.repeat(node.level || 0)}- ${node.content || ''}`;
            case 'Paragraph':
            default:
                return node.content || '';
        }
    };
    
    // Helper function to create clickable elements
    const createEditableElement = (
        elementType: keyof React.JSX.IntrinsicElements | React.ComponentType<any>,
        content: string,
        elementName: string,
        additionalProps: Record<string, any> = {},
        nodeId?: string  // Add nodeId parameter
    ): React.ReactNode => {
        // Get the raw markdown text for editing only when the node is being edited
        const isEditing = (ast as AstNode).editing;
        const displayText = isEditing && nodeId ? nodeToMarkdown(ast as AstNode) : content;
        
        const handleChange = (newContent: string) => {
            // Get the node id from the element's dataset
            const currentNodeId = (ast as AstNode).id;
            
            // Find the current node in the AST
            let currentNode = null;
            if (fullAst.type === 'Document' && fullAst.children) {
                // Find a node by its ID
                const findNodeById = (nodes: AstNode[]): AstNode | null => {
                    for (const node of nodes) {
                        if (node.id === currentNodeId) return node;
                        if (node.children) {
                            const found = findNodeById(node.children);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                
                currentNode = findNodeById(fullAst.children);
            }
            
            if (currentNode) {
                // Check if the content matches a markdown format
                let newType = currentNode.type;
                let newLevel = currentNode.level;
                let newUrl = currentNode.url;
                let newAlt = currentNode.alt;
                
                // Check for headings
                const headingMatch = newContent.match(/^(#{1,6})\s+(.*)/);
                if (headingMatch) {
                    newType = 'Heading';
                    newLevel = headingMatch[1].length;
                    newContent = headingMatch[2];
                }
                
                // Check for bold text
                const boldMatch = newContent.match(/^\*(.*?)\*/);
                if (boldMatch) {
                    newType = 'Bold';
                    newContent = boldMatch[1];
                }
                
                // Check for italic text
                const italicMatch = newContent.match(/^_(.*?)_/);
                if (italicMatch) {
                    newType = 'Italic';
                    newContent = italicMatch[1];
                }
                
                // Check for links
                const linkMatch = newContent.match(/^\[([^\]]+)\]\(([^)]+)\)/);
                if (linkMatch) {
                    newType = 'Link';
                    const linkContent = linkMatch[1];
                    const linkUrl = linkMatch[2];
                    newContent = linkContent;
                    newUrl = linkUrl;
                }
                
                // Check for images
                const imageMatch = newContent.match(/^!\[([^\]]+)\]\(([^)]+)\)/);
                if (imageMatch) {
                    newType = 'Image';
                    const imageAlt = imageMatch[1];
                    const imageUrl = imageMatch[2];
                    newAlt = imageAlt;
                    newUrl = imageUrl;
                }
                
                // Check for list items
                const listItemMatch = newContent.match(/^([\t ]*)-([^\n]+)(?:\n|$)/);
                if (listItemMatch) {
                    newType = 'ListItem';
                    const indentStr = listItemMatch[1];
                    const tabCount = (indentStr.match(/\t/g) || []).length;
                    const spaceCount = Math.floor((indentStr.match(/ /g) || []).length / 4);
                    newLevel = tabCount + spaceCount;
                    newContent = listItemMatch[2].trim();
                }
                
                // If none of the above patterns match, check if it's a paragraph
                if (!headingMatch && !boldMatch && !italicMatch && !linkMatch && !imageMatch && !listItemMatch) {
                    // Only convert to paragraph if it's not already a paragraph and has content
                    if (newType !== 'Paragraph' && newContent.trim()) {
                        newType = 'Paragraph';
                    }
                }
                
                // Update the node with the new type and content
                currentNode.type = newType;
                currentNode.content = newContent;
                if (newLevel !== undefined) {
                    currentNode.level = newLevel;
                }
                if (newUrl !== undefined) {
                    currentNode.url = newUrl;
                }
                if (newAlt !== undefined) {
                    currentNode.alt = newAlt;
                }
                
                // Create a deep copy of the AST to ensure React detects the change
                const newAst = JSON.parse(JSON.stringify(fullAst));
                
                // Update the AST state to force a re-render
                if (updateAst) {
                    updateAst(newAst);
                }
            }
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
            const currentElement = e.currentTarget as HTMLInputElement;
            const currentContent = currentElement.textContent || '';
            const cursorPosition = currentElement.selectionStart || 0;
            
            // Get the node id from the element's dataset
            const currentNodeId = currentElement.dataset.nodeid;
            
            // --- ENTER KEY ---
            if (e.key === 'Enter') {
                e.preventDefault()
                
                // Get the actual cursor position using selection
                const selection = window.getSelection();
                let cursorPosition = 0;
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const textNode = range.startContainer as Text;
                    
                    // If we're in a text node, use its length as the position when at the end
                    if (textNode.nodeType === Node.TEXT_NODE && range.startOffset === textNode.length) {
                        cursorPosition = currentContent.length;
                    } else {
                        cursorPosition = range.startOffset;
                    }
                }
                
                // Check if we're at the end of the content
                const isAtEnd = cursorPosition >= currentContent.length;
                
                // Check if ast is a Document type with children
                if (fullAst.type === 'Document' && fullAst.children) {
                    // Find current node index in the AST using the node ID
                    const currentNodeIndex = fullAst.children.findIndex(child => child.id === currentNodeId);
                    if (currentNodeIndex === -1) {
                        return; // safeguard
                    }
                    
                    // Get the current node
                    const currentNode = fullAst.children[currentNodeIndex];
                    
                    // Split text if needed and prepare content for new node
                    let rightText = '';
                    if (isAtEnd) {
                        // If at the end, keep the current content and create an empty new node
                        rightText = '';
                    } else {
                        // Otherwise split at cursor position
                        const leftText = currentContent.substring(0, cursorPosition);
                        rightText = currentContent.substring(cursorPosition);
                        fullAst.children[currentNodeIndex].content = leftText;
                    }
                    
                    // Create a new node based on the current node type
                    let newNode: AstNode;
                    
                    switch (currentNode.type) {
                        case 'Heading':
                            // When pressing Enter in a heading, create a new paragraph
                            newNode = {
                                id: `paragraph-${Date.now()}`,
                                type: 'Paragraph',
                                content: rightText,
                                lineNumber: currentLine + 1,
                                editing: true,
                            };
                            break;
                            
                        case 'ListItem':
                            // When pressing Enter in a list item, create a new list item with the same level
                            newNode = {
                                id: `list-item-${Date.now()}`,
                                type: 'ListItem',
                                content: rightText,
                                lineNumber: currentLine + 1,
                                level: currentNode.level || 0,
                                editing: true,
                            };
                            break;
                            
                        case 'Paragraph':
                        default:
                            // Default behavior: create a new paragraph
                            newNode = {
                                id: `paragraph-${Date.now()}`,
                                type: 'Paragraph',
                                content: rightText,
                                lineNumber: currentLine + 1,
                                editing: true,
                            };
                            break;
                    }
                    
                    // Insert the new node immediately after the current node.
                    fullAst.children.splice(currentNodeIndex + 1, 0, newNode);
                    
                    // Update the line numbers for all subsequent nodes.
                    for (let i = currentNodeIndex + 1; i < fullAst.children.length; i++) {
                        fullAst.children[i].lineNumber = i;
                    }
                    
                    // Create a deep copy of the AST to ensure React detects the change
                    const newAst = JSON.parse(JSON.stringify(fullAst));
                    
                    // Update the AST state to force a re-render
                    if (updateAst) {
                        updateAst(newAst);
                        
                        // After the re-render, position the cursor correctly in the new node
                        setTimeout(() => {
                            // Find all editable elements
                            const allEditableElements = Array.from(
                                document.querySelectorAll('[contenteditable="true"]')
                            ) as HTMLElement[];
                            
                            // Find the new element (which contains the right text)
                            const newNodeId = newNode.id;
                            const newElement = allEditableElements.find(
                                el => el.dataset.nodeid === newNodeId
                            );
                            
                            if (newElement) {
                                // Focus the new element
                                newElement.focus();
                                
                                // Position the cursor at the beginning of the new element
                                const range = document.createRange();
                                const sel = window.getSelection();
                                
                                // Find the text node that contains our content
                                const textNodes = Array.from(newElement.childNodes).filter(
                                    node => node.nodeType === Node.TEXT_NODE
                                );
                                
                                if (textNodes.length > 0) {
                                    const textNode = textNodes[0];
                                    // Position cursor at the beginning
                                    range.setStart(textNode, 0);
                                    range.setEnd(textNode, 0);
                                    sel?.removeAllRanges();
                                    sel?.addRange(range);
                                }
                            }
                        }, 0);
                    }
                }
            }
            // --- ARROW UP & ARROW DOWN ---
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                
                // Get all editable elements on screen
                const allEditableElements = Array.from(
                    document.querySelectorAll('[contenteditable="true"]')
                ) as HTMLElement[];
                
                const currentIndex = allEditableElements.indexOf(currentElement);
                let targetIndex: number;
                
                if (e.key === 'ArrowUp') {
                    targetIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
                } else {
                    targetIndex = currentIndex < allEditableElements.length - 1 ? currentIndex + 1 : currentIndex;
                }
                
                if (targetIndex !== currentIndex) {
                    currentElement.blur();
                    const targetElement = allEditableElements[targetIndex];
                    targetElement.focus();
                    // Place the cursor at the end of the content of the target element.
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(targetElement);
                    range.collapse(false);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
            }
            // --- BACKSPACE KEY AT THE BEGINNING ---
            else if (e.key === 'Backspace') {
                // For contenteditable elements, we need to check the selection
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const isAtStart = range.startOffset === 0;
                    
                    if (isAtStart) {
                        // Get the node id from the element's dataset
                        const currentNodeId = currentElement.dataset.nodeid;
                        
                        // Check if fullAst is a Document type with children
                        if (fullAst.type === 'Document' && fullAst.children) {
                            // Find current node index in the AST using the node ID
                            const currentNodeIndex = fullAst.children.findIndex(child => child.id === currentNodeId);
                            
                            // Get the current node
                            const currentNode = fullAst.children[currentNodeIndex];

                            // Handle list item unindentation
                            if (currentNode.type === 'ListItem') {
                                e.preventDefault(); // Prevent default backspace behavior
                                
                                if (currentNode.level && currentNode.level > 0) {
                                    // Unindent by decreasing the level
                                    currentNode.level--;
                                    
                                    // Create a deep copy of the AST to ensure React detects the change
                                    const newAst = JSON.parse(JSON.stringify(fullAst));
                                    
                                    // Update the AST state to force a re-render
                                    if (updateAst) {
                                        updateAst(newAst);
                                    }
                                    return;
                                } else if (currentNode.level === 0) {
                                    // Store the content from the element instead of the node
                                    const content = currentElement.textContent || '';
                                    
                                    // Create a new paragraph node with the same content
                                    const newNode: AstNode = {
                                        id: `paragraph-${Date.now()}`,
                                        type: 'Paragraph',
                                        content: content,
                                        lineNumber: currentNode.lineNumber,
                                        editing: true,
                                    };
                                    
                                    // Replace the list item with a paragraph
                                    fullAst.children[currentNodeIndex] = newNode;
                                    
                                    // Create a deep copy of the AST to ensure React detects the change
                                    const newAst = JSON.parse(JSON.stringify(fullAst));
                                    
                                    // Update the AST state to force a re-render
                                    if (updateAst) {
                                        updateAst(newAst);
                                        
                                        // After the re-render, set focus to the new paragraph
                                        setTimeout(() => {
                                            // Find all editable elements
                                            const allEditableElements = Array.from(
                                                document.querySelectorAll('[contenteditable="true"]')
                                            ) as HTMLElement[];
                                            
                                            // Find the new paragraph element
                                            const newElement = allEditableElements.find(
                                                el => el.dataset.nodeid === newNode.id
                                            );
                                            
                                            if (newElement) {
                                                // Focus the new element
                                                newElement.focus();
                                                
                                                // Position cursor at the beginning
                                                const range = document.createRange();
                                                const sel = window.getSelection();
                                                
                                                // Find the text node that contains our content
                                                const textNodes = Array.from(newElement.childNodes).filter(
                                                    node => node.nodeType === Node.TEXT_NODE
                                                );
                                                
                                                if (textNodes.length > 0) {
                                                    const textNode = textNodes[0];
                                                    // Position cursor at the beginning since we were at the start
                                                    range.setStart(textNode, 0);
                                                    range.setEnd(textNode, 0);
                                                    sel?.removeAllRanges();
                                                    sel?.addRange(range);
                                                } else {
                                                    // If no text nodes, just focus the element
                                                    newElement.focus();
                                                }
                                            }
                                        }, 0);
                                    }
                                    return;
                                }
                            }
                            
                            // If we have a previous node in the AST
                            if (currentNodeIndex > 0) {
                                e.preventDefault(); // Prevent default backspace behavior
                                
                                // Get the current and previous nodes
                                const currentNode = fullAst.children[currentNodeIndex];
                                const previousNode = fullAst.children[currentNodeIndex - 1];
                                
                                // Store the original content lengths before merging
                                const originalPreviousLength = previousNode.content ? previousNode.content.length : 0;
                                
                                // Merge the content of the previous node and the characters after the cursor.
                                const mergedContent = (previousNode.content || '') + currentContent.substring(cursorPosition);
                                
                                // Update the previous node with the merged content
                                previousNode.content = mergedContent;
                                
                                // Remove the current node
                                fullAst.children.splice(currentNodeIndex, 1);
                                
                                // Update the line numbers for all subsequent nodes
                                for (let i = currentNodeIndex; i < fullAst.children.length; i++) {
                                    fullAst.children[i].lineNumber = i;
                                }
                                
                                // Create a deep copy of the AST to ensure React detects the change
                                const newAst = JSON.parse(JSON.stringify(fullAst));
                                
                                // Update the AST state to force a re-render
                                if (updateAst) {
                                    updateAst(newAst);
                                    
                                    // After the re-render, position the cursor correctly
                                    setTimeout(() => {
                                        // Find all editable elements
                                        const allEditableElements = Array.from(
                                            document.querySelectorAll('[contenteditable="true"]')
                                        ) as HTMLElement[];
                                        
                                        // Find the previous element (which now contains the merged content)
                                        const previousNodeId = previousNode.id;
                                        const previousElement = allEditableElements.find(
                                            el => el.dataset.nodeid === previousNodeId
                                        );
                                        
                                        if (previousElement) {
                                            // Focus the previous element
                                            previousElement.focus();
                                            
                                            // Position the cursor at the exact spot where the text was merged
                                            const range = document.createRange();
                                            const sel = window.getSelection();
                                            
                                            // Find the text node that contains our content
                                            const textNodes = Array.from(previousElement.childNodes).filter(
                                                node => node.nodeType === Node.TEXT_NODE
                                            );
                                            
                                            if (textNodes.length > 0) {
                                                const textNode = textNodes[0];
                                                // Position cursor at the merge point (end of previous content)
                                                range.setStart(textNode, originalPreviousLength);
                                                range.setEnd(textNode, originalPreviousLength);
                                                sel?.removeAllRanges();
                                                sel?.addRange(range);
                                            }
                                        }
                                    }, 0);
                                }
                            }
                        }
                    }
                }
            }
        };

        
        const props = {
            style: {
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '3px',
                outline: 'none', // Remove the focus outline
                ...additionalProps.style,
            },
            'data-nodeid': nodeId, // Add the node ID as a data attribute
            onFocus: (e: React.FocusEvent<HTMLElement>) => {
                if (e.currentTarget.getAttribute('contenteditable') === 'true') {
                    // Get the node id from the element's dataset
                    const currentNodeId = e.currentTarget.dataset.nodeid;
                    
                    // Find the current node in the AST
                    if (fullAst.type === 'Document' && fullAst.children) {
                        // Find a node by its ID
                        const findNodeById = (nodes: AstNode[]): AstNode | null => {
                            for (const node of nodes) {
                                if (node.id === currentNodeId) return node;
                                if (node.children) {
                                    const found = findNodeById(node.children);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };
                        
                        const currentNode = findNodeById(fullAst.children);
                        if (currentNode) {
                            // Set editing to true when the user focuses on the node
                            currentNode.editing = true;
                            
                            // Create a deep copy of the AST to ensure React detects the change
                            const newAst = JSON.parse(JSON.stringify(fullAst));
                            
                            // Update the AST state to force a re-render
                            if (updateAst) {
                                updateAst(newAst);
                            }
                        }
                    }
                }
            },
            onBlur: (e: React.FocusEvent<HTMLElement>) => {
                if (e.currentTarget.getAttribute('contenteditable') === 'true') {
                    // Get the node id from the element's dataset
                    const currentNodeId = e.currentTarget.dataset.nodeid;
                    
                    // Find the current node in the AST
                    if (fullAst.type === 'Document' && fullAst.children) {
                        // Find a node by its ID
                        const findNodeById = (nodes: AstNode[]): AstNode | null => {
                            for (const node of nodes) {
                                if (node.id === currentNodeId) return node;
                                if (node.children) {
                                    const found = findNodeById(node.children);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };
                        
                        const currentNode = findNodeById(fullAst.children);
                        if (currentNode) {
                            // Set editing to false when the user moves away from the node
                            currentNode.editing = false;
                            
                            // Get the current content
                            const currentContent = e.currentTarget.textContent || '';
                            
                            // Get the original markdown representation
                            const originalMarkdown = nodeToMarkdown(currentNode);
                            
                            // Only call handleChange if the content has actually changed
                            if (currentContent !== originalMarkdown) {
                                // Update the content
                                handleChange(currentContent);
                            }
                            
                            // Create a deep copy of the AST to ensure React detects the change
                            const newAst = JSON.parse(JSON.stringify(fullAst));
                            
                            // Update the AST state to force a re-render
                            if (updateAst) {
                                updateAst(newAst);
                            }
                        }
                    }
                }
            },
            onKeyDown: handleKeyDown,
            ...additionalProps
        };
        
        // Special case for void elements like img
        if (elementType === 'img') {
            return React.createElement(elementType, props);
        }
        
        if (typeof elementType === 'string') {
            return React.createElement(elementType, props, displayText);
        } else {
            const Element = elementType;
            return <Element {...props}>{displayText}</Element>;
        }
    };
    
    if (ast.type === 'Document') {
        return <div className="markdown-content">{ast.children.map((child, index) => (
            <React.Fragment key={index}>{renderAst(child, child.lineNumber, fullAst, updateAst)}</React.Fragment>
        ))}</div>;
    } else if (ast.type === 'Heading') {
        const HeadingTag = `h${ast.level}` as keyof React.JSX.IntrinsicElements;
        return createEditableElement(HeadingTag, ast.content || '', 'Heading', {
            contentEditable: true,
            suppressContentEditableWarning: true
        }, ast.id);
    } else if (ast.type === 'Paragraph') {
        return createEditableElement('p', ast.content || '', 'Paragraph', {
            contentEditable: true,
            suppressContentEditableWarning: true
        }, ast.id);
    } else if (ast.type === 'Bold') {
        return createEditableElement('strong', ast.content || '', 'Bold', {
            contentEditable: true,
            suppressContentEditableWarning: true
        }, ast.id);
    } else if (ast.type === 'Italic') {
        return createEditableElement('em', ast.content || '', 'Italic', {
            contentEditable: true,
            suppressContentEditableWarning: true
        }, ast.id);
    } else if (ast.type === 'Link') {
        return createEditableElement('a', ast.content || '', 'Link', {
            style: {
                ...clickableStyle,
                textDecoration: 'underline',
                color: 'cyan',
                fontSize: '1.1em'
            },                  
            href: ast.url || '#',
            target: '_blank',
            rel: 'noopener noreferrer',
            contentEditable: true,
            suppressContentEditableWarning: true
        }, ast.id);
    } else if (ast.type === 'Image') {
        return createEditableElement('img', '', 'Image', {
            src: ast.url || '',
            alt: ast.content || '',
            style: {
                ...clickableStyle,
                maxWidth: '100%',
                height: 'auto'
            }
        }, ast.id);
    } else if (ast.type === 'List') {
        return createEditableElement('ul', '', 'List', {
            style: {
                ...clickableStyle,
                listStyleType: 'disc',
                paddingLeft: '1.5em',
                marginLeft: '1em',
                marginTop: '0.5em',
                marginBottom: '0.5em'
            }
        }, ast.id);
    } else if (ast.type === 'ListItem') {
        return createEditableElement('li', ast.content || '', 'ListItem', {
            style: {
                ...clickableStyle,
                display: 'list-item',
                marginBottom: '0.5em',
                marginLeft: `${ast.level * 2}em`
            },
            contentEditable: true,
            suppressContentEditableWarning: true
        }, ast.id);
    }
    
    return null; // Fallback for unknown node types
};

/**
 * Main Markdown renderer component
 * 
 * @param props - The component props containing the text to render
 * @returns A React component rendering the markdown content
 */
const Renderer = ({ text, onChange }: RendererProps) => {
    // Create a state to hold the AST
    const [astState, setAstState] = useState<AstDocument>(() => {
        const tokens = Tokenizer(text);
        return parseTokens(tokens);
    });
    
    // Function to convert AST back to plain text
    const astToPlainText = useCallback((ast: AstDocument): string => {
        let result = '';
        
        for (let i = 0; i < ast.children.length; i++) {
            const node = ast.children[i];
            
            switch (node.type) {
                case 'Heading':
                    result += `${'#'.repeat(node.level || 1)} ${node.content || ''}\n\n`;
                    break;
                    
                case 'Paragraph':
                    result += `${node.content || ''}\n\n`;
                    break;
                    
                case 'Bold':
                    result += `*${node.content || ''}*\n\n`;
                    break;
                    
                case 'Italic':
                    result += `_${node.content || '_'}\n\n`;
                    break;
                    
                case 'Link':
                    result += `[${node.content || ''}](${node.url || ''})\n\n`;
                    break;
                    
                case 'Image':
                    result += `![${node.alt || ''}](${node.url || ''})\n\n`;
                    break;
                    
                case 'ListItem':
                    result += `${'  '.repeat(node.level || 0)}- ${node.content || ''}\n\n`;
                    break;
                    
                default:
                    break;
            }
        }
        
        return result;
    }, []);
    
    // Function to update the AST and force a re-render
    const updateAst = useCallback((newAst: AstDocument) => {
        setAstState(newAst);
        // Convert the updated AST back to plain text and call onChange
        const updatedText = astToPlainText(newAst);
        onChange(updatedText);
    }, [onChange, astToPlainText]);
    
    // Pass the updateAst function to renderAst
    return renderAst(astState, 0, astState, updateAst);
}

export default Renderer;
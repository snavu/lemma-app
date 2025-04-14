/**
 * Markdown Renderer Component
 * 
 * This component parses and renders Markdown text into React components.
 * It follows a three-step process:
 * 1. Tokenize the input text into meaningful blocks
 * 2. Build an Abstract Syntax Tree (AST) from the tokens
 * 3. Render the AST into React components
 */

import React from 'react';

interface RendererProps {
    /** The markdown text to be rendered */
    text: string;
    onChange?: (content: string) => void;
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
    type: 'Heading' | 'Paragraph' | 'Bold' | 'Italic' | 'Link' | 'Image' | 'List' | 'ListItem';
    content?: string;
    level?: number;
    url?: string;
    line: number;
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
 * @param props - The component props containing the text to tokenize
 * @returns An array of tokens representing the markdown structure
 */
const Tokenizer = ({ text }: RendererProps): Token[] => {
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
                type: 'Heading',
                level: token.level,
                content: token.content,
                line: currentLine
            };
            ast.children.push(heading);
            currentLine++;
        } else if (token.type === 'PARAGRAPH') {
            const paragraph: AstNode = {
                type: 'Paragraph',
                content: token.content,
                line: currentLine
            };
            ast.children.push(paragraph);
            currentLine++;
        } else if (token.type === 'BOLD') {
            const bold: AstNode = {
                type: 'Bold',
                content: token.content,
                line: currentLine
            };
            ast.children.push(bold);
            currentLine++;
        } else if (token.type === 'ITALIC') {
            const italic: AstNode = {
                type: 'Italic',
                content: token.content,
                line: currentLine
            };
            ast.children.push(italic);
            currentLine++;
        } else if (token.type === 'LINK') {
            const link: AstNode = {
                type: 'Link',
                content: token.content,
                url: token.url,
                line: currentLine
            };
            ast.children.push(link);
            currentLine++;
        } else if (token.type === 'IMAGE') {
            const image: AstNode = {
                type: 'Image',
                alt: token.alt,
                url: token.url,
                line: currentLine
            };
            ast.children.push(image);
            currentLine++;
        } else if (token.type === 'LIST') {
            const list: AstNode = {
                type: 'List',
                content: token.content,
                line: currentLine
            };
            ast.children.push(list);
            currentLine++;
        } else if (token.type === 'LIST_ITEM') {
            const listItem: AstNode = {
                type: 'ListItem',
                content: token.content,
                line: currentLine,
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
 * @returns A React node representing the rendered content
 */
const renderAst = (ast: AstDocument | AstNode, onChange?: (content: string) => void): React.ReactNode => {
    // Common click handler style
    const clickableStyle: React.CSSProperties = {
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '3px',
    };
    
    // Helper function to create clickable elements
    const createEditableElement = (
        elementType: keyof React.JSX.IntrinsicElements | React.ComponentType<any>,
        content: string,
        elementName: string,
        additionalProps: Record<string, any> = {}
    ): React.ReactNode => {
        const handleClick = () => {
            console.log(`${elementName} clicked:`, content);
            // You can add custom behavior here
            
        };
        
        const props = {
            style: clickableStyle,
            onClick: handleClick,
            ...additionalProps
        };
        
        // Special case for void elements like img
        if (elementType === 'img') {
            return React.createElement(elementType, props);
        }
        
        if (typeof elementType === 'string') {
            return React.createElement(elementType, props, content);
        } else {
            const Element = elementType;
            return <Element {...props}>{content}</Element>;
        }
    };
    
    if (ast.type === 'Document') {
        return <div className="markdown-content">{ast.children.map((child, index) => (
            <React.Fragment key={index}>{renderAst(child)}</React.Fragment>
        ))}</div>;
    } else if (ast.type === 'Heading') {
        const HeadingTag = `h${ast.level}` as keyof React.JSX.IntrinsicElements;
        return createEditableElement(HeadingTag, ast.content || '', 'Heading');
    } else if (ast.type === 'Paragraph') {
        return createEditableElement('p', ast.content || '', 'Paragraph');
    } else if (ast.type === 'Bold') {
        return createEditableElement('strong', ast.content || '', 'Bold');
    } else if (ast.type === 'Italic') {
        return createEditableElement('em', ast.content || '', 'Italic');
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
            rel: 'noopener noreferrer'
        });
    } else if (ast.type === 'Image') {
        return createEditableElement('img', '', 'Image', {
            src: ast.url || '',
            alt: ast.content || '',
            style: {
                ...clickableStyle,
                maxWidth: '100%',
                height: 'auto'
            }
        });
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
        });
    } else if (ast.type === 'ListItem') {
        return createEditableElement('li', ast.content || '', 'ListItem', {
            style: {
                ...clickableStyle,
                display: 'list-item',
                marginBottom: '0.5em',
                marginLeft: `${ast.level * 2}em`
            }
        });
    }
    
    return null; // Fallback for unknown node types
}

/**
 * Main Markdown renderer component
 * 
 * @param props - The component props containing the text to render
 * @returns A React component rendering the markdown content
 */
const Renderer = ({ text, onChange }: RendererProps) => {
    const tokens = Tokenizer({ text });
    //onsole.log("Tokens before parsing:", tokens);
    const ast = parseTokens(tokens);
    console.log("AST after parsing:", ast);
    return renderAst(ast, onChange);
}

export default Renderer;
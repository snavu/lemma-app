// This script generates markdown files based on the graph structure

const fs = require('fs');
const path = require('path');

// Actual graph data with meaningful concepts
const graphData = {
  "nodes": [
    {"id": 1, "name": "Mathematical Logic"},
    {"id": 2, "name": "Propositional Calculus"},
    {"id": 3, "name": "First-Order Logic"},
    {"id": 4, "name": "Type Theory"},
    {"id": 5, "name": "Lambda Calculus"},
    {"id": 6, "name": "Automated Theorem Proving"},
    {"id": 7, "name": "Resolution"},
    {"id": 8, "name": "Unification"},
    {"id": 9, "name": "HOL Theorem Prover"},
    {"id": 10, "name": "Coq Proof Assistant"},
    {"id": 11, "name": "Compiler Design"},
    {"id": 12, "name": "Parsing"},
    {"id": 13, "name": "Type Checking"},
    {"id": 14, "name": "Optimization"},
    {"id": 15, "name": "Quantum Computing"},
    {"id": 16, "name": "Qubits"},
    {"id": 17, "name": "Superposition"},
    {"id": 18, "name": "Entanglement"}
  ],
  "links": [
    // Mathematical Logic connections
    {"source": 1, "target": 2},
    {"source": 1, "target": 3},
    {"source": 1, "target": 4},
    {"source": 1, "target": 6},
    
    // Propositional Calculus connections
    {"source": 2, "target": 7},
    
    // First-Order Logic connections
    {"source": 3, "target": 7},
    {"source": 3, "target": 8},
    
    // Type Theory connections
    {"source": 4, "target": 5},
    {"source": 4, "target": 10},
    {"source": 4, "target": 13},
    
    // Lambda Calculus connections
    {"source": 5, "target": 11},
    
    // Automated Theorem Proving connections
    {"source": 6, "target": 7},
    {"source": 6, "target": 9},
    {"source": 6, "target": 10},
    
    // Resolution connections
    {"source": 7, "target": 8},
    
    // Compiler Design connections
    {"source": 11, "target": 12},
    {"source": 11, "target": 13},
    {"source": 11, "target": 14},
    
    // Quantum Computing connections
    {"source": 15, "target": 16},
    {"source": 15, "target": 17},
    {"source": 15, "target": 18},
    
    // Cross-domain connections
    {"source": 4, "target": 11}, // Type Theory -> Compiler Design
    {"source": 5, "target": 14}, // Lambda Calculus -> Optimization
    {"source": 6, "target": 15}  // Automated Theorem Proving -> Quantum Computing
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


// Detailed encyclopedia-style content for each topic
const topicContents = {
  1: `# Mathematical Logic

## Overview
Mathematical logic is the rigorous study of the nature of mathematical reasoning, proof, and computation. It provides formal frameworks for representing mathematical statements and analyzing their validity. This field emerged in the late 19th and early 20th centuries through the work of Frege, Hilbert, Gödel, and others seeking to establish secure foundations for mathematics.

## Core Subfields

### 1. Proof Theory
- Studies formal proofs as mathematical objects
- Normalization and cut-elimination theorems
- Ordinal analysis of theories
- Important results: Gentzen's consistency proof

### 2. Model Theory
- Examines relationships between formal languages and their interpretations
- Compactness and Löwenheim-Skolem theorems
- Classification theories
- Applications to algebra and geometry

### 3. Recursion Theory
- Formalizes computability and algorithmic processes
- Turing degrees and hierarchy theory
- Relative computability
- Connections to computational complexity

### 4. Set Theory
- Axiomatic foundations for mathematics
- Forcing techniques and independence proofs
- Large cardinal axioms
- Determinacy and descriptive set theory

## Foundational Impact
Mathematical logic has revolutionized our understanding of:
- The limits of formal systems (Gödel's incompleteness theorems)
- Effective computability (Church-Turing thesis)
- Definability and truth (Tarski's hierarchy)

## Applications in Computer Science
- Formal verification of hardware/software
- Database query languages (relational algebra)
- Programming language semantics
- Artificial intelligence knowledge representation

## Current Research Directions
- Reverse mathematics
- Homotopy type theory
- Bounded arithmetic and complexity
- Algorithmic model theory`,

  2: `# Propositional Calculus

## Fundamental Concepts
Propositional calculus (also called sentential logic) is the simplest formal system where:
- Atomic propositions represent basic declarative statements
- Logical connectives combine propositions (¬, ∧, ∨, →, ↔)
- Truth tables define semantic meaning
- Natural deduction provides proof rules

## Syntax and Semantics
The formal language consists of:
1. Propositional variables: p, q, r, ...
2. Logical operators
3. Parentheses for grouping

Valuation functions assign truth values (T/F) to formulas based on:
- The principle of compositionality
- Truth-functional semantics

## Proof Systems

### 1. Axiomatic Systems
- Uses logical axioms and Modus Ponens
- Example: Łukasiewicz's three-axiom system

### 2. Natural Deduction
- Introduction and elimination rules
- Proofs as structured derivations
- Normalization properties

### 3. Sequent Calculus
- Manipulates entire sequents
- Analytic vs. synthetic rules
- Cut elimination theorem

## Computational Aspects
- SAT problem (first NP-complete problem)
- Resolution refutation
- Binary decision diagrams
- Applications in circuit design and verification

## Limitations
Cannot express:
- Quantified statements ("for all x...")
- Internal structure of propositions
- Modal concepts ("possibly", "necessarily")`,

  3: `# First-Order Logic

## Language Extensions
First-order logic (FOL) extends propositional logic with:
1. Variables: x, y, z, ...
2. Quantifiers: ∀ (universal), ∃ (existential)
3. Predicates: P, Q, R, ... (of various arities)
4. Functions: f, g, h, ... (with arities)
5. Equality: =

## Semantics
Interpretations consist of:
- Domain of discourse (non-empty set)
- Interpretation function mapping:
  - Constants to domain elements
  - Predicates to relations
  - Functions to operations

Satisfaction relation ⊨ defines truth in a model

## Metatheoretic Results

### Completeness
Gödel's completeness theorem: The syntactic provability relation ⊢ is complete with respect to semantic entailment ⊨

### Compactness
A theory has a model iff every finite subset does

### Löwenheim-Skolem
If a countable theory has an infinite model, it has models of all infinite cardinalities

## Proof Theory
- Natural deduction systems
- Sequent calculi
- Resolution for FOL
- Tableau methods

## Applications
- Formal specification of systems
- Database query languages
- Mathematical foundations
- Knowledge representation in AI`,

  4: `# Type Theory

## Foundations
Type theory approaches mathematics through:
- Typed lambda calculi
- Constructive foundations
- Propositions-as-types correspondence

## Key Systems

### 1. Simply Typed Lambda Calculus
- Base types and function types
- Church vs. Curry typing
- Strong normalization

### 2. System F (Polymorphic λ-calculus)
- Universal quantification over types
- Parametricity theorems
- Basis for Haskell's type system

### 3. Calculus of Constructions
- Dependent types
- Inductive definitions
- Foundation for Coq proof assistant

## Curry-Howard Correspondence
Relates:
- Types ⇔ Propositions
- Terms ⇔ Proofs
- Evaluation ⇔ Proof normalization

## Practical Applications

### Programming Languages
- Type inference algorithms
- Module systems
- Generic programming

### Theorem Proving
- Interactive proof assistants
- Certified programming
- Mathematical formalization

## Modern Developments
- Homotopy type theory
- Cubical type theory
- Linear type systems
- Effect systems`,

  5: `# Lambda Calculus

## Syntax
The λ-calculus consists of:
1. Variables: x, y, z, ...
2. Abstraction: λx.M (function creation)
3. Application: M N (function application)

## Reduction Rules
1. α-conversion: Renaming bound variables
2. β-reduction: (λx.M)N → M[N/x]
3. η-conversion: λx.Mx → M (if x ∉ FV(M))

## Computational Power
- Turing complete (can express all computable functions)
- Multiple evaluation strategies:
  - Call-by-name
  - Call-by-value
  - Call-by-need (lazy)

## Variants

### Typed λ-calculi
- Simple types
- Polymorphic types
- Dependent types
- Linear types

### Extensions
- Recursion (fixed-point combinators)
- Pattern matching
- Side effects

## Fundamental Results
- Church-Rosser theorem (confluence)
- Normalization properties
- Böhm's theorem (separation)

## Applications
- Functional programming foundations
- Denotational semantics
- Proof theory
- Language implementation techniques`,

  6: `# Automated Theorem Proving

## Approaches

### 1. Resolution-Based
- Unification algorithm
- Paramodulation for equality
- Hyper-resolution
- Set of support strategy

### 2. Tableaux Methods
- Analytic tableaux
- Free-variable tableaux
- Connection tableaux

### 3. Model Elimination
- Chain format
- Ancestor resolution
- Regularity restriction

### 4. Induction
- Recursive function definitions
- Term rewriting systems
- Induction schemata

## Major Systems

### First-Order Provers
- Vampire
- E
- Prover9
- SPASS

### Higher-Order Provers
- LEO
- Satallax
- TPS

### SMT Solvers
- Z3
- CVC4
- Alt-Ergo

## Applications
- Software verification
- Hardware verification
- Mathematics formalization
- Program synthesis`,

  7: `# Resolution

## Logical Basis
Resolution is:
- A complete inference rule for first-order logic
- Works on clauses in conjunctive normal form (CNF)
- Combines with unification for first-order logic

## Algorithm Steps
1. Convert all statements to CNF
2. Negate the conjecture
3. Add to clause set
4. Repeatedly apply resolution
5. Derive empty clause (contradiction)

## Refinements

### 1. Ordering Strategies
- Literal selection
- Clause elimination
- Subsumption

### 2. Specialized Forms
- Unit resolution
- Input resolution
- Linear resolution

### 3. Equality Handling
- Paramodulation
- Demodulation
- Knuth-Bendix completion

## Implementation Techniques
- Indexing (discrimination trees)
- Term sharing
- Clause representation
- Proof recording

## Applications
- Logic programming (Prolog)
- Knowledge representation
- Answer set programming
- Constraint solving`,

  8: `# Unification

## Problem Statement
Given terms t₁ and t₂, find substitution σ such that:
t₁σ ≡ t₂σ

## Algorithm Components

### 1. Term Structure
- Constants
- Variables
- Function applications

### 2. Substitutions
- Mapping from variables to terms
- Composition of substitutions
- Most general unifiers (MGUs)

### 3. Occurs Check
Prevents circular solutions like X = f(X)

## Variants

### 1. First-Order Unification
- Syntactic equality
- Decidable and unitary (unique MGU)

### 2. Higher-Order Unification
- Undecidable in general
- Patterns fragment is decidable

### 3. E-Unification
- Modulo equational theories
- AC unification (associative-commutative)

## Applications
- Type inference
- Logic programming
- Term rewriting
- Program analysis`,

  9: `# HOL Theorem Prover

## System Architecture

### 1. Logical Kernel
- Small trusted code base
- Implements inference rules
- Checks proof objects

### 2. Derived Rules
- Built on top of kernel
- Implement complex reasoning
- Preserve soundness

### 3. Proof Tactics
- Goal-directed proof construction
- Automated reasoning procedures
- Decision procedures

## Implementation Features
- Higher-order logic with polymorphism
- Definitional extension mechanism
- Powerful rewriting engine
- Program extraction

## Applications

### Hardware Verification
- Microprocessor verification
- Protocol verification
- Floating-point correctness

### Mathematics
- Formal proof of Kepler conjecture
- Prime number theorem
- Category theory formalization

## Variants
- HOL4 (Cambridge)
- HOL Light (minimalistic)
- Isabelle/HOL (generic framework)`,

  10: `# Coq Proof Assistant

## Theoretical Basis
Based on the Calculus of Inductive Constructions:
- Dependent type theory
- Impredicative Prop universe
- Inductive definitions
- Computational extraction

## Key Features

### 1. Gallina Language
- Functional programming core
- Dependent pattern matching
- Coinductive types
- Module system

### 2. Proof Engine
- Tactics language (Ltac)
- SSReflect extension
- Mathematical components library
- Automatic provers integration

### 3. Code Extraction
- OCaml extraction
- Haskell extraction
- Scheme extraction

## Major Formalizations
- Four color theorem
- Feit-Thompson odd order theorem
- CompCert certified compiler
- Homotopy type theory

## Industrial Applications
- Cryptographic protocol verification
- Blockchain smart contracts
- Aerospace system verification
- Secure compiler development`,

  11: `# Compiler Design

## Phases of Compilation

### 1. Frontend
- Lexical analysis (scanning)
- Syntax analysis (parsing)
- Semantic analysis
- Intermediate code generation

### 2. Middle End
- Control flow analysis
- Data flow analysis
- Static single assignment form
- Loop optimizations

### 3. Backend
- Instruction selection
- Register allocation
- Instruction scheduling
- Code emission

## Key Technologies

### Intermediate Representations
- Abstract syntax trees
- Three-address code
- Static single assignment (SSA)
- Continuation-passing style

### Optimization Techniques
- Inlining and specialization
- Partial redundancy elimination
- Vectorization
- Polyhedral optimization

## Modern Compiler Architectures
- LLVM compiler infrastructure
- GCC with plugins
- JIT compilation (GraalVM)
- Multi-level intermediate representation`,

  12: `# Parsing

## Grammar Formalisms

### 1. Context-Free Grammars
- Backus-Naur Form (BNF)
- Extended BNF
- Operator precedence grammars

### 2. Lexical Analysis
- Regular expressions
- Finite automata
- Lexer generators (Flex, Lex)

### 3. Syntax Analysis
- Pushdown automata
- LR parsing tables
- Parse tree construction

## Parser Types

### Top-Down
- Recursive descent
- LL(k) parsers
- Packrat parsing

### Bottom-Up
- LR(0), SLR(1), LALR(1), LR(1)
- GLR parsing
- Bison/Yacc implementations

## Advanced Topics
- Error recovery strategies
- Incremental parsing
- Grammar engineering
- Parser combinators`,

  13: `# Type Checking

## Type Systems

### 1. Simple Types
- Monomorphic types
- Let-polymorphism
- Type reconstruction

### 2. Polymorphic Types
- System F
- Rank-n polymorphism
- Impredicative polymorphism

### 3. Dependent Types
- Π-types and Σ-types
- Inductive families
- Proof-carrying code

## Type Inference

### Algorithm W
- Principal types
- Let generalization
- First-class polymorphism

### Constraint-Based
- Type constraints generation
- Unification solving
- Qualified types

## Applications
- Memory safety verification
- API protocol checking
- Resource usage verification
- Information flow control`,

  14: `# Optimization

## Optimization Levels

### 1. Local Optimizations
- Common subexpression elimination
- Constant propagation
- Algebraic simplifications

### 2. Loop Optimizations
- Loop invariant code motion
- Loop unrolling
- Loop fusion/fission

### 3. Global Optimizations
- Interprocedural analysis
- Whole-program optimization
- Link-time optimization

## Advanced Techniques

### 1. Profile-Guided
- Edge profiling
- Value profiling
- Feedback-directed optimization

### 2. Polyhedral Model
- Dependence analysis
- Affine transformations
- Automatic parallelization

### 3. Vectorization
- SIMD instruction generation
- Loop vectorization
- Superword-level parallelism`,

  15: `# Quantum Computing

## Fundamental Principles

### 1. Qubit Physics
- Superconducting circuits
- Trapped ions
- Photonic implementations
- Topological qubits

### 2. Quantum Gates
- Single-qubit rotations
- Controlled operations
- Universal gate sets
- Fault-tolerant constructions

### 3. Quantum Algorithms
- Phase estimation
- Quantum Fourier transform
- Amplitude amplification
- Variational methods

## Error Correction

### 1. Codes
- Surface codes
- Color codes
- LDPC codes

### 2. Threshold Theorem
- Fault-tolerant thresholds
- Concatenated coding
- Magic state distillation

## Applications
- Quantum chemistry simulation
- Optimization problems
- Machine learning acceleration
- Cryptanalysis`,

  16: `# Qubits

## Physical Implementations

### 1. Superconducting
- Transmon qubits
- Flux qubits
- Charge qubits

### 2. Trapped Ions
- Hyperfine states
- Optical qubits
- Phonon-mediated gates

### 3. Photonic
- Dual-rail encoding
- Cluster states
- Boson sampling

## Quantum State Representation

### 1. State Vectors
- Bloch sphere visualization
- Density matrices
- Purity measures

### 2. Entanglement Measures
- Von Neumann entropy
- Concurrence
- Negativity

## Operations
- Single-qubit gates
- Two-qubit entangling gates
- Measurement operations
- Quantum state tomography`,

  17: `# Superposition

## Mathematical Formulation

### 1. State Space
- Hilbert space structure
- Tensor products
- Schmidt decomposition

### 2. Dynamics
- Schrödinger equation
- Unitary evolution
- Quantum channels

## Quantum Effects

### 1. Interference
- Double-slit experiment
- Mach-Zehnder interferometer
- Quantum walks

### 2. Decoherence
- Dephasing
- Amplitude damping
- Lindblad master equation

## Applications
- Quantum parallelism
- Quantum metrology
- Quantum sensing
- Quantum imaging`,

  18: `# Entanglement

## Fundamental Properties

### 1. Nonlocality
- Bell inequality violations
- CHSH inequality
- Loophole-free tests

### 2. Monogamy
- Entanglement sharing limits
- Coherence-distribution tradeoffs

### 3. Measures
- Entanglement entropy
- Concurrence
- Negativity

## Generation Methods

### 1. Gate-Based
- CNOT gates
- CZ gates
- iSWAP gates

### 2. Measurement-Based
- Bell measurements
- Graph states
- Teleportation protocols

## Applications
- Quantum teleportation
- Superdense coding
- Quantum key distribution
- Measurement-based quantum computing`
};


// Generate the content for each file
function generateContent(nodeId) {
  const node = graphData.nodes.find(n => n.id === nodeId);
  if (!node) return "";
  
  let content = topicContents[nodeId] || `# ${node.name}\n\nContent not yet available for this topic.\n\n`;
  
  // Add links section
  if (nodeLinks[nodeId].length > 0) {
    content += `\n## Related Topics\n\n`;
    nodeLinks[nodeId].forEach(linkedId => {
      const linkedNode = graphData.nodes.find(n => n.id === linkedId);
      content += `- [[${linkedNode.name}]]\n`;
    });
  }
  
  return content;
}

// Create files in a directory structure
const baseDir = process.argv.slice(2)[0] ?? 'LEMMA Notes';

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
  
  // Create graph.json files
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
// This script generates markdown files based on the graph structure

const fs = require('fs');
const path = require('path');

// Actual graph data with meaningful concepts
const graphData = {
  "nodes": [
    { "id": 1, "name": "Synchronization", "type": "user" },
    { "id": 2, "name": "Deadlock", "type": "user" },
    { "id": 3, "name": "Mutual Exclusion Algorithms", "type": "user" }
  ],
  "links": [
    { "source": 1, "target": 2, "type": "user" }, // Synchronization -> Deadlock
    { "source": 1, "target": 3, "type": "user" }, // Synchronization -> Mutex Algorithms
    // { "source": 2, "target": 1, "type": "user" }, // Deadlock -> Synchronization
    // { "source": 3, "target": 1, "type": "user" }  // Mutex Algorithms -> Synchronization
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
  1: `# Synchronization

Naively implementing bounded buffers is a challenge because in multi-threading, updates to global variables or reads/writes to buffers will not be atomic.

## Race condition
- Where a system’s behavior depends on the timing or order of uncontrollable events
- Not all race conditions are bugs
- Race condition bugs
  - **Atomicity Violation**: When an operation should be atomic but is not.
    - Ex: Thread is writing to a resource while another thread is reading from the same resource
  - **Data Race**: When two unordered memory operations act on the same variable, one of which is a write.
    - Ex: Two threads updating a variable at the same time
- Preventing data race bugs: Identify critical sections/regions
  - Only one thread at a time can access the critical region
  - **Critical** region must be **atomic**

## Mutual Exclusion
- Four properties:
  - No two threads may be inside the critical region at the same time
  - Can support any number of threads
  - No threads outside of the critical region can block another thread
    - If a thread is blocked when entering the critical region, then there must exist a thread inside the critical region
  - No thread can wait forever to enter the critical region
- Locks and semaphores are synchronization primitives that give mutual exclusion and ensure **atomicity** in multi-threaded programs

## Semaphores
- \`Down()\` or \`sem_wait()\` in C
  - \`while (s <= 0) ; s = s - 1;\`
  - Waits for \`s\` to be nonzero, then decrements
  - Waits to be signaled to wake up
  - Not Busy Waiting, it's sleep waiting (not using CPU)
- \`Up()\` or \`sem_post()\` in C
  - Atomic, \`s = s + 1;\`
  - Signals the threads that are blocked
- Types of Semaphores:
  - Binary Semaphores: {0, 1}
  - Counting Semaphores: values over an unrestricted range

## Locks
- Ensure that only one thread holds each lock at a time
- \`Acquire()\`: Grabs the lock. Waits if another thread already grabs the lock
  - The “waiting” operation
- \`Release()\`: Releases the lock
  - The “signal” operation
- A very natural way to tackle critical sections:
  - Create a lock for each critical section
  - Acquire the lock before the section
  - Release the lock after the section
- Lock contention: When threads often wait on the same lock

## Condition Variables (CVs)
- A primitive to safely allow waiting (does NOT ensure atomicity)
- Each condition variable is associated with exactly one lock
- Provides three functions:
  - \`wait()\`: release lock, wait for a signal/broadcast, reacquire lock (Thread must be holding onto a lock already)
  - \`signal()\`: wake a single thread waiting on the condition variable
  - \`broadcast()\`: wake all of the threads waiting on the condition variable
- With CVs and Locks, you can allow multiple users to acquire the lock and \`wait()\`, release the lock, and wait for a signal, so it doesn’t need to check since it will be signaled when an event occurs (no busy waiting)
- General usage:
  - Variable: **represent state** of interest
  - Lock: protect those variables
  - Create a CV for each event
  - Use \`wait()\` and \`signal()\` when events are triggered
    - Ex: Call \`wait()\` on **respective** CV when trying to push a full bounded buffer or pop an empty bounded buffer
    - Ex: Call \`signal()\` on **respective** CV after pushing/popping a bounded buffer`,

  2: `# Deadlock

## Deadlock
- Two or more threads are waiting for an event that can only be caused by another process in that set
- A condition where a group of threads are blocked, with each thread waiting for another thread to release a resource that it needs
- Preemptable resource: can be taken away from a process without an issue
- Nonpreemptable resource: process will fail if taken away
- Starvation: indefinite blocking of a thread
  - _All deadlocks cause starvation but not all starvation are caused by deadlocks_
- Four conditions of deadlock
  - Mutual exclusion: each resource held by at most one process
  - Hold and wait: processes can hold resources while requesting for more
  - No preemption: resources from a process cannot be taken away
  - Circular wait: circular chain of two or more processes where each is waiting for a resource held by another process in the chain
- Resource Allocation Graphs
  - Resource -> process: process is holding that resource
  - Process -> resource: process is waiting for that resource
  - A cycle in the graph represents a circular wait

## Livelock
- When threads can execute but cannot make progress
  - Two computers are sending messages via ethernet but their messages keep getting corrupted so they have to keep resending
  - Something is corrupted in a linked list and two threads are iterating through the linked list but cannot make observable progress

## Dining Philosophers Problem
- There are n number of forks and n number of philosophers but each philosopher needs 2 forks to eat. They can share forks
- Procedure: If each philosopher picks up left fork first then right, then they will be waiting for their right fork, which causes a deadlock
- The fix is to let every other philosopher alternate which fork they take
  - Odd numbered philosophers grab right then left
  - Even numbered philosophers grab left then right
- Also make only one philosopher behave differently than the others
- **Goal** is to break the cycle
- Alternation of even and odd philosophers is better because only less than half of the philosophers would be waiting (higher throughput)

## Preventing deadlocks
- Prevent **mutual exclusion**: Ensure that resources don’t need to be held to be used.
  - Ex: queue print jobs instead of holding a printer
  - Can’t _really_ change mutual exclusion, since it’s a core component in one thread per CS
- Prevent **hold and wait**: Processes request all resources before doing any work
  - Hold **locks** all at once before proceeding
- Prevent **non-preemption**: Design all resources to be preemptable
  - Databases: all transactions can be aborted
  - System can kill a process/thread
  - However, there is nothing that can prevent deadlocks from happening again
- Prevent **circular wait**: always acquire resources in the same order
  - In a file system, when changing directory to \`../\`, always acquire the parent directory and then the current directory.`,

  3: `# Mutual Exclusion Algorithms

## Four properties of mutual exclusion
- No two threads may be inside the critical region at the same time.
- Can support any number of threads.
- No threads outside of the critical region can block another thread.
  - If a thread is blocked when entering the critical region, then there must exist a thread inside the critical region.
- No thread can wait forever to enter the critical region.

## Strict Alternation Algorithm
- Uses a shared variable \`turn\` to determine who runs next
- Only alternates turn between two threads
- Requires memory to be **coherent** and **atomic**
- Does it satisfy mutual exclusion properties?
  - Multiple threads in critical region? No
  - Extend to n number of threads? Yes
  - Can a thread block from outside the critical region? Yes
    - If \`t1\` gets the lock first while \`t2\` gets the lock, \`t2\` waits until it’s their turn. 
    - After \`t1\` exits the critical region, \`t1\` gives the turn to \`t2\` so \`t2\` can enter the critical region. 
    - \`t1\` then executes a long operation in the noncritical region, and continues to execute even after \`t2\` exits the critical region and gives the turn back to \`t1\`. 
    - Now \`t2\` is blocked because it’s not their turn yet, but \`t1\` is not inside the critical region at the moment.
  - Can a thread wait forever? Yes (if there is a program crash)

## Dekker's Algorithm
\`\`\`
// Thread i: 
while (1) { 
  // Their index: 
  int other = 1 - i; 

  // I wanna enter 
  wants_to_enter[i] = 1;
  // Blocking loop, are you interested
  while (wants_to_enter[other]) {
    if (turn != i) {           // check if my turn
      wants_to_enter[i] = 0;   // Pretend I’m not interested
      while (turn != i) {}     // Wait for my turn
      wants_to_enter[i] = 1;   // I want to enter again
    } 
  } 
  critical_section(); 
  turn = other; 
  wants_to_enter[i] = 0; 
  non_critical_section(); 
}
\`\`\`
- Track whose turn it is and have threads proclaim interest
  - Give mutex to a thread only if the other thread is **not** interested **and** it's the thread’s turn
    - Block if it's their turn AND they’re interested
- Memory updates must be **coherent** and **atomic**
- Does it satisfy mutual exclusion properties?
  - Multiple threads in the same region? No
    - In order to get into critical region only your thread has a \`wants_to_enter\`
  - Extend to n threads? No
  - Can a thread block from outside the critical region? No, only blocked if other thread wants mutex.
    - If thread not in CR, it means it doesn’t want to enter
  - Can a thread wait forever? No
    - (as long as critical region terminates eventually, it will eventually be your turn and the other thread will drop interest)

## Bakery Algorithm
\`\`\`
// Called before critical section, i is the current thread’s id 
void lock(int i) { 
  // Get a number: 
  choosing[i] = 1; // need choosing to make max() atomic
  number[i] = max(number[0], number[1], ..., number[n-1]) + 1;
  choosing[i] = 0; 

  // Wait for our turn to go 						
  for (int j = 0; j < N; ++j) { 
    while (choosing[j]) {} 
    while (number[j] != 0 && (number[j], j) < (number[i], i)) {} 
  } 
} 

void unlock(int i) { 
  number[i] = 0; 
}
\`\`\`
- Procedure
  - Thread enters the bakery and gets next ticket from the ticket counter.
  - Because there is no one yelling the next ticket number, thread must go around and ask other threads for their ticket number to check if they have a smaller number. If a smaller number is present in another thread, block.
  - Once current thread has the smallest number, proceed to critical region. 
  - If two threads have the same ticket number, break ties using thread IDs.
- If a thread is choosing a number, need to wait for them. This would make max() atomic.
- Does it satisfy mutual exclusion properties?
  - Multiple threads in the same region? No
  - N threads? Yes
  - Thread block from outside the critical region? No, you can only block if choosing or a lower number (If not in critical region, choosing and number is 0)
  - Can a thread wait forever? No, eventually the thread will have the smallest number.
    - Gives a tight bound on starvation
- Suppose that there are concurrent read and write operations, the algorithm does not need to depend upon a correct read, the read can return any arbitrary value.
  - Need coherency but not atomicity. Still need atomic access to choosing.`
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
  
  // Create the 'LEMMA_generated' subdirectory
  const generatedDir = path.join(baseDir, 'LEMMA_generated');
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
# Mini Compiler Web Application

A full-stack web application that serves as a mini compiler for JavaScript and C code, built with React.js, Node.js, and Express.js.

## Features

- Code editor with syntax highlighting (Monaco Editor)
- Support for JavaScript and C languages
- Abstract Syntax Tree (AST) visualization
- Symbol table generation and display
- Syntax and semantic error detection and highlighting
- Code execution with output display
- Sandboxed execution environment for security

## Tech Stack

### Frontend
- React.js with TypeScript
- Monaco Editor for code editing
- Tailwind CSS for UI styling
- Axios for API requests

### Backend
- Node.js with Express.js
- TypeScript
- Acorn for JavaScript parsing
- GCC for C compilation (requires installation)
- VM2 for sandboxed JavaScript execution

## Prerequisites

- Node.js (v14+)
- npm or yarn
- GCC compiler (for C code compilation)

## Getting Started

1. Clone this repository
2. Install dependencies
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. Start the development servers
   ```bash
   # Start the backend server
   cd server
   npm run dev
   
   # In another terminal, start the frontend
   cd client
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
mini-compiler/
├── client/               # Frontend React application
│   ├── public/
│   ├── src/              # React source code
│   ├── package.json
│   └── ...
├── server/               # Backend Express application
│   ├── src/              # TypeScript source code
│   │   ├── compilers/    # Compiler implementations
│   │   │   ├── c.ts      # C compiler
│   │   │   └── javascript.ts # JavaScript compiler
│   │   └── index.ts      # Server entry point
│   ├── package.json
│   └── ...
└── README.md
```

## Usage

1. Select the programming language (JavaScript or C)
2. Write or paste your code in the editor
3. Click the "Compile & Run" button
4. View the output, errors, symbol table, and AST in the right panel

## Security Considerations

The application uses VM2 for JavaScript code execution in a sandboxed environment. However, for production use, consider more robust sandboxing solutions as VM2 has known security issues.

For C code execution, the application uses temporary files and compilation. Make sure to properly secure your server and implement additional measures for a production environment.


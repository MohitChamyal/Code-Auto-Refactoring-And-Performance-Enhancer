import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import './App.css';
import ASTVisualizer from './components/ASTVisualizer';
import SymbolTable from './components/SymbolTable';

// API server URL
const API_URL = "http://localhost:5001"; // Changed from 5000 to 5001

// Language options
const LANGUAGES = {
  javascript: 'javascript',
  c: 'c'
};

// Default code examples
const DEFAULT_CODE = {
  [LANGUAGES.javascript]: `// JavaScript Example
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate fibonacci of 10
const result = fibonacci(10);
console.log("Fibonacci of 10 is:", result);

// Create an array of fibonacci numbers
const fibSequence = [];
for (let i = 0; i < 8; i++) {
  fibSequence.push(fibonacci(i));
}
console.log("Fibonacci sequence:", fibSequence);
`,
  [LANGUAGES.c]: `// C Example
#include <stdio.h>

int fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
  printf("Fibonacci of 10 is: %d\\n", fibonacci(10));
  
  // Print fibonacci sequence
  printf("Fibonacci sequence: ");
  for (int i = 0; i < 8; i++) {
    printf("%d ", fibonacci(i));
  }
  printf("\\n");
  
  return 0;
}
`
};

function App() {
  const [language, setLanguage] = useState<string>(LANGUAGES.javascript);
  const [code, setCode] = useState<string>(DEFAULT_CODE[LANGUAGES.javascript]);
  const [output, setOutput] = useState<string>('');
  const [errors, setErrors] = useState<Array<{ line: number; message: string }>>([]);
  const [ast, setAst] = useState<any>(null);
  const [symbolTable, setSymbolTable] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('output');

  // Change default code when language changes
  useEffect(() => {
    setCode(DEFAULT_CODE[language]);
  }, [language]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  const handleCompile = async () => {
    setLoading(true);
    setOutput('');
    setErrors([]);
    setAst(null);
    setSymbolTable({});

    try {
      const response = await axios.post(`${API_URL}/api/compile/${language}`, { code });
      
      setOutput(response.data.output || 'No output');
      setErrors(response.data.errors || []);
      setAst(response.data.ast);
      setSymbolTable(response.data.symbolTable || {});
    } catch (error) {
      console.error('Compilation error:', error);
      setOutput('Error connecting to the server');
    } finally {
      setLoading(false);
    }
  };

  const renderOutput = () => {
    return (
      <div>
        {errors.length > 0 && (
          <div className="errors">
            <h3 className="error-title">Errors:</h3>
            <ul className="error-list">
              {errors.map((error, index) => (
                <li key={index} className="error-item">
                  Line {error.line}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="console-output">
          <pre>{output || 'No output'}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <h1>Mini Compiler</h1>
        </div>
      </header>

      <main className="main-content container">
        <div className="flex-container-vertical">
          {/* Code Editor Card */}
          <div className="editor-card">
            <div className="card">
              <div className="control-bar">
                <select 
                  value={language} 
                  onChange={handleLanguageChange}
                  className="select-input"
                >
                  <option value={LANGUAGES.javascript}>JavaScript</option>
                  <option value={LANGUAGES.c}>C</option>
                </select>
                <button 
                  onClick={handleCompile}
                  disabled={loading}
                  className="button"
                >
                  {loading ? 'Compiling...' : 'Compile & Run'}
                </button>
              </div>
              <div className="editor">
                <Editor
                  height="100%"
                  defaultLanguage={language}
                  language={language}
                  value={code}
                  onChange={handleEditorChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    wordWrap: 'on'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Output/AST/Symbol Table Card */}
          <div className="output-card">
            <div className="card">
              <div className="tab-nav">
                <button
                  onClick={() => setActiveTab('output')}
                  className={`tab-button ${activeTab === 'output' ? 'active' : ''}`}
                >
                  Output
                </button>
                <button
                  onClick={() => setActiveTab('symbolTable')}
                  className={`tab-button ${activeTab === 'symbolTable' ? 'active' : ''}`}
                >
                  Symbol Table
                </button>
                <button
                  onClick={() => setActiveTab('ast')}
                  className={`tab-button ${activeTab === 'ast' ? 'active' : ''}`}
                >
                  Code Structure
                </button>
              </div>

              <div className="output-panel">
                {activeTab === 'output' && renderOutput()}
                {activeTab === 'symbolTable' && <SymbolTable ast={ast} symbolTable={symbolTable} />}
                {activeTab === 'ast' && <ASTVisualizer ast={ast} />}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

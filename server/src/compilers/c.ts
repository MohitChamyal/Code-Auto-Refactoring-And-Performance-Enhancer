import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

interface CompilationResult {
  ast?: any;
  symbolTable?: Record<string, any>;
  errors: Array<{ line: number; message: string }>;
  output?: string;
}

interface ASTNode {
  type: string;
  name?: string;
  value?: string;
  params?: ASTNode[];
  body?: ASTNode[];
  condition?: ASTNode;
  then?: ASTNode;
  else?: ASTNode;
  left?: ASTNode;
  right?: ASTNode;
  operator?: string;
  loc?: { line: number; column: number };
  children?: ASTNode[];
}

// Interface for RegExp match results
interface RegExpMatchResult {
  [index: number]: string;
  index: number;
  input: string;
  groups?: {
    [key: string]: string;
  };
}

/**
 * Builds a structured AST for C code from preprocessed output using patterns and regex
 */
function buildCStructuredAST(code: string): ASTNode {
  // Define line-based regexes to identify major C constructs
  const functionDefRegex = /^([\w\s]+)\s+(\w+)\s*\((.*?)\)\s*\{/gm;
  const variableDeclRegex = /^([\w\s]+)\s+(\w+)\s*(?:=\s*(.*?))?\s*;/gm;
  const ifStatementRegex = /^\s*if\s*\((.*?)\)\s*\{/gm;
  const elseStatementRegex = /^\s*}\s*else\s*\{/gm;
  const forLoopRegex = /^\s*for\s*\((.*?);(.*?);(.*?)\)\s*\{/gm;
  const whileLoopRegex = /^\s*while\s*\((.*?)\)\s*\{/gm;
  const returnStatementRegex = /^\s*return\s+(.*?);/gm;
  const functionCallRegex = /(\w+)\s*\((.*?)\)/g;
  
  const rootNode: ASTNode = {
    type: 'Program',
    body: [],
    children: []
  };

  // Split by lines for tracking
  const lines = code.split('\n');
  
  // Extract functions
  let match: RegExpMatchResult | null;
  while ((match = functionDefRegex.exec(code)) !== null) {
    const [fullMatch, returnType, functionName, params] = match;
    const lineIndex = getLineNumber(code, match.index);
    
    const paramsList = params.split(',').map((param, i) => {
      const paramParts = param.trim().split(/\s+/);
      const paramName = paramParts.pop() || `param${i}`;
      const paramType = paramParts.join(' ');
      
      return {
        type: 'Parameter',
        name: paramName,
        value: paramType,
        loc: { line: lineIndex, column: code.substring(0, match.index).split('\n').pop()?.length || 0 }
      };
    });
    
    // Find function body by matching the opening brace
    const openBracePos = code.indexOf('{', match.index);
    let braceCount = 1;
    let closeBracePos = openBracePos + 1;
    
    while (braceCount > 0 && closeBracePos < code.length) {
      if (code[closeBracePos] === '{') braceCount++;
      else if (code[closeBracePos] === '}') braceCount--;
      closeBracePos++;
    }
    
    // Extract function body
    const functionBody = code.substring(openBracePos + 1, closeBracePos - 1);
    
    // Parse function body to find nested statements
    const bodyStatements = parseStatements(functionBody);
    
    const functionNode: ASTNode = {
      type: 'FunctionDeclaration',
      name: functionName,
      value: returnType,
      params: paramsList,
      body: bodyStatements,
      loc: { line: lineIndex, column: code.substring(0, match.index).split('\n').pop()?.length || 0 },
      children: [...paramsList, { type: 'BlockStatement', body: bodyStatements, children: bodyStatements }]
    };
    
    rootNode.body?.push(functionNode);
    rootNode.children?.push(functionNode);
  }
  
  // Parse top-level variable declarations 
  while ((match = variableDeclRegex.exec(code)) !== null) {
    const [fullMatch, varType, varName, initializer] = match;
    const lineIndex = getLineNumber(code, match.index);
    
    // Skip if this is inside a function
    let insideFunction = false;
    for (const func of (rootNode.children || [])) {
      if (func.type === 'FunctionDeclaration') {
        const funcStart = code.indexOf(func.name || '', 0);
        const funcEnd = code.indexOf(`}`, funcStart);
        if (match.index > funcStart && match.index < funcEnd) {
          insideFunction = true;
          break;
        }
      }
    }
    
    if (!insideFunction) {
      const variableNode: ASTNode = {
        type: 'VariableDeclaration',
        name: varName,
        value: varType,
        loc: { line: lineIndex, column: code.substring(0, match.index).split('\n').pop()?.length || 0 },
        children: []
      };
      
      if (initializer) {
        const initNode: ASTNode = {
          type: 'Initializer',
          value: initializer,
          loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(initializer)).split('\n').pop()?.length || 0 }
        };
        variableNode.children?.push(initNode);
      }
      
      rootNode.body?.push(variableNode);
      rootNode.children?.push(variableNode);
    }
  }
  
  return rootNode;
}

/**
 * Parse statements within a code block
 */
function parseStatements(code: string): ASTNode[] {
  const statements: ASTNode[] = [];
  
  // Variables
  const variableDeclRegex = /^\s*([\w\s]+)\s+(\w+)\s*(?:=\s*(.*?))?\s*;/gm;
  let match: RegExpMatchResult | null;
  
  while ((match = variableDeclRegex.exec(code)) !== null) {
    const [fullMatch, varType, varName, initializer] = match;
    const lineIndex = getLineNumber(code, match.index);
    
    const variableNode: ASTNode = {
      type: 'VariableDeclaration',
      name: varName,
      value: varType,
      loc: { line: lineIndex, column: code.substring(0, match.index).split('\n').pop()?.length || 0 },
      children: []
    };
    
    if (initializer) {
      const initNode: ASTNode = {
        type: 'Initializer',
        value: initializer,
        loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(initializer)).split('\n').pop()?.length || 0 }
      };
      variableNode.children?.push(initNode);
    }
    
    statements.push(variableNode);
  }
  
  // If statements
  const ifStatementRegex = /\s*if\s*\((.*?)\)\s*\{([\s\S]*?)(?:\}\s*(?:else\s*\{([\s\S]*?)\})?)?\}/gm;
  
  while ((match = ifStatementRegex.exec(code)) !== null) {
    const [fullMatch, condition, thenBlock, elseBlock] = match;
    const lineIndex = getLineNumber(code, match.index);
    
    const conditionNode: ASTNode = {
      type: 'BinaryExpression',
      value: condition,
      loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(condition)).split('\n').pop()?.length || 0 }
    };
    
    const thenNode: ASTNode = {
      type: 'BlockStatement',
      body: parseStatements(thenBlock),
      loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(thenBlock)).split('\n').pop()?.length || 0 }
    };
    
    const ifNode: ASTNode = {
      type: 'IfStatement',
      condition: conditionNode,
      then: thenNode,
      loc: { line: lineIndex, column: code.substring(0, match.index).split('\n').pop()?.length || 0 },
      children: [conditionNode, thenNode]
    };
    
    if (elseBlock) {
      const elseNode: ASTNode = {
        type: 'BlockStatement',
        body: parseStatements(elseBlock),
        loc: { line: getLineNumber(code, match.index + fullMatch.indexOf(elseBlock)), column: 0 }
      };
      ifNode.else = elseNode;
      ifNode.children?.push(elseNode);
    }
    
    statements.push(ifNode);
  }
  
  // For loops
  const forLoopRegex = /\s*for\s*\((.*?);(.*?);(.*?)\)\s*\{([\s\S]*?)\}/gm;
  
  while ((match = forLoopRegex.exec(code)) !== null) {
    const [fullMatch, init, test, update, body] = match;
    const lineIndex = getLineNumber(code, match.index);
    
    const forNode: ASTNode = {
      type: 'ForStatement',
      body: parseStatements(body),
      loc: { line: lineIndex, column: code.substring(0, match.index).split('\n').pop()?.length || 0 },
      children: [
        { type: 'Initialization', value: init, loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(init)).split('\n').pop()?.length || 0 } },
        { type: 'Test', value: test, loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(test)).split('\n').pop()?.length || 0 } },
        { type: 'Update', value: update, loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(update)).split('\n').pop()?.length || 0 } }
      ]
    };
    
    statements.push(forNode);
  }
  
  // Return statements
  const returnStatementRegex = /\s*return\s+(.*?);/gm;
  
  while ((match = returnStatementRegex.exec(code)) !== null) {
    const [fullMatch, returnValue] = match;
    const lineIndex = getLineNumber(code, match.index);
    
    const returnNode: ASTNode = {
      type: 'ReturnStatement',
      value: returnValue,
      loc: { line: lineIndex, column: code.substring(0, match.index).split('\n').pop()?.length || 0 },
      children: []
    };
    
    // Check if return value is a function call
    const functionCallMatch = returnValue.match(/([\w\.]+)\((.*?)\)/);
    if (functionCallMatch) {
      const [_, funcName, args] = functionCallMatch;
      const callNode: ASTNode = {
        type: 'CallExpression',
        name: funcName,
        loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(funcName)).split('\n').pop()?.length || 0 },
        children: args.split(',').map((arg, i) => ({
          type: 'Argument',
          value: arg.trim(),
          loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(arg)).split('\n').pop()?.length || 0 }
        }))
      };
      returnNode.children?.push(callNode);
    }
    
    statements.push(returnNode);
  }
  
  // Function calls
  const functionCallRegex = /\s*(\w+)\s*\((.*?)\)\s*;/gm;
  
  while ((match = functionCallRegex.exec(code)) !== null) {
    const [fullMatch, funcName, args] = match;
    const lineIndex = getLineNumber(code, match.index);
    
    // Skip if this was already captured as part of a return statement
    let isInReturn = false;
    for (const stmt of statements) {
      if (stmt.type === 'ReturnStatement' && stmt.value?.includes(funcName)) {
        isInReturn = true;
        break;
      }
    }
    
    if (!isInReturn) {
      const callNode: ASTNode = {
        type: 'CallExpression',
        name: funcName,
        loc: { line: lineIndex, column: code.substring(0, match.index).split('\n').pop()?.length || 0 },
        children: args.split(',').map((arg, i) => ({
          type: 'Argument',
          value: arg.trim(),
          loc: { line: lineIndex, column: code.substring(0, match.index + fullMatch.indexOf(arg)).split('\n').pop()?.length || 0 }
        }))
      };
      statements.push(callNode);
    }
  }
  
  return statements;
}

/**
 * Helper to get line number from a position in the code
 */
function getLineNumber(code: string, position: number): number {
  return code.substring(0, position).split('\n').length;
}

/**
 * Parse the preprocessed C code to extract symbols and their locations
 */
function extractSymbolsFromCode(code: string): Record<string, any> {
  const symbolTable: Record<string, any> = {};
  
  // Match function declarations
  const functionRegex = /^([\w\s]+)\s+(\w+)\s*\((.*?)\)\s*\{/gm;
  let match: RegExpMatchResult | null;
  
  while ((match = functionRegex.exec(code)) !== null) {
    const [_, returnType, functionName, params] = match;
    const lineNumber = code.substring(0, match.index).split('\n').length;
    const columnNumber = match.index - code.lastIndexOf('\n', match.index - 1) - 1;
    
    const paramsList = params.split(',').map(p => p.trim().split(/\s+/).pop()).filter(Boolean);
    
    symbolTable[functionName] = {
      type: 'function',
      dataType: returnType.trim(),
      line: lineNumber,
      column: columnNumber,
      scope: 'global',
      params: paramsList
    };
    
    // Add function parameters to symbol table
    params.split(',').forEach((param, index) => {
      const paramParts = param.trim().split(/\s+/);
      if (paramParts.length > 0) {
        const paramName = paramParts.pop() || `param${index}`;
        const paramType = paramParts.join(' ');
        
        symbolTable[paramName] = {
          type: 'parameter',
          dataType: paramType,
          line: lineNumber,
          column: columnNumber + (match[0].indexOf(paramName) || 0),
          scope: functionName
        };
      }
    });
  }
  
  // Match global variable declarations
  const globalVarRegex = /^([\w\s]+)\s+(\w+)\s*(?:=\s*(.*?))?\s*;/gm;
  
  while ((match = globalVarRegex.exec(code)) !== null) {
    const [_, varType, varName] = match;
    const lineNumber = code.substring(0, match.index).split('\n').length;
    const columnNumber = match.index - code.lastIndexOf('\n', match.index - 1) - 1;
    
    // Check if this is inside a function
    let insideFunction = false;
    Object.entries(symbolTable).forEach(([name, info]) => {
      if (info.type === 'function') {
        const funcStart = code.indexOf(name, 0);
        const funcEnd = code.indexOf(`}`, funcStart);
        if (match.index > funcStart && match.index < funcEnd) {
          insideFunction = true;
        }
      }
    });
    
    if (!insideFunction) {
      symbolTable[varName] = {
        type: 'variable',
        dataType: varType.trim(),
        line: lineNumber,
        column: columnNumber,
        scope: 'global'
      };
    }
  }
  
  // Match local variable declarations
  const localVarRegex = /{\s*([\w\s]+)\s+(\w+)\s*(?:=\s*(.*?))?\s*;/gm;
  
  while ((match = localVarRegex.exec(code)) !== null) {
    const [_, varType, varName] = match;
    const lineNumber = code.substring(0, match.index).split('\n').length;
    const columnNumber = match.index - code.lastIndexOf('\n', match.index - 1) - 1;
    
    // Find which function this is in
    let parentFunction = 'global';
    Object.entries(symbolTable).forEach(([name, info]) => {
      if (info.type === 'function') {
        const funcStart = code.indexOf(name, 0);
        const funcEnd = code.indexOf(`}`, funcStart);
        if (match.index > funcStart && match.index < funcEnd) {
          parentFunction = name;
        }
      }
    });
    
    if (parentFunction !== 'global') {
      symbolTable[varName] = {
        type: 'variable',
        dataType: varType.trim(),
        line: lineNumber,
        column: columnNumber,
        scope: parentFunction
      };
    }
  }
  
  return symbolTable;
}

export async function compileC(code: string): Promise<CompilationResult> {
  const result: CompilationResult = {
    errors: [],
  };

  const tempDir = path.join(__dirname, '../../temp');
  const tempFile = path.join(tempDir, `temp_${Date.now()}.c`);
  const outputFile = path.join(tempDir, `temp_${Date.now()}.exe`);
  
  try {
    // Create temp directory if it doesn't exist
    try {
      await mkdirAsync(tempDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Write code to temp file
    await writeFileAsync(tempFile, code);
    
    // Try to compile the C code and extract errors if any
    try {
      // Generate preprocessed output for AST-like structure
      const { stdout: preprocessed } = await execAsync(`gcc -E ${tempFile}`);
      
      // Now create a structured AST
      const structuredAst = buildCStructuredAST(code);
      result.ast = structuredAst;
      
      // Extract symbols directly from the code
      const symbolTable = extractSymbolsFromCode(code);
      result.symbolTable = symbolTable;
      
      // Compile the code
      await execAsync(`gcc ${tempFile} -o ${outputFile}`);
      
      // Execute the compiled program
      const { stdout, stderr } = await execAsync(outputFile, { timeout: 5000 });
      result.output = stdout;
      
      if (stderr) {
        result.errors.push({
          line: 0,
          message: stderr
        });
      }
      
    } catch (error: any) {
      // Handle compilation errors
      const errorRegex = /([^:]+):(\d+):(\d+):\s+(error|warning):\s+(.+)/g;
      let match: RegExpExecArray | null;
      
      if (error.stderr) {
        while ((match = errorRegex.exec(error.stderr)) !== null) {
          const [_, file, line, column, type, message] = match;
          result.errors.push({
            line: parseInt(line, 10),
            message: `${type}: ${message}`
          });
        }
        
        // If no structured errors were found, add the raw error
        if (result.errors.length === 0) {
          result.errors.push({
            line: 0,
            message: error.stderr
          });
        }
      } else {
        result.errors.push({
          line: 0,
          message: error.message
        });
      }
    }
  } catch (error: any) {
    result.errors.push({
      line: 0,
      message: error.message
    });
  } finally {
    // Cleanup temporary files
    try {
      await unlinkAsync(tempFile);
      if (fs.existsSync(outputFile)) {
        await unlinkAsync(outputFile);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  return result;
} 
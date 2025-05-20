import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { VM } from 'vm2';

interface CompilationResult {
  ast: any;
  symbolTable: Record<string, any>;
  errors: Array<{ line: number; message: string }>;
  output?: string;
}

export async function compileJavaScript(code: string): Promise<CompilationResult> {
  const result: CompilationResult = {
    ast: null,
    symbolTable: {},
    errors: [],
  };

  try {
    // Parse code to AST
    result.ast = acorn.parse(code, {
      ecmaVersion: 2020,
      sourceType: 'script',
      locations: true,
    });

    // Generate symbol table
    const symbolTable: Record<string, any> = {};
    
    // Track variable declarations
    walk.simple(result.ast, {
      VariableDeclarator(node: any) {
        const name = node.id.name;
        symbolTable[name] = {
          type: 'variable',
          line: node.loc.start.line,
          column: node.loc.start.column,
          scope: 'global', // simplified scope handling
        };
      },
      FunctionDeclaration(node: any) {
        const name = node.id.name;
        symbolTable[name] = {
          type: 'function',
          line: node.loc.start.line,
          column: node.loc.start.column,
          params: node.params.map((param: any) => param.name),
        };
      }
    });

    result.symbolTable = symbolTable;

    // Execute the code in a sandbox
    const vm = new VM({
      timeout: 5000, // 5 second timeout
      sandbox: {},
    });

    let output = '';
    
    // Create a custom console object to capture logs
    const customConsole = {
      log: (...args: any[]) => {
        output += args.map(arg => String(arg)).join(' ') + '\n';
      },
      error: (...args: any[]) => {
        output += 'ERROR: ' + args.map(arg => String(arg)).join(' ') + '\n';
      },
      warn: (...args: any[]) => {
        output += 'WARN: ' + args.map(arg => String(arg)).join(' ') + '\n';
      }
    };
    
    // Add the custom console to the sandbox
    vm.sandbox.console = customConsole;

    // Run the code
    vm.run(code);
    result.output = output;

  } catch (error: any) {
    // Handle syntax errors
    if (error.loc) {
      result.errors.push({
        line: error.loc.line,
        message: error.message,
      });
    } else {
      result.errors.push({
        line: 0,
        message: error.message,
      });
    }
  }

  return result;
} 
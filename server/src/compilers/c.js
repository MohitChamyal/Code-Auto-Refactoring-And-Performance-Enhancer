"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileC = compileC;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const writeFileAsync = (0, util_1.promisify)(fs.writeFile);
const unlinkAsync = (0, util_1.promisify)(fs.unlink);
const mkdirAsync = (0, util_1.promisify)(fs.mkdir);
/**
 * Builds a structured AST for C code from preprocessed output using patterns and regex
 */
function buildCStructuredAST(code) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // Define line-based regexes to identify major C constructs
    const functionDefRegex = /^([\w\s]+)\s+(\w+)\s*\((.*?)\)\s*\{/gm;
    const variableDeclRegex = /^([\w\s]+)\s+(\w+)\s*(?:=\s*(.*?))?\s*;/gm;
    const ifStatementRegex = /^\s*if\s*\((.*?)\)\s*\{/gm;
    const elseStatementRegex = /^\s*}\s*else\s*\{/gm;
    const forLoopRegex = /^\s*for\s*\((.*?);(.*?);(.*?)\)\s*\{/gm;
    const whileLoopRegex = /^\s*while\s*\((.*?)\)\s*\{/gm;
    const returnStatementRegex = /^\s*return\s+(.*?);/gm;
    const functionCallRegex = /(\w+)\s*\((.*?)\)/g;
    const rootNode = {
        type: 'Program',
        body: [],
        children: []
    };
    // Split by lines for tracking
    const lines = code.split('\n');
    // Extract functions
    let match;
    while ((match = functionDefRegex.exec(code)) !== null) {
        const [fullMatch, returnType, functionName, params] = match;
        const lineIndex = getLineNumber(code, match.index);
        const paramsList = params.split(',').map((param, i) => {
            var _a;
            const paramParts = param.trim().split(/\s+/);
            const paramName = paramParts.pop() || `param${i}`;
            const paramType = paramParts.join(' ');
            return {
                type: 'Parameter',
                name: paramName,
                value: paramType,
                loc: { line: lineIndex, column: ((_a = code.substring(0, match.index).split('\n').pop()) === null || _a === void 0 ? void 0 : _a.length) || 0 }
            };
        });
        // Find function body by matching the opening brace
        const openBracePos = code.indexOf('{', match.index);
        let braceCount = 1;
        let closeBracePos = openBracePos + 1;
        while (braceCount > 0 && closeBracePos < code.length) {
            if (code[closeBracePos] === '{')
                braceCount++;
            else if (code[closeBracePos] === '}')
                braceCount--;
            closeBracePos++;
        }
        // Extract function body
        const functionBody = code.substring(openBracePos + 1, closeBracePos - 1);
        // Parse function body to find nested statements
        const bodyStatements = parseStatements(functionBody);
        const functionNode = {
            type: 'FunctionDeclaration',
            name: functionName,
            value: returnType,
            params: paramsList,
            body: bodyStatements,
            loc: { line: lineIndex, column: ((_a = code.substring(0, match.index).split('\n').pop()) === null || _a === void 0 ? void 0 : _a.length) || 0 },
            children: [...paramsList, { type: 'BlockStatement', body: bodyStatements, children: bodyStatements }]
        };
        (_b = rootNode.body) === null || _b === void 0 ? void 0 : _b.push(functionNode);
        (_c = rootNode.children) === null || _c === void 0 ? void 0 : _c.push(functionNode);
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
            const variableNode = {
                type: 'VariableDeclaration',
                name: varName,
                value: varType,
                loc: { line: lineIndex, column: ((_d = code.substring(0, match.index).split('\n').pop()) === null || _d === void 0 ? void 0 : _d.length) || 0 },
                children: []
            };
            if (initializer) {
                const initNode = {
                    type: 'Initializer',
                    value: initializer,
                    loc: { line: lineIndex, column: ((_e = code.substring(0, match.index + fullMatch.indexOf(initializer)).split('\n').pop()) === null || _e === void 0 ? void 0 : _e.length) || 0 }
                };
                (_f = variableNode.children) === null || _f === void 0 ? void 0 : _f.push(initNode);
            }
            (_g = rootNode.body) === null || _g === void 0 ? void 0 : _g.push(variableNode);
            (_h = rootNode.children) === null || _h === void 0 ? void 0 : _h.push(variableNode);
        }
    }
    return rootNode;
}
/**
 * Parse statements within a code block
 */
function parseStatements(code) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const statements = [];
    // Variables
    const variableDeclRegex = /^\s*([\w\s]+)\s+(\w+)\s*(?:=\s*(.*?))?\s*;/gm;
    let match;
    while ((match = variableDeclRegex.exec(code)) !== null) {
        const [fullMatch, varType, varName, initializer] = match;
        const lineIndex = getLineNumber(code, match.index);
        const variableNode = {
            type: 'VariableDeclaration',
            name: varName,
            value: varType,
            loc: { line: lineIndex, column: ((_a = code.substring(0, match.index).split('\n').pop()) === null || _a === void 0 ? void 0 : _a.length) || 0 },
            children: []
        };
        if (initializer) {
            const initNode = {
                type: 'Initializer',
                value: initializer,
                loc: { line: lineIndex, column: ((_b = code.substring(0, match.index + fullMatch.indexOf(initializer)).split('\n').pop()) === null || _b === void 0 ? void 0 : _b.length) || 0 }
            };
            (_c = variableNode.children) === null || _c === void 0 ? void 0 : _c.push(initNode);
        }
        statements.push(variableNode);
    }
    // If statements
    const ifStatementRegex = /\s*if\s*\((.*?)\)\s*\{([\s\S]*?)(?:\}\s*(?:else\s*\{([\s\S]*?)\})?)?\}/gm;
    while ((match = ifStatementRegex.exec(code)) !== null) {
        const [fullMatch, condition, thenBlock, elseBlock] = match;
        const lineIndex = getLineNumber(code, match.index);
        const conditionNode = {
            type: 'BinaryExpression',
            value: condition,
            loc: { line: lineIndex, column: ((_d = code.substring(0, match.index + fullMatch.indexOf(condition)).split('\n').pop()) === null || _d === void 0 ? void 0 : _d.length) || 0 }
        };
        const thenNode = {
            type: 'BlockStatement',
            body: parseStatements(thenBlock),
            loc: { line: lineIndex, column: ((_e = code.substring(0, match.index + fullMatch.indexOf(thenBlock)).split('\n').pop()) === null || _e === void 0 ? void 0 : _e.length) || 0 }
        };
        const ifNode = {
            type: 'IfStatement',
            condition: conditionNode,
            then: thenNode,
            loc: { line: lineIndex, column: ((_f = code.substring(0, match.index).split('\n').pop()) === null || _f === void 0 ? void 0 : _f.length) || 0 },
            children: [conditionNode, thenNode]
        };
        if (elseBlock) {
            const elseNode = {
                type: 'BlockStatement',
                body: parseStatements(elseBlock),
                loc: { line: getLineNumber(code, match.index + fullMatch.indexOf(elseBlock)), column: 0 }
            };
            ifNode.else = elseNode;
            (_g = ifNode.children) === null || _g === void 0 ? void 0 : _g.push(elseNode);
        }
        statements.push(ifNode);
    }
    // For loops
    const forLoopRegex = /\s*for\s*\((.*?);(.*?);(.*?)\)\s*\{([\s\S]*?)\}/gm;
    while ((match = forLoopRegex.exec(code)) !== null) {
        const [fullMatch, init, test, update, body] = match;
        const lineIndex = getLineNumber(code, match.index);
        const forNode = {
            type: 'ForStatement',
            body: parseStatements(body),
            loc: { line: lineIndex, column: ((_h = code.substring(0, match.index).split('\n').pop()) === null || _h === void 0 ? void 0 : _h.length) || 0 },
            children: [
                { type: 'Initialization', value: init, loc: { line: lineIndex, column: ((_j = code.substring(0, match.index + fullMatch.indexOf(init)).split('\n').pop()) === null || _j === void 0 ? void 0 : _j.length) || 0 } },
                { type: 'Test', value: test, loc: { line: lineIndex, column: ((_k = code.substring(0, match.index + fullMatch.indexOf(test)).split('\n').pop()) === null || _k === void 0 ? void 0 : _k.length) || 0 } },
                { type: 'Update', value: update, loc: { line: lineIndex, column: ((_l = code.substring(0, match.index + fullMatch.indexOf(update)).split('\n').pop()) === null || _l === void 0 ? void 0 : _l.length) || 0 } }
            ]
        };
        statements.push(forNode);
    }
    // Return statements
    const returnStatementRegex = /\s*return\s+(.*?);/gm;
    while ((match = returnStatementRegex.exec(code)) !== null) {
        const [fullMatch, returnValue] = match;
        const lineIndex = getLineNumber(code, match.index);
        const returnNode = {
            type: 'ReturnStatement',
            value: returnValue,
            loc: { line: lineIndex, column: ((_m = code.substring(0, match.index).split('\n').pop()) === null || _m === void 0 ? void 0 : _m.length) || 0 },
            children: []
        };
        // Check if return value is a function call
        const functionCallMatch = returnValue.match(/([\w\.]+)\((.*?)\)/);
        if (functionCallMatch) {
            const [_, funcName, args] = functionCallMatch;
            const callNode = {
                type: 'CallExpression',
                name: funcName,
                loc: { line: lineIndex, column: ((_o = code.substring(0, match.index + fullMatch.indexOf(funcName)).split('\n').pop()) === null || _o === void 0 ? void 0 : _o.length) || 0 },
                children: args.split(',').map((arg, i) => {
                    var _a;
                    return ({
                        type: 'Argument',
                        value: arg.trim(),
                        loc: { line: lineIndex, column: ((_a = code.substring(0, match.index + fullMatch.indexOf(arg)).split('\n').pop()) === null || _a === void 0 ? void 0 : _a.length) || 0 }
                    });
                })
            };
            (_p = returnNode.children) === null || _p === void 0 ? void 0 : _p.push(callNode);
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
            if (stmt.type === 'ReturnStatement' && ((_q = stmt.value) === null || _q === void 0 ? void 0 : _q.includes(funcName))) {
                isInReturn = true;
                break;
            }
        }
        if (!isInReturn) {
            const callNode = {
                type: 'CallExpression',
                name: funcName,
                loc: { line: lineIndex, column: ((_r = code.substring(0, match.index).split('\n').pop()) === null || _r === void 0 ? void 0 : _r.length) || 0 },
                children: args.split(',').map((arg, i) => {
                    var _a;
                    return ({
                        type: 'Argument',
                        value: arg.trim(),
                        loc: { line: lineIndex, column: ((_a = code.substring(0, match.index + fullMatch.indexOf(arg)).split('\n').pop()) === null || _a === void 0 ? void 0 : _a.length) || 0 }
                    });
                })
            };
            statements.push(callNode);
        }
    }
    return statements;
}
/**
 * Helper to get line number from a position in the code
 */
function getLineNumber(code, position) {
    return code.substring(0, position).split('\n').length;
}
/**
 * Parse the preprocessed C code to extract symbols and their locations
 */
function extractSymbolsFromCode(code) {
    const symbolTable = {};
    // Match function declarations
    const functionRegex = /^([\w\s]+)\s+(\w+)\s*\((.*?)\)\s*\{/gm;
    let match;
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
function compileC(code) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {
            errors: [],
        };
        const tempDir = path.join(__dirname, '../../temp');
        const tempFile = path.join(tempDir, `temp_${Date.now()}.c`);
        const outputFile = path.join(tempDir, `temp_${Date.now()}.exe`);
        try {
            // Create temp directory if it doesn't exist
            try {
                yield mkdirAsync(tempDir, { recursive: true });
            }
            catch (err) {
                // Directory might already exist
            }
            // Write code to temp file
            yield writeFileAsync(tempFile, code);
            // Try to compile the C code and extract errors if any
            try {
                // Generate preprocessed output for AST-like structure
                const { stdout: preprocessed } = yield execAsync(`gcc -E ${tempFile}`);
                // Now create a structured AST
                const structuredAst = buildCStructuredAST(code);
                result.ast = structuredAst;
                // Extract symbols directly from the code
                const symbolTable = extractSymbolsFromCode(code);
                result.symbolTable = symbolTable;
                // Compile the code
                yield execAsync(`gcc ${tempFile} -o ${outputFile}`);
                // Execute the compiled program
                const { stdout, stderr } = yield execAsync(outputFile, { timeout: 5000 });
                result.output = stdout;
                if (stderr) {
                    result.errors.push({
                        line: 0,
                        message: stderr
                    });
                }
            }
            catch (error) {
                // Handle compilation errors
                const errorRegex = /([^:]+):(\d+):(\d+):\s+(error|warning):\s+(.+)/g;
                let match;
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
                }
                else {
                    result.errors.push({
                        line: 0,
                        message: error.message
                    });
                }
            }
        }
        catch (error) {
            result.errors.push({
                line: 0,
                message: error.message
            });
        }
        finally {
            // Cleanup temporary files
            try {
                yield unlinkAsync(tempFile);
                if (fs.existsSync(outputFile)) {
                    yield unlinkAsync(outputFile);
                }
            }
            catch (error) {
                // Ignore cleanup errors
            }
        }
        return result;
    });
}

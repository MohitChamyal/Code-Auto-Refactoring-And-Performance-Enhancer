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
exports.compileJavaScript = compileJavaScript;
const acorn = __importStar(require("acorn"));
const walk = __importStar(require("acorn-walk"));
const vm2_1 = require("vm2");
function compileJavaScript(code) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {
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
            const symbolTable = {};
            // Track variable declarations
            walk.simple(result.ast, {
                VariableDeclarator(node) {
                    const name = node.id.name;
                    symbolTable[name] = {
                        type: 'variable',
                        line: node.loc.start.line,
                        column: node.loc.start.column,
                        scope: 'global', // simplified scope handling
                    };
                },
                FunctionDeclaration(node) {
                    const name = node.id.name;
                    symbolTable[name] = {
                        type: 'function',
                        line: node.loc.start.line,
                        column: node.loc.start.column,
                        params: node.params.map((param) => param.name),
                    };
                }
            });
            result.symbolTable = symbolTable;
            // Execute the code in a sandbox
            const vm = new vm2_1.VM({
                timeout: 5000, // 5 second timeout
                sandbox: {},
            });
            let output = '';
            // Create a custom console object to capture logs
            const customConsole = {
                log: (...args) => {
                    output += args.map(arg => String(arg)).join(' ') + '\n';
                },
                error: (...args) => {
                    output += 'ERROR: ' + args.map(arg => String(arg)).join(' ') + '\n';
                },
                warn: (...args) => {
                    output += 'WARN: ' + args.map(arg => String(arg)).join(' ') + '\n';
                }
            };
            // Add the custom console to the sandbox
            vm.sandbox.console = customConsole;
            // Run the code
            vm.run(code);
            result.output = output;
        }
        catch (error) {
            // Handle syntax errors
            if (error.loc) {
                result.errors.push({
                    line: error.loc.line,
                    message: error.message,
                });
            }
            else {
                result.errors.push({
                    line: 0,
                    message: error.message,
                });
            }
        }
        return result;
    });
}

import React, { useState, useEffect } from 'react';

interface Symbol {
  name: string;
  type: string;
  dataType?: string;
  scope?: string;
  line?: number;
  column?: number;
  params?: string[];
  memoryOffset?: string;
  isInternal?: boolean;
}

interface SymbolTableProps {
  ast: any;
  symbolTable: Record<string, any>;
}

const SymbolTable: React.FC<SymbolTableProps> = ({ ast, symbolTable }) => {
  const [enhancedSymbols, setEnhancedSymbols] = useState<Symbol[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [showInternalSymbols, setShowInternalSymbols] = useState<boolean>(false);

  // Process symbols to enhance them with more information
  useEffect(() => {
    if (!symbolTable || Object.keys(symbolTable).length === 0) {
      setEnhancedSymbols([]);
      return;
    }

    const processedSymbols = Object.entries(symbolTable).map(([name, details]) => {
      const symbol: Symbol = {
        name,
        type: details.type || 'unknown',
        dataType: details.dataType || undefined,
        line: details.line,
        column: details.column,
        scope: details.scope || 'global',
        params: details.params,
        isInternal: isInternalSymbol(name)
      };

      // Infer data type if possible (only for JS, C already provides dataType)
      if (!symbol.dataType && ast && symbol.name) {
        inferDataType(symbol, ast);
      }

      // Simulate memory offset calculation - in a real system this would come from actual memory management
      symbol.memoryOffset = calculateMemoryOffset(symbol);

      return symbol;
    });

    setEnhancedSymbols(processedSymbols);
  }, [symbolTable, ast]);

  // Determine if a symbol is likely an internal/system symbol
  const isInternalSymbol = (name: string): boolean => {
    const internalPrefixes = ['_', '__', '_$', 'window', 'global', 'process'];
    return internalPrefixes.some(prefix => name.startsWith(prefix)) ||
           name.includes('$') || 
           name.includes('mingw') || 
           name.includes('crt_') ||
           name === 'main' || // Exclude main from internal for C programs
           name.startsWith('_Z') || // C++ mangled names
           name.includes('__PRETTY_FUNCTION__') ||
           name.includes('__func__');
  };

  // Very simplified data type inference
  const inferDataType = (symbol: Symbol, ast: any) => {
    // This is a simplified implementation
    // In a real-world scenario, you would do a much more sophisticated traversal
    // of the AST to infer types from assignments, function returns, etc.
    
    if (symbol.type === 'function') {
      symbol.dataType = 'function';
      return;
    }
    
    // Try to find variable declarations and their initializers
    const findVarDeclarations = (node: any) => {
      if (!node || typeof node !== 'object') return;
      
      if (node.type === 'VariableDeclarator' && 
          node.id && node.id.name === symbol.name && 
          node.init) {
        
        // Infer from literal value
        if (node.init.type === 'Literal') {
          if (typeof node.init.value === 'number') symbol.dataType = 'number';
          else if (typeof node.init.value === 'string') symbol.dataType = 'string';
          else if (typeof node.init.value === 'boolean') symbol.dataType = 'boolean';
          else symbol.dataType = typeof node.init.value;
        }
        // Infer from array
        else if (node.init.type === 'ArrayExpression') {
          symbol.dataType = 'array';
        }
        // Infer from object
        else if (node.init.type === 'ObjectExpression') {
          symbol.dataType = 'object';
        }
        // Infer from function expression
        else if (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression') {
          symbol.dataType = 'function';
        }
      }
      
      // For C code, check if there's a direct match with node name and value as type
      if (node.type === 'VariableDeclaration' && 
          node.name === symbol.name && 
          node.value) {
        symbol.dataType = node.value;
      }
      
      // Recursively search all properties
      if (node.type) {
        for (const key in node) {
          if (key !== 'type' && key !== 'loc' && node[key] !== null && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach((item: any) => findVarDeclarations(item));
            } else {
              findVarDeclarations(node[key]);
            }
          }
        }
      }
      
      // Check children array for C AST format
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => findVarDeclarations(child));
      }
    };
    
    if (ast) {
      findVarDeclarations(ast);
    }
    
    // Default if not found
    if (!symbol.dataType) {
      symbol.dataType = 'unknown';
    }
  };

  // Simulate memory offset calculation
  const calculateMemoryOffset = (symbol: Symbol): string => {
    // In a real compiler, this would be calculated from actual stack/heap allocation
    // For demonstration purposes, we'll generate pseudorandom but consistent offsets
    const hash = symbol.name.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    if (symbol.scope === 'global') {
      return `0x${(hash % 0xFFFF + 0x1000).toString(16).toUpperCase()}`;
    } else {
      return `SP+${(hash % 128).toString()}`;
    }
  };

  // Get data type color for visual indication
  const getDataTypeColor = (dataType: string): string => {
    const lowerDataType = dataType.toLowerCase();
    
    // C-specific types
    if (lowerDataType.includes('int') || lowerDataType === 'long' || lowerDataType === 'short') {
      return '#06b6d4'; // cyan - number types
    }
    if (lowerDataType.includes('char') || lowerDataType.includes('string')) {
      return '#10b981'; // emerald - string types
    }
    if (lowerDataType.includes('float') || lowerDataType.includes('double')) {
      return '#3b82f6'; // blue - floating point
    }
    if (lowerDataType.includes('void')) {
      return '#94a3b8'; // gray
    }
    if (lowerDataType.includes('bool')) {
      return '#f59e0b'; // amber
    }
    if (lowerDataType.includes('struct')) {
      return '#8b5cf6'; // violet
    }
    
    // JavaScript types
    switch (lowerDataType) {
      case 'number':
        return '#06b6d4'; // cyan
      case 'string':
        return '#10b981'; // emerald
      case 'boolean':
        return '#f59e0b'; // amber
      case 'object':
        return '#8b5cf6'; // violet
      case 'array':
        return '#ec4899'; // pink
      case 'function':
        return '#4ade80'; // green
      default:
        return '#94a3b8'; // gray
    }
  };

  // Filter symbols by all criteria
  const filteredSymbols = enhancedSymbols
    .filter(symbol => filterType === 'all' || symbol.type === filterType)
    .filter(symbol => showInternalSymbols || !symbol.isInternal)
    .sort((a, b) => {
      // Sort by scope first (global first), then by name
      if (a.scope !== b.scope) {
        return a.scope === 'global' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  if (enhancedSymbols.length === 0) {
    return <div className="no-symbols">No symbols found in the code.</div>;
  }

  // Render function parameters table if needed
  const renderFunctionParameters = () => {
    const functionsWithParams = filteredSymbols.filter(
      (symbol: Symbol) => symbol.type === 'function' && symbol.params && symbol.params.length > 0
    );
    
    if (functionsWithParams.length === 0) return null;
    
    return (
      <div style={{ 
        marginTop: '20px', 
        padding: '16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '4px'
      }}>
        <h4 style={{ marginBottom: '8px' }}>Function Parameters</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Function</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Parameters</th>
            </tr>
          </thead>
          <tbody>
            {functionsWithParams.map((symbol, index) => (
              <tr key={index}>
                <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{symbol.name}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                  {symbol.params?.map((param, idx) => (
                    <span key={idx} style={{ 
                      display: 'inline-block',
                      margin: '2px 4px',
                      padding: '2px 8px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {param}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="symbol-table-container">
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '8px' }}>Symbol Table</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <label htmlFor="symbolTypeFilter" style={{ marginRight: '8px', fontSize: '14px' }}>
              Type:
            </label>
            <select 
              id="symbolTypeFilter" 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="select-input"
              style={{ fontSize: '14px', padding: '4px 8px' }}
            >
              <option value="all">All types</option>
              <option value="function">Functions</option>
              <option value="variable">Variables</option>
              <option value="parameter">Parameters</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={showInternalSymbols}
                onChange={(e) => setShowInternalSymbols(e.target.checked)}
                style={{ marginRight: '6px' }}
              />
              Show internal symbols
            </label>
          </div>
        </div>
      </div>
      
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Symbol Name</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Type</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Data Type</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Scope</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Location</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Memory Offset</th>
            </tr>
          </thead>
          <tbody>
            {filteredSymbols.map((symbol, index) => (
              <tr 
                key={index} 
                style={{ 
                  backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc',
                  opacity: symbol.isInternal ? 0.7 : 1
                }}
              >
                <td style={{ 
                  padding: '10px', 
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: 'bold'
                }}>
                  {symbol.name}
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  {symbol.type}
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ 
                    backgroundColor: getDataTypeColor(symbol.dataType || 'unknown'),
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {symbol.dataType || 'unknown'}
                  </span>
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  {symbol.scope}
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  {symbol.line ? `Line ${symbol.line}${symbol.column !== undefined ? `, Col ${symbol.column}` : ''}` : 'N/A'}
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                  {symbol.memoryOffset}
                </td>
              </tr>
            ))}
            {filteredSymbols.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  No symbols match the current filter settings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {renderFunctionParameters()}
    </div>
  );
};

export default SymbolTable; 
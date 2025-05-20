import React, { useState, useEffect } from 'react';

interface NodeRelationship {
  type: string;
  target: any;
}

interface ASTNodeProps {
  node: any;
  level: number;
  label?: string;
  relationship?: string;
  maxInitialDepth: number;
}

// Helper function to convert technical AST node types to user-friendly terms
const simplifyNodeType = (nodeType: string): string => {
  switch(nodeType) {
    case 'Program': return 'Code';
    case 'FunctionDeclaration': return 'Function';
    case 'VariableDeclaration': return 'Variable';
    case 'VariableDeclarator': return 'Variable';
    case 'Identifier': return 'Name';
    case 'Literal': return 'Value';
    case 'BinaryExpression': return 'Operation';
    case 'CallExpression': return 'Function Call';
    case 'ReturnStatement': return 'Return';
    case 'IfStatement': return 'If Condition';
    case 'ForStatement': return 'For Loop';
    case 'WhileStatement': return 'While Loop';
    case 'ObjectExpression': return 'Object';
    case 'ArrayExpression': return 'Array';
    case 'Parameter': return 'Input';
    case 'Argument': return 'Input Value';
    case 'Initialization': return 'Starting Value';
    case 'Test': return 'Condition';
    case 'Update': return 'Change Value';
    case 'Initializer': return 'Initial Value';
    case 'BlockStatement': return 'Code Block';
    default: return nodeType;
  }
};

// Helper function to simplify relationship labels
const simplifyRelationship = (relationship: string): string => {
  switch(relationship.toLowerCase()) {
    case 'statement': return 'step';
    case 'name': return 'name';
    case 'parameter': return 'input';
    case 'body': return 'contains';
    case 'declaration': return 'defines';
    case 'identifier': return 'name';
    case 'initializer': return 'initial value';
    case 'function': return 'calls';
    case 'argument': return 'with value';
    case 'left operand': return 'left side';
    case 'right operand': return 'right side';
    case 'value': return 'value';
    case 'condition': return 'when';
    case 'then': return 'then do';
    case 'else': return 'otherwise';
    case 'initialization': return 'start with';
    case 'update': return 'then change';
    case 'property': return 'property';
    case 'element': return 'item';
    case 'object': return 'object';
    case 'child': return 'part';
    default: return relationship;
  }
};

// A component to display a single AST node and its children recursively with labeled edges
const ASTNode: React.FC<ASTNodeProps> = ({ node, level, label, relationship, maxInitialDepth }) => {
  const [expanded, setExpanded] = useState(level < maxInitialDepth); // Only expand nodes up to maxInitialDepth
  
  if (!node || typeof node !== 'object') {
    return null;
  }

  // Get the node type (e.g., 'FunctionDeclaration', 'IfStatement')
  const nodeType = node.type || 'Unknown';
  
  // Get meaningful data for this node type, simplified for non-CS students
  const getNodeInfo = () => {
    switch(nodeType) {
      case 'Program':
        return `Code (${node.body?.length || 0} parts)`;
      case 'FunctionDeclaration':
        return `Function: ${node.id?.name || node.name || 'unnamed'}`;
      case 'VariableDeclaration':
        if (node.kind) {
          return `Variable: ${node.declarations?.map((d: any) => d.id?.name).join(', ') || node.name || 'unnamed'}`;
        } else {
          return `Variable: ${node.name || 'unnamed'}`;
        }
      case 'VariableDeclarator':
        return `${node.id?.name || 'unnamed'}`;
      case 'Identifier':
        return `${node.name}`;
      case 'Literal':
        return `Value: ${JSON.stringify(node.value)}`;
      case 'BinaryExpression':
        return `Operation: ${node.operator || ''}`;
      case 'CallExpression':
        return `Call: ${node.callee?.name || node.name || (node.callee?.object?.name ? `${node.callee.object.name}.${node.callee.property?.name}` : 'unnamed')}`;
      case 'ReturnStatement':
        return `Return Result`;
      case 'IfStatement':
        return 'If Condition';
      case 'ForStatement':
        return 'For Loop';
      case 'WhileStatement':
        return 'While Loop';
      case 'ObjectExpression':
        return `Object`;
      case 'ArrayExpression':
        return `Array`;
      // C-specific node types
      case 'Parameter':
        return `Input: ${node.name}`;
      case 'Argument':
        return `Input Value`;
      case 'Initialization':
        return `Starting Value`;
      case 'Test':
        return `Condition`;
      case 'Update':
        return `Change Value`;
      case 'Initializer':
        return `Initial Value`;
      case 'BlockStatement':
        return `Code Block`;
      default:
        return simplifyNodeType(nodeType);
    }
  };

  // Function to count total descendants to help with layout decisions
  const countDescendants = (node: any): number => {
    let count = 0;
    const relationships = getRelationships();
    
    if (relationships.length === 0) return 0;
    
    for (const rel of relationships) {
      count += 1 + countDescendants(rel.node);
    }
    
    return count;
  };

  // Define relationships between parent nodes and child nodes
  const getRelationships = (): Array<{name: string, relationship: string, node: any}> => {
    const relationships: Array<{name: string, relationship: string, node: any}> = [];
    
    // If node has explicit children array (C AST format), use that
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        if (child && typeof child === 'object') {
          relationships.push({
            name: `child_${index}`,
            relationship: simplifyRelationship(child.relationship || child.type?.toLowerCase() || 'child'),
            node: child
          });
        }
      });
      return relationships;
    }
    
    // Otherwise use the JavaScript AST structure
    switch(nodeType) {
      case 'Program':
        if (node.body) {
          node.body.forEach((item: any, index: number) => {
            if (item && typeof item === 'object') {
              relationships.push({
                name: `statement_${index}`,
                relationship: 'step',
                node: item
              });
            }
          });
        }
        break;
      case 'FunctionDeclaration':
        if (node.id) {
          relationships.push({
            name: 'id',
            relationship: 'name',
            node: node.id
          });
        }
        if (node.params) {
          node.params.forEach((param: any, index: number) => {
            if (param && typeof param === 'object') {
              relationships.push({
                name: `param_${index}`,
                relationship: 'input',
                node: param
              });
            }
          });
        }
        if (node.body) {
          relationships.push({
            name: 'body',
            relationship: 'contains',
            node: node.body
          });
        }
        break;
      case 'VariableDeclaration':
        if (node.declarations) {
          node.declarations.forEach((decl: any, index: number) => {
            if (decl && typeof decl === 'object') {
              relationships.push({
                name: `declaration_${index}`,
                relationship: 'defines',
                node: decl
              });
            }
          });
        }
        break;
      case 'VariableDeclarator':
        if (node.id) {
          relationships.push({
            name: 'id',
            relationship: 'name',
            node: node.id
          });
        }
        if (node.init) {
          relationships.push({
            name: 'init',
            relationship: 'initial value',
            node: node.init
          });
        }
        break;
      case 'CallExpression':
        if (node.callee) {
          relationships.push({
            name: 'callee',
            relationship: 'calls',
            node: node.callee
          });
        }
        if (node.arguments) {
          node.arguments.forEach((arg: any, index: number) => {
            if (arg && typeof arg === 'object') {
              relationships.push({
                name: `arg_${index}`,
                relationship: 'with value',
                node: arg
              });
            }
          });
        }
        break;
      case 'BinaryExpression':
        if (node.left) {
          relationships.push({
            name: 'left',
            relationship: 'left side',
            node: node.left
          });
        }
        if (node.right) {
          relationships.push({
            name: 'right',
            relationship: 'right side',
            node: node.right
          });
        }
        break;
      case 'ReturnStatement':
        if (node.argument) {
          relationships.push({
            name: 'argument',
            relationship: 'value',
            node: node.argument
          });
        }
        break;
      case 'IfStatement':
        if (node.test) {
          relationships.push({
            name: 'test',
            relationship: 'when',
            node: node.test
          });
        }
        if (node.consequent) {
          relationships.push({
            name: 'consequent',
            relationship: 'then do',
            node: node.consequent
          });
        }
        if (node.alternate) {
          relationships.push({
            name: 'alternate',
            relationship: 'otherwise',
            node: node.alternate
          });
        }
        break;
      case 'ForStatement':
        if (node.init) {
          relationships.push({
            name: 'init',
            relationship: 'start with',
            node: node.init
          });
        }
        if (node.test) {
          relationships.push({
            name: 'test',
            relationship: 'repeat until',
            node: node.test
          });
        }
        if (node.update) {
          relationships.push({
            name: 'update',
            relationship: 'each time',
            node: node.update
          });
        }
        if (node.body) {
          relationships.push({
            name: 'body',
            relationship: 'do this',
            node: node.body
          });
        }
        break;
      case 'WhileStatement':
        if (node.test) {
          relationships.push({
            name: 'test',
            relationship: 'repeat while',
            node: node.test
          });
        }
        if (node.body) {
          relationships.push({
            name: 'body',
            relationship: 'do this',
            node: node.body
          });
        }
        break;
      case 'BlockStatement':
        if (node.body) {
          node.body.forEach((stmt: any, index: number) => {
            relationships.push({
              name: `stmt_${index}`,
              relationship: 'step',
              node: stmt
            });
          });
        }
        break;
      case 'ObjectExpression':
        if (node.properties) {
          node.properties.forEach((prop: any, index: number) => {
            relationships.push({
              name: `prop_${index}`,
              relationship: 'property',
              node: prop
            });
          });
        }
        break;
      case 'Property':
        if (node.key) {
          relationships.push({
            name: 'key',
            relationship: 'key',
            node: node.key
          });
        }
        if (node.value) {
          relationships.push({
            name: 'value',
            relationship: 'value',
            node: node.value
          });
        }
        break;
      case 'ArrayExpression':
        if (node.elements) {
          node.elements.forEach((elem: any, index: number) => {
            relationships.push({
              name: `elem_${index}`,
              relationship: 'element',
              node: elem
            });
          });
        }
        break;
      case 'MemberExpression':
        if (node.object) {
          relationships.push({
            name: 'object',
            relationship: 'object',
            node: node.object
          });
        }
        if (node.property) {
          relationships.push({
            name: 'property',
            relationship: 'property',
            node: node.property
          });
        }
        break;
      default:
        // For other node types, include all object properties except non-AST ones
        Object.keys(node).forEach(key => {
          if (key !== 'type' && key !== 'loc' && key !== 'range' && key !== 'start' && key !== 'end' && key !== 'children') {
            if (node[key] !== null && typeof node[key] === 'object') {
              if (Array.isArray(node[key])) {
                node[key].forEach((item: any, idx: number) => {
                  if (item && typeof item === 'object') {
                    relationships.push({
                      name: `${key}_${idx}`,
                      relationship: key,
                      node: item
                    });
                  }
                });
              } else {
                relationships.push({
                  name: key,
                  relationship: key,
                  node: node[key]
                });
              }
            }
          }
        });
    }
    
    return relationships;
  };

  // Get node color based on type with more vibrant colors
  const getNodeColor = () => {
    switch(nodeType) {
      case 'Program':
        return '#6366f1'; // indigo-500
      case 'FunctionDeclaration':
        return '#10b981'; // emerald-500
      case 'Parameter':
        return '#06b6d4'; // cyan-500 
      case 'VariableDeclaration':
        return '#f59e0b'; // amber-500
      case 'Initializer':
        return '#fb7185'; // rose-400
      case 'CallExpression':
        return '#3b82f6'; // blue-500
      case 'Argument':
        return '#7dd3fc'; // sky-300
      case 'Literal':
        return '#c084fc'; // purple-400
      case 'IfStatement':
        return '#f97316'; // orange-500
      case 'ForStatement':
        return '#ef4444'; // red-500
      case 'WhileStatement':
        return '#f43f5e'; // rose-500
      case 'Test':
        return '#fb923c'; // orange-400
      case 'ReturnStatement':
        return '#ec4899'; // pink-500
      case 'Identifier':
        return '#0ea5e9'; // sky-500
      case 'BinaryExpression':
        return '#a855f7'; // purple-500
      case 'UnaryExpression':
        return '#d946ef'; // fuchsia-500
      case 'Initialization':
        return '#f472b6'; // pink-400
      case 'Update':
        return '#e879f9'; // fuchsia-400
      case 'BlockStatement':
        return '#475569'; // slate-600
      default:
        return '#8b5cf6'; // violet-500
    }
  };

  // Get border color for node (slightly darker than the node color)
  const getBorderColor = () => {
    switch(nodeType) {
      case 'Program':
        return '#4f46e5'; // indigo-600
      case 'FunctionDeclaration':
        return '#059669'; // emerald-600
      case 'Parameter':
        return '#0891b2'; // cyan-600
      case 'VariableDeclaration':
        return '#d97706'; // amber-600
      case 'Initializer': 
        return '#e11d48'; // rose-600
      case 'CallExpression':
        return '#2563eb'; // blue-600
      case 'Argument':
        return '#0284c7'; // sky-600
      case 'Literal':
        return '#9333ea'; // purple-600
      case 'IfStatement':
        return '#ea580c'; // orange-600
      case 'ForStatement':
        return '#dc2626'; // red-600
      case 'WhileStatement':
        return '#e11d48'; // rose-600 
      case 'Test':
        return '#ea580c'; // orange-600
      case 'ReturnStatement':
        return '#db2777'; // pink-600
      case 'Identifier':
        return '#0284c7'; // sky-600
      case 'BinaryExpression':
        return '#9333ea'; // purple-600
      case 'UnaryExpression':
        return '#c026d3'; // fuchsia-600
      case 'Initialization':
        return '#db2777'; // pink-600
      case 'Update':
        return '#c026d3'; // fuchsia-600
      case 'BlockStatement':
        return '#334155'; // slate-700
      default:
        return '#7c3aed'; // violet-600 
    }
  };

  const relationships = getRelationships();
  const hasChildren = relationships.length > 0;
  
  // Simplify the displayed text for cleaner view
  const getSimplifiedInfo = () => {
    let info = getNodeInfo();
    // Truncate long info for cleaner display
    if (info.length > 30) {
      info = info.substring(0, 27) + '...';
    }
    return info;
  };

  // Calculate node size based on hierarchical importance
  const nodeSize = level === 0 ? 180 : 
                  level === 1 ? 160 : 
                  level === 2 ? 140 : 120;

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      marginBottom: '30px',
      marginTop: level === 0 ? '20px' : '0',
    }}>
      {/* Node box with simplified content */}
      <div style={{ 
        cursor: hasChildren ? 'pointer' : 'default',
        padding: '10px',
        borderRadius: '6px',
        backgroundColor: getNodeColor(),
        color: 'white',
        fontWeight: 500,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: `2px solid ${getBorderColor()}`,
        position: 'relative',
        zIndex: 2,
        width: `${nodeSize}px`,
        minHeight: '40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onClick={() => hasChildren ? setExpanded(!expanded) : null}
      >
        {hasChildren && (
          <span style={{ 
            position: 'absolute',
            top: '3px',
            right: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            {expanded ? '▼' : '►'}
          </span>
        )}
        
        {/* Relationship label as top badge - only for important relationships */}
        {relationship && level <= 3 && (
          <div style={{ 
            position: 'absolute',
            top: '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            padding: '1px 6px',
            borderRadius: '8px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            zIndex: 3,
            border: '1px solid #cbd5e1'
          }}>
            {relationship}
          </div>
        )}
        
        <div style={{ fontSize: level === 0 ? '14px' : '12px', fontWeight: 600 }}>{getSimplifiedInfo()}</div>
        
        {/* Only show line info on higher level nodes */}
        {node.loc && level <= 2 && (
          <div style={{ 
            fontSize: '10px', 
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: '3px'
          }}>
            Line {node.loc.start?.line || node.loc.line}
          </div>
        )}
        
        {/* Indicate child count if collapsed and there are many children */}
        {!expanded && hasChildren && relationships.length > 3 && (
          <div style={{
            position: 'absolute',
            bottom: '-14px',
            right: '-6px',
            backgroundColor: '#475569',
            color: 'white',
            borderRadius: '9px',
            padding: '1px 5px',
            fontSize: '9px',
            fontWeight: 'bold',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            border: '1px solid #334155',
            zIndex: 3
          }}>
            +{relationships.length}
          </div>
        )}
      </div>

      {/* Child nodes with improved flow */}
      {expanded && hasChildren && (
        <>
          {/* Vertical connector line from parent to children */}
          <div style={{
            width: '2px',
            height: '20px',
            backgroundColor: getBorderColor(),
            marginTop: '0px'
          }}></div>
          
          {/* Children container with dynamic connecting lines */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}>
            {/* Only show horizontal connector if there are multiple children */}
            {relationships.length > 1 && (
              <div style={{
                position: 'relative',
                height: '2px',
                width: '100%',
              }}>
                {/* Dynamic connector that adapts to the container */}
                <div style={{
                  position: 'absolute',
                  height: '2px',
                  backgroundColor: getBorderColor(),
                  left: '10%',
                  right: '10%'
                }}></div>
              </div>
            )}
            
            {/* Children nodes with flow-based layout */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '40px',
              padding: '10px',
            }}>
              {relationships.map((rel, index) => (
                <div 
                  key={`${rel.name}-${index}`} 
                  style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    marginTop: relationships.length > 1 ? '20px' : '0'
                  }}
                >
                  {/* Vertical connector line to each child when there are multiple children */}
                  {relationships.length > 1 && (
                    <div style={{
                      width: '2px',
                      height: '20px',
                      backgroundColor: getBorderColor(),
                      position: 'absolute',
                      top: '-20px'
                    }}></div>
                  )}
                  <ASTNode 
                    node={rel.node} 
                    level={level + 1} 
                    relationship={rel.relationship}
                    maxInitialDepth={maxInitialDepth}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface FullScreenASTViewProps {
  ast: any;
  onClose: () => void;
}

const FullScreenASTView: React.FC<FullScreenASTViewProps> = ({ ast, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(90); // Start with slightly zoomed out view
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [maxInitialDepth, setMaxInitialDepth] = useState(2); // Initially show only 2 levels
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-fit the visualization when first loaded
    handleZoomReset();
  }, [ast]);

  if (!ast) {
    return (
      <div className="fullscreen-ast-container">
        <div className="fullscreen-header">
          <h2>Abstract Syntax Tree (Full Screen)</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="ast-not-available">
          <p>AST data not available</p>
        </div>
      </div>
    );
  }
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };
  
  const handleZoomReset = () => {
    setZoomLevel(90);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleExpandAll = () => {
    setMaxInitialDepth(20);
  };

  const handleCollapseToOverview = () => {
    setMaxInitialDepth(2);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPanPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="fullscreen-ast-container" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#f8fafc',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div className="fullscreen-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        backgroundColor: '#1f2937',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Abstract Syntax Tree Overview</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Depth controls */}
          <div style={{ display: 'flex', gap: '6px', marginRight: '16px' }}>
            <button 
              onClick={handleCollapseToOverview}
              style={{
                padding: '6px 10px',
                backgroundColor: maxInitialDepth <= 2 ? '#2563eb' : '#4b5563',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Overview
            </button>
            <button 
              onClick={handleExpandAll}
              style={{
                padding: '6px 10px',
                backgroundColor: maxInitialDepth > 2 ? '#2563eb' : '#4b5563',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Detail
            </button>
          </div>
          
          {/* Zoom controls */}
          <div className="zoom-controls" style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
            <button 
              onClick={handleZoomOut}
              style={{
                padding: '2px 6px',
                backgroundColor: '#374151',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >-</button>
            <span style={{ margin: '0 8px', fontSize: '13px' }}>{zoomLevel}%</span>
            <button 
              onClick={handleZoomIn}
              style={{
                padding: '2px 6px',
                backgroundColor: '#374151',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >+</button>
            <button 
              onClick={handleZoomReset}
              style={{
                padding: '2px 6px',
                backgroundColor: '#4b5563',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                marginLeft: '8px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >Reset</button>
          </div>
          
          {/* Close button */}
          <button 
            onClick={onClose}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer'
            }}
          >Close</button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="ast-visualization-container" 
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          backgroundColor: '#f1f5f9'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{
          transform: `scale(${zoomLevel / 100}) translate(${panPosition.x}px, ${panPosition.y}px)`,
          transformOrigin: 'top center',
          transition: isDragging ? 'none' : 'transform 0.1s ease',
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: '50px',
        }}>
          <ASTNode 
            node={ast} 
            level={0} 
            maxInitialDepth={maxInitialDepth}
          />
        </div>
      </div>
      
      <div className="ast-legend" style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '10px 20px',
        padding: '8px 20px',
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ color: '#10b981', fontSize: '14px', marginRight: '4px' }}>■</span> 
          <span>Functions</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ color: '#f59e0b', fontSize: '14px', marginRight: '4px' }}>■</span> 
          <span>Variables</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ color: '#3b82f6', fontSize: '14px', marginRight: '4px' }}>■</span> 
          <span>Function Calls</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ color: '#f97316', fontSize: '14px', marginRight: '4px' }}>■</span> 
          <span>Conditions & Loops</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ color: '#c084fc', fontSize: '14px', marginRight: '4px' }}>■</span> 
          <span>Values</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ color: '#06b6d4', fontSize: '14px', marginRight: '4px' }}>■</span> 
          <span>Inputs</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ color: '#a855f7', fontSize: '14px', marginRight: '4px' }}>■</span> 
          <span>Operations</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ color: '#475569', fontSize: '14px', marginRight: '4px' }}>■</span> 
          <span>Code Blocks</span>
        </div>
      </div>
    </div>
  );
};

export default FullScreenASTView; 
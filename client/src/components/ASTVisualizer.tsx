import React, { useState } from 'react';
import FullScreenASTView from './FullScreenASTView';

interface NodeRelationship {
  type: string;
  target: any;
}

interface ASTNodeProps {
  node: any;
  level: number;
  label?: string;
  relationship?: string;
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
const ASTNode: React.FC<ASTNodeProps> = ({ node, level, label, relationship }) => {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first two levels
  
  if (!node || typeof node !== 'object') {
    return null;
  }

  // Get the node type (e.g., 'FunctionDeclaration', 'IfStatement')
  const nodeType = node.type || 'Unknown';
  
  // Get meaningful data for this node type
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

  // Define relationships between parent nodes and child nodes
  const getRelationships = (): Array<{name: string, relationship: string, node: any}> => {
    const relationships: Array<{name: string, relationship: string, node: any}> = [];
    
    // If node has explicit children array (C AST format), use that
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        relationships.push({
          name: `child_${index}`,
          relationship: simplifyRelationship(child.relationship || child.type?.toLowerCase() || 'child'),
          node: child
        });
      });
      return relationships;
    }
    
    // Otherwise use the JavaScript AST structure
    switch(nodeType) {
      case 'Program':
        if (node.body) {
          node.body.forEach((item: any, index: number) => {
            relationships.push({
              name: `statement_${index}`,
              relationship: 'step',
              node: item
            });
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
            relationships.push({
              name: `param_${index}`,
              relationship: 'input',
              node: param
            });
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
            relationships.push({
              name: `declaration_${index}`,
              relationship: 'defines',
              node: decl
            });
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
            relationships.push({
              name: `arg_${index}`,
              relationship: 'with value',
              node: arg
            });
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

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      marginBottom: level === 0 ? '30px' : '0px'
    }}>
      {/* Node box */}
      <div style={{ 
        cursor: hasChildren ? 'pointer' : 'default',
        padding: '8px 12px',
        borderRadius: '4px',
        backgroundColor: getNodeColor(),
        color: 'white',
        fontWeight: 500,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        border: `2px solid ${getBorderColor()}`,
        position: 'relative',
        zIndex: 2,
        minWidth: '120px',
        minHeight: '45px',
        textAlign: 'center',
        maxWidth: '250px'
      }}
      onClick={() => hasChildren ? setExpanded(!expanded) : null}
      >
        {hasChildren && (
          <span style={{ 
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px'
          }}>
            {expanded ? '▼' : '►'}
          </span>
        )}
        
        {/* Relationship label as top badge */}
        {relationship && (
          <div style={{ 
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            zIndex: 3
          }}>
            {relationship}
          </div>
        )}
        
        <div>{getNodeInfo()}</div>
        
        {/* Location info */}
        {node.loc && (
          <div style={{ 
            fontSize: '10px', 
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: '4px'
          }}>
            Line {node.loc.start?.line || node.loc.line}
          </div>
        )}
      </div>

      {/* Child nodes - vertical tree with connector */}
      {expanded && hasChildren && (
        <>
          {/* Vertical connector line from parent to children */}
          <div style={{
            width: '2px',
            height: '20px',
            backgroundColor: getBorderColor(),
            marginTop: '0px'
          }}></div>
          
          {/* Horizontal connector line across children */}
          {relationships.length > 1 && (
            <div style={{
              position: 'relative',
              height: '2px',
              backgroundColor: getBorderColor(),
              width: `${Math.min(relationships.length * 120, 600)}px`,
              maxWidth: '80vw'
            }}></div>
          )}
          
          {/* Children container */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '40px 80px',
            maxWidth: '1000px',
            marginTop: relationships.length > 1 ? '0px' : '0px',
            padding: '10px'
          }}>
            {relationships.map((rel, index) => (
              <div key={`${rel.name}-${index}`} style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative'
              }}>
                {/* Vertical connector line to each child when there are multiple children */}
                {relationships.length > 1 && (
                  <div style={{
                    width: '2px',
                    height: '15px',
                    backgroundColor: getBorderColor(),
                    position: 'absolute',
                    top: '-15px'
                  }}></div>
                )}
                <ASTNode 
                  node={rel.node} 
                  level={level + 1} 
                  relationship={rel.relationship}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface ASTVisualizerProps {
  ast: any;
}

const ASTVisualizer: React.FC<ASTVisualizerProps> = ({ ast }) => {
  const [showFullScreen, setShowFullScreen] = useState(false);

  if (!ast) {
    return <div className="ast-not-available">AST not available</div>;
  }
  
  // Convert string AST (from C preprocessor) to structured AST if needed
  if (typeof ast === 'string') {
    return (
      <div className="ast-visualizer">
        <div className="ast-info">
          <h3>Abstract Syntax Tree</h3>
          <p>AST visualization is not fully supported for this code format.</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {showFullScreen && (
        <FullScreenASTView ast={ast} onClose={() => setShowFullScreen(false)} />
      )}
      <div className="ast-visualizer" style={{ 
        padding: '20px', 
        backgroundColor: '#f8fafc', 
        borderRadius: '8px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* AST Viewer Header with Full Screen Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b' }}>Code Structure Tree</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#64748b' }}>
              This diagram shows how your code is organized. Each box represents a different part of your code.
            </p>
          </div>
          <button 
            onClick={() => setShowFullScreen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '8px 12px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            <span style={{ fontSize: '16px' }}>⛶</span>
            <span>View Full Screen</span>
          </button>
        </div>

        {/* Preview Tree */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          height: '300px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ 
            height: '100%', 
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '10px'
          }}>
            <ASTNode node={ast} level={0} />
          </div>
          
          {/* Gradient overlay with message to encourage full-screen view */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100px',
            background: 'linear-gradient(transparent, rgba(255, 255, 255, 0.9) 70%, white)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            padding: '10px',
            zIndex: 5
          }}>
            <p style={{ 
              textAlign: 'center', 
              color: '#1f2937', 
              fontSize: '14px',
              fontWeight: 500
            }}>
              Open in full screen for a better view of your code structure
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ASTVisualizer; 
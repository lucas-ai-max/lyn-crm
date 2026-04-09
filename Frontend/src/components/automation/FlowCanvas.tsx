import { useCallback, useRef, DragEvent, useEffect } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Edge,
    BackgroundVariant,
    ReactFlowProvider,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes';
import { cn } from '@/lib/utils';

interface FlowCanvasProps {
    initialNodes?: Node[];
    initialEdges?: Edge[];
    onNodesChange?: (nodes: Node[]) => void;
    onEdgesChange?: (edges: Edge[]) => void;
    onNodeSelect?: (node: Node | null) => void;
    className?: string;
}

// Default node data for each type
const getDefaultNodeData = (type: string): Record<string, any> => {
    switch (type) {
        case 'trigger':
            return { triggerType: 'keyword_exact', keywords: ['oi', 'olá'] };
        case 'message':
            return { content: 'Olá! Como posso ajudar?', delay: 0 };
        case 'waitResponse':
            return { variableName: 'resposta', timeoutMinutes: 60 };
        case 'condition':
            return { variable: 'resposta', conditions: [] };
        case 'action':
            return { actionType: 'add_tag', tagName: '' };
        case 'webhook':
            return { method: 'POST', url: '', body: '{}' };
        case 'delay':
            return { delayMinutes: 0, delaySeconds: 5 };
        case 'randomPath':
            return { paths: [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }] };
        case 'end':
            return { finishStatus: 'completed' };
        default:
            return {};
    }
};

let nodeId = 0;
const getId = () => `node_${crypto.randomUUID().slice(0, 8)}`;

function FlowCanvasInner({
    initialNodes = [],
    initialEdges = [],
    onNodesChange: onNodesChangeCallback,
    onEdgesChange: onEdgesChangeCallback,
    onNodeSelect,
    className,
}: FlowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Track previous props to prevent unnecessary updates
    const prevNodesRef = useRef<string>('');
    const prevEdgesRef = useRef<string>('');

    // Sync internal state when parent props change (e.g., when node is deleted from PropertiesPanel)
    useEffect(() => {
        const nodesJson = JSON.stringify(initialNodes.map(n => ({ id: n.id, type: n.type })));
        if (nodesJson !== prevNodesRef.current) {
            prevNodesRef.current = nodesJson;
            setNodes(initialNodes);
        }
    }, [initialNodes, setNodes]);

    useEffect(() => {
        const edgesJson = JSON.stringify(initialEdges.map(e => ({ id: e.id, source: e.source, target: e.target })));
        if (edgesJson !== prevEdgesRef.current) {
            prevEdgesRef.current = edgesJson;
            setEdges(initialEdges);
        }
    }, [initialEdges, setEdges]);

    // Sync with parent
    const handleNodesChange = useCallback((changes: any) => {
        onNodesChange(changes);
        // Delay to get updated nodes
        setTimeout(() => {
            setNodes((nds) => {
                onNodesChangeCallback?.(nds);
                return nds;
            });
        }, 0);
    }, [onNodesChange, onNodesChangeCallback, setNodes]);

    const handleEdgesChange = useCallback((changes: any) => {
        onEdgesChange(changes);
        setTimeout(() => {
            setEdges((eds) => {
                onEdgesChangeCallback?.(eds);
                return eds;
            });
        }, 0);
    }, [onEdgesChange, onEdgesChangeCallback, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => {
                const newEdges = addEdge(
                    { ...params, animated: true, style: { strokeWidth: 2 } },
                    eds
                );
                onEdgesChangeCallback?.(newEdges);
                return newEdges;
            });
        },
        [setEdges, onEdgesChangeCallback]
    );

    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: getId(),
                type,
                position,
                data: getDefaultNodeData(type),
            };

            setNodes((nds) => {
                const updatedNodes = [...nds, newNode];
                onNodesChangeCallback?.(updatedNodes);
                return updatedNodes;
            });
        },
        [screenToFlowPosition, setNodes, onNodesChangeCallback]
    );

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            onNodeSelect?.(node);
        },
        [onNodeSelect]
    );

    const onPaneClick = useCallback(() => {
        onNodeSelect?.(null);
    }, [onNodeSelect]);

    // Update node data from properties panel
    const updateNodeData = useCallback(
        (nodeId: string, data: any) => {
            setNodes((nds) => {
                const updated = nds.map((node) =>
                    node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
                );
                onNodesChangeCallback?.(updated);
                return updated;
            });
        },
        [setNodes, onNodesChangeCallback]
    );

    return (
        <div ref={reactFlowWrapper} className={cn("w-full h-full", className)}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid
                snapGrid={[15, 15]}
                defaultEdgeOptions={{
                    animated: true,
                    style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
                }}
                proOptions={{ hideAttribution: true }}
            >
                <Controls className="!bg-card !border-border !shadow-lg" />
                <MiniMap
                    className="!bg-card !border-border !shadow-lg"
                    nodeColor={(node) => {
                        switch (node.type) {
                            case 'trigger': return '#16a34a';
                            case 'message': return '#2563eb';
                            case 'waitResponse': return '#d97706';
                            case 'condition': return '#9333ea';
                            case 'action': return '#e11d48';
                            case 'webhook': return '#0891b2';
                            case 'end': return '#4b5563';
                            default: return '#6b7280';
                        }
                    }}
                />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            </ReactFlow>
        </div>
    );
}

// Wrap with provider
export function FlowCanvas(props: FlowCanvasProps) {
    return (
        <ReactFlowProvider>
            <FlowCanvasInner {...props} />
        </ReactFlowProvider>
    );
}

// Export for use in FlowEditor
export { getDefaultNodeData };

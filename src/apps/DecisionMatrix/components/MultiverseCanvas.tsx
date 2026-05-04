import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  ReactFlowProvider,
  Panel,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'motion/react';

import { QueryNode } from './QueryNode';
import { RealityNode } from './RealityNode';
import { ParallelRealities } from '../services/ai';
import { GitMerge, Lightbulb, Maximize, SlidersHorizontal, ChevronRight, Brain, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const nodeTypes = {
  query: QueryNode,
  reality: RealityNode,
};

interface MultiverseCanvasProps {
  query: string;
  data: ParallelRealities | null;
  onExpand?: () => void;
  isExpanding?: boolean;
  onCombine?: (id1: string, id2: string) => void;
}

function Flow({ query, data, onExpand, isExpanding, onCombine }: MultiverseCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { setCenter, fitView } = useReactFlow();
  
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [effortLevel, setEffortLevel] = useState<number>(50); // 0 to 100
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [comparingNodes, setComparingNodes] = useState<string[]>([]);
  const [thoughtTrail, setThoughtTrail] = useState<string[]>([]);
  const [idleInsightTriggered, setIdleInsightTriggered] = useState(false);
  const [isTakeawaysExpanded, setIsTakeawaysExpanded] = useState(true);
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);
  const idleTimer = useRef<NodeJS.Timeout>();

  // AI Presence tracking
  useEffect(() => {
    const handleGlobalMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleGlobalMouse);
    return () => window.removeEventListener('mousemove', handleGlobalMouse);
  }, []);

  useEffect(() => {
    if (query && thoughtTrail.length === 0) {
      setThoughtTrail(['Query Init']);
    }
  }, [query, thoughtTrail]);

  // Handle Idle Intelligence & Decision Pressure
  useEffect(() => {
    if (!data) return;
    
    const handleInteract = () => {
      clearTimeout(idleTimer.current);
      setNodes(nds => nds.map(n => ({...n, data: {...n.data, decisionPressure: false}})));
      
      if (!idleInsightTriggered) {
        idleTimer.current = setTimeout(() => {
          // Decision Pressure System: Highlight a critical node
          setNodes(nds => nds.map(n => {
            if (n.type === 'reality' && n.data?.confidence && (n.data.confidence as number) < 70) {
              return { ...n, data: { ...n.data, decisionPressure: true } };
            }
            return n;
          }));
          setThoughtTrail(t => [...t.slice(-2), 'AWAITING DECISION FOCUS']);
        }, 10000); // 10 seconds of idle
      }
    };
    
    handleInteract(); // initial start
    
    window.addEventListener('mousemove', handleInteract);
    window.addEventListener('keydown', handleInteract);
    
    return () => {
      clearTimeout(idleTimer.current);
      window.removeEventListener('mousemove', handleInteract);
      window.removeEventListener('keydown', handleInteract);
    }
  }, [data, idleInsightTriggered, setNodes]);

  // Re-build standard nodes when data or params change
  useEffect(() => {
    if (!data) {
      setNodes([
        {
          id: 'query',
          type: 'query',
          position: { x: 0, y: 100 },
          data: { query, isFocused: focusedNodeId === 'query', hasFocusMode: focusedNodeId !== null },
          draggable: false,
        }
      ]);
      setEdges([]);
      return;
    }

      const centerX = 0;
      const centerY = 0;

      // Use a functional update to preserve dynamically added nodes (like idle insight)
      setNodes(prev => {
        // Find idle node to preserve it if it exists
        const idleNode = prev.find(n => n.id === 'reality-idle');
        
        const newNodes: Node[] = [
          {
            id: 'query',
            type: 'query',
            position: { x: centerX - 120, y: centerY - 60 },
            data: { query, isFocused: focusedNodeId === 'query', hasFocusMode: focusedNodeId !== null },
          }
        ];

        const orderedRealities = [
          data.realities?.find(r => r.type === 'pessimistic' && !r.id.startsWith('second-order-')),
          data.realities?.find(r => r.type === 'realistic' && !r.id.startsWith('second-order-')),
          data.realities?.find(r => r.type === 'optimistic' && !r.id.startsWith('second-order-')),
        ].filter(Boolean) as ParallelRealities['realities'];

        // Base realities - inner circle
        orderedRealities.forEach((reality, index) => {
          const nodeId = `reality-${reality.id}`;
          const existingNode = prev.find(n => n.id === nodeId);
          
          // Spiral coordinates: r = 450, angle = 0, 120, 240 degrees
          const angle = (index * 120) * (Math.PI / 180);
          const r = 450;
          const x = centerX + r * Math.sin(angle) - 160;
          const y = centerY - r * Math.cos(angle) - 100;
          
          newNodes.push({
            id: nodeId,
            type: 'reality',
            position: existingNode ? existingNode.position : { x, y },
            data: { 
              ...reality, 
              index,
              isFocused: focusedNodeId === nodeId,
              isComparing: comparingNodes.includes(nodeId),
              hasFocusMode: focusedNodeId !== null || comparingNodes.length > 0,
              effortLevel
            },
          });
        });

        // Second-order realities - outer spiral
        const secondOrderRealities = [
          data.realities?.find(r => r.type === 'pessimistic' && r.id.startsWith('second-order-')),
          data.realities?.find(r => r.type === 'realistic' && r.id.startsWith('second-order-')),
          data.realities?.find(r => r.type === 'optimistic' && r.id.startsWith('second-order-')),
        ].filter(Boolean) as ParallelRealities['realities'];

        secondOrderRealities.forEach((reality, index) => {
          const nodeId = `reality-${reality.id}`;
          const existingNode = prev.find(n => n.id === nodeId);
          
          // Continuation of spiral: r = 850, angle offset by 60 degrees (so they appear between the inner nodes)
          const angle = (index * 120 + 60) * (Math.PI / 180);
          const r = 850;
          const x = centerX + r * Math.sin(angle) - 160;
          const y = centerY - r * Math.cos(angle) - 100;
          
          newNodes.push({
            id: nodeId,
            type: 'reality',
            position: existingNode ? existingNode.position : { x, y },
            data: { 
              ...reality, 
              index: index + 3, // for animation delay
              isFocused: focusedNodeId === nodeId,
              isComparing: comparingNodes.includes(nodeId),
              hasFocusMode: focusedNodeId !== null || comparingNodes.length > 0,
              effortLevel
            },
          });
        });

        if (idleNode) {
          newNodes.push({
            ...idleNode,
            data: {
               ...idleNode.data,
               isFocused: focusedNodeId === idleNode.id,
               isComparing: comparingNodes.includes(idleNode.id),
               hasFocusMode: focusedNodeId !== null || comparingNodes.length > 0,
               effortLevel
            }
          });
        }

        return newNodes;
      });

    setEdges(prev => {
      const newEdges: Edge[] = [];
      const orderedRealities = data.realities || [];
      
      orderedRealities.forEach((reality) => {
        const nodeId = `reality-${reality.id}`;
        const isSecondOrder = reality.id.startsWith('second-order-');
        
        let sourceId = 'query';
        if (isSecondOrder) {
            // Find parent ID by removing the prefix
            const parentId = reality.id.replace('second-order-', '');
            sourceId = `reality-${parentId}`;
        }

        const edgeColor = 
          reality.type === 'optimistic' ? 'rgba(52, 211, 153, 0.4)' : 
          reality.type === 'realistic' ? 'rgba(96, 165, 250, 0.4)' : 
          'rgba(248, 113, 113, 0.4)';

        newEdges.push({
          id: `edge-${reality.id}`,
          source: sourceId,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          style: { 
            stroke: comparingNodes.length > 0 ? (comparingNodes.includes(nodeId) ? 'rgba(217, 70, 239, 0.8)' : 'rgba(255,255,255,0.05)') : edgeColor, 
            strokeWidth: focusedNodeId === nodeId || comparingNodes.includes(nodeId) ? 4 : 2,
            opacity: focusedNodeId !== null && focusedNodeId !== nodeId ? 0.05 : 1
          },
          className: "ai-breathing-edge",
          markerEnd: { type: MarkerType.ArrowClosed, color: comparingNodes.includes(nodeId) ? 'rgba(217, 70, 239, 0.8)' : edgeColor },
        });
      });
      
      const idleEdge = prev.find(e => e.id === 'edge-idle-link');
      if (idleEdge) newEdges.push(idleEdge);
      
      return newEdges;
    });
    
  }, [data, query, setNodes, setEdges, focusedNodeId, effortLevel, comparingNodes]);

  // Initial fit view
  useEffect(() => {
    if (data) setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
  }, [data, fitView]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setFocusedNodeId(node.id);
    if (node.type === 'reality') {
      setCenter(node.position.x + 160, node.position.y + 150, { zoom: 1.1, duration: 800 });
      setThoughtTrail(t => {
        const newTrail = [...t.slice(-2), (node.data.type as string).toUpperCase() + ' FOCUS'];
        return newTrail;
      });
    } else if (node.type === 'query') {
      setCenter(node.position.x + 120, node.position.y + 50, { zoom: 1.2, duration: 800 });
    }
  }, [setCenter]);

  const onPaneClick = useCallback(() => {
    setFocusedNodeId(null);
    setComparingNodes([]);
    fitView({ duration: 800, padding: 0.2 });
  }, [fitView]);

  const handleTimeLoop = useCallback(() => {
    // Time Loop Interaction: Remove the latest hybrid or expansion node and undo thought trail
    setNodes(nds => {
      // Find the last node that isn't a base reality
      const lastRealNodeId = [...nds].reverse().find(n => n.type === 'reality' && n.id !== 'reality-idle' && !['reality-optimistic','reality-realistic','reality-pessimistic'].includes(n.id))?.id;
      if (lastRealNodeId) {
        setThoughtTrail(t => [...t.slice(-2), 'TIME LOOP REWIND']);
        return nds.filter(n => n.id !== lastRealNodeId);
      }
      return nds;
    });
    setEdges(eds => eds); // Reset will trigger auto-cleanup on next render ideally, or we could filter here
  }, [setNodes, setEdges]);

  const onNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    const compareThreshold = 350;
    
    setNodes(nds => {
      const draggedPos = node.position;
      let comparing: string[] = [];
      
      const newNodes = nds.map(n => {
        if (n.id === node.id || n.type !== 'reality') return n;
        
        const dx = draggedPos.x - n.position.x;
        const dy = draggedPos.y - n.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < compareThreshold) {
          if (!comparing.includes(node.id)) comparing.push(node.id);
          comparing.push(n.id);
        }

        // Magnetism: Attract or repel based on similarity
        let newX = n.position.x;
        let newY = n.position.y;
        
        if (dist < 500 && dist > 50) {
          const isSimilar = n.data?.type === node.data?.type || n.data?.type === 'realistic' || node.data?.type === 'realistic';
          // Thought Momentum: Fast drag pushes harder
          const force = isSimilar ? 0.04 : -0.02; 
          newX += dx * force;
          newY += dy * force;
        }

        if (newX !== n.position.x || newY !== n.position.y) {
          return { ...n, position: { x: newX, y: newY } };
        }
        
        return n;
      });

      setComparingNodes(comparing);
      if (comparing.length > 0) {
        setThoughtTrail(t => t[t.length - 1] === 'COMPARING REALITIES' ? t : [...t.slice(-2), 'COMPARING REALITIES']);
      }
      return newNodes;
    });
  }, [setNodes]);

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node, nodesList: Node[]) => {
    const combineThreshold = 100;
    const nearby = nodesList.filter(n => n.id !== node.id && n.type === 'reality');
    
    // Find closest node
    const closest = nearby.find(n => {
      const dx = n.position.x - node.position.x;
      const dy = n.position.y - node.position.y;
      return Math.sqrt(dx * dx + dy * dy) < combineThreshold;
    });

    if (closest && onCombine) {
      setThoughtTrail(t => [...t.slice(-2), 'REALITY COLLISION']);
      onCombine(node.id, closest.id);
      setComparingNodes([]);
    } else {
      setTimeout(() => setComparingNodes([]), 2000);
    }
  }, [onCombine]);

  return (
    <div className="w-full h-full bg-transparent relative font-sans">
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 z-10"
        style={{
          opacity: focusedNodeId ? 1 : 0,
          background: 'radial-gradient(circle at center, transparent 0%, rgba(5,5,8, 0.4) 100%)',
        }}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1.5 }}
        minZoom={0.2}
        className="[&_.react-flow__pane]:bg-transparent"
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} className="glass-card shadow-sm border-white/10" />
        
        <Panel position="top-right" className="m-4 z-50 flex gap-3">
           <button 
             onClick={handleTimeLoop} 
             className="p-2.5 glass-card bg-my-callout/50 hover:bg-my-callout text-amber-500 hover:text-amber-400 transition-all rounded-xl flex items-center justify-center backdrop-blur-md hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20" 
             title="Time Loop Rewind"
           >
              <RotateCcw size={18} />
           </button>
           <button 
             onClick={onPaneClick} 
             className="p-2.5 glass-card bg-my-callout/50 hover:bg-my-callout text-my-muted hover:text-my-ink transition-all rounded-xl flex items-center justify-center backdrop-blur-md hover:scale-105 hover:shadow-lg" 
             title="Reset Perspective"
           >
              <Maximize size={18} />
           </button>
        </Panel>

        {data && (
          <>
            <Panel position="top-left" className="m-4 z-50 flex flex-col gap-4 max-w-[300px]">
              {/* Thought Trail */}
              <div className="glass-card px-4 py-2 flex items-center gap-2 border-my-border backdrop-blur-xl bg-my-callout/60 shadow-lg">
                 <Brain size={14} className="text-my-accent shrink-0" />
                 <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-my-ink/70 overflow-hidden text-ellipsis whitespace-nowrap">
                   <AnimatePresence mode="popLayout">
                     {thoughtTrail.map((crumb, idx) => (
                       <motion.div 
                         key={`${crumb}-${idx}`}
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         className="flex items-center gap-1.5 shrink-0"
                       >
                         {idx > 0 && <ChevronRight size={12} className="text-my-muted/50" />}
                         <span className={idx === thoughtTrail.length - 1 ? 'text-my-accent' : ''}>
                           {crumb}
                         </span>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                 </div>
              </div>
            </Panel>

            <Panel position="bottom-left" className="m-4 z-50 flex flex-col gap-4">
              {/* Controls and Actions */}
              <div className="glass-card flex flex-col w-[260px] border-my-border backdrop-blur-xl bg-my-callout/80 shadow-2xl pointer-events-auto overflow-hidden transition-all duration-300">
                <button 
                  onClick={() => setIsControlsExpanded(!isControlsExpanded)}
                  className="flex items-center justify-between p-3 px-4 bg-my-callout/50 hover:bg-my-callout transition-colors w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-my-accent" />
                    <div className="text-[10px] uppercase font-bold tracking-wider text-my-accent/80">Control Panel</div>
                  </div>
                  <div className="text-my-muted">
                    {isControlsExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isControlsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-4 pt-2 flex flex-col gap-4">
                        {/* Simulation Actions */}
                        <div className="flex flex-col gap-2">
                          <div className="text-[10px] uppercase font-bold tracking-wider text-my-accent/80">Scenario Evolution</div>
                      
                          <button 
                            className="w-full py-2 bg-my-accent/90 hover:bg-my-accent text-xs font-bold rounded-full transition-all text-white flex items-center justify-center shadow-lg hover:shadow-my-accent/25 disabled:opacity-50 disabled:cursor-not-allowed border border-my-accent/20"
                            onClick={onExpand}
                            disabled={isExpanding}
                          >
                            {isExpanding ? (
                              <div className="flex gap-1.5 items-center">
                                <div className="w-1 h-1 bg-white/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1 h-1 bg-white/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1 h-1 bg-white/70 rounded-full animate-bounce" />
                              </div>
                            ) : (
                              "Unfold Deeper Implications"
                            )}
                          </button>
                          <p className="text-[9px] text-my-muted leading-relaxed italic">
                            Hint: Drag two scenarios together to explore their messy, real-world intersection.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Panel>
          </>
        )}

        {data && data.divergence_insights?.length > 0 && (
          <Panel position="bottom-right" className="m-4 z-50 max-w-[340px] pointer-events-auto">
            <div className="glass-card flex flex-col border-my-border backdrop-blur-xl bg-my-callout/80 shadow-2xl overflow-hidden transition-all duration-300">
              <button 
                onClick={() => setIsTakeawaysExpanded(!isTakeawaysExpanded)}
                className="flex items-center justify-between p-4 bg-my-callout/50 hover:bg-my-callout transition-colors w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-my-accent/20 flex items-center justify-center shrink-0">
                    <GitMerge className="w-3.5 h-3.5 text-my-accent" />
                  </div>
                  <div className="text-[11px] text-my-accent/80 font-bold uppercase tracking-widest">Strategic Takeaways</div>
                </div>
                <div className="text-my-muted">
                  {isTakeawaysExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              </button>
              
              <AnimatePresence initial={false}>
                {isTakeawaysExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4 pt-0 space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                      <div className="h-px w-full bg-my-border/50 mb-3" />
                      {data.divergence_insights?.map((insight, i) => (
                        <div key={i} className="text-xs text-my-ink/80 leading-relaxed border-l-2 border-my-accent/30 pl-3">
                          {typeof insight === 'string' ? insight : (insight as any)?.insight || (insight as any)?.type || JSON.stringify(insight)}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export function MultiverseCanvas(props: MultiverseCanvasProps) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}

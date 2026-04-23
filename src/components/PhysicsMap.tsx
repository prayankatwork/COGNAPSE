import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Cpu, Zap, Maximize2, Minimize2, Anchor, Filter, Target, Share2, Layers } from 'lucide-react';
import { executeQuickInfo } from '../services/geminiService';
import { useStore } from '../store';

interface NodeData {
  id: string;
  name: string;
  val: number;
  color: string;
  type?: string;
  importance: number;
  sub_query?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface LinkData {
  source: string;
  target: string;
  label?: string;
  strength?: number;
}

export default function PhysicsMap({ mapData, onSubSearch }: { mapData: any, onSubSearch: (q: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>();
  const theme = useStore((state) => state.theme);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [clickedNode, setClickedNode] = useState<{ id: string, time: number } | null>(null);
  
  // Intelligence States
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [miniInfo, setMiniInfo] = useState<string | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'high'>('all');
  const [layoutMode, setLayoutMode] = useState<'radial' | 'force'>('force');

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    let nodes: NodeData[] = [];
    let links: LinkData[] = [];

    const isDark = theme === 'dark';
    
    // Type-based colors for "Smart" categorization
    const typeColors: Record<string, string> = {
      concept: isDark ? '#38BDF8' : '#0369A1',
      entity: isDark ? '#A78BFA' : '#6D28D9',
      conflict: '#EF4444',
      discovery: '#10B981',
      default: isDark ? '#94A3B8' : '#64748B'
    };

    if (mapData?.central_node) {
      nodes.push({
        id: mapData.central_node.id || 'root',
        name: mapData.central_node.label,
        val: 28,
        importance: 1,
        color: '#F27D26', // Always Brand Orange for Root
        type: 'discovery'
      });
    }

    if (mapData?.nodes) {
      mapData.nodes.forEach((n: any) => {
        const importance = n.importance || 0.5;
        if (filterMode === 'high' && importance < 0.7) return;

        nodes.push({
          id: n.id,
          name: n.label,
          val: importance * 12 + 6,
          importance: importance,
          color: typeColors[n.type?.toLowerCase()] || typeColors.default,
          type: n.type,
          sub_query: n.sub_query
        });
      });
    }

    if (mapData?.edges) {
      mapData.edges.forEach((e: any) => {
        if (nodes.find(n => n.id === e.from) && nodes.find(n => n.id === e.to)) {
          links.push({
            source: e.from,
            target: e.to,
            label: e.label,
            strength: e.weight || 1
          });
        }
      });
    } else {
      // Fallback star layout
      const rootId = mapData?.central_node?.id || 'root';
      nodes.forEach(n => {
        if (n.id !== rootId) links.push({ source: rootId, target: n.id, strength: n.importance });
      });
    }

    return { nodes, links };
  }, [mapData, theme, filterMode]);

  const handleNodeClick = useCallback(async (node: any) => {
    const now = Date.now();
    
    // Neural Pivot: Double-click triggers automatic research protocol
    if (clickedNode && clickedNode.id === node.id && (now - clickedNode.time < 400)) {
      setClickedNode(null);
      setSelectedNode(null);
      setMiniInfo(null);
      
      // Don't pivot if it's the root node
      if (node.id === 'root' || node.val > 25) {
        fgRef.current?.zoomToFit(400);
        return;
      }

      onSubSearch(node.sub_query || node.name);
    } else {
      setClickedNode({ id: node.id, time: now });
      
      // Single click: Focus camera and open Intelligence Snapshot
      fgRef.current?.centerAt(node.x, node.y, 400);
      
      // Open modal for single-click forensic inspection
      setSelectedNode(node);
      setMiniInfo(null);
      setLoadingInfo(true);
      const info = await executeQuickInfo(node.name);
      setMiniInfo(info);
      setLoadingInfo(false);
    }
  }, [clickedNode, onSubSearch]);

  return (
    <div 
      ref={containerRef} 
      style={{ height: isExpanded ? '600px' : '440px' }} 
      className="relative bg-my-bg border border-my-border transition-all duration-500 overflow-hidden group flex flex-col"
    >
      {/* Smart Control Header */}
      <div className="h-10 bg-my-sidebar/50 backdrop-blur-md border-b border-my-border flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <Layers size={14} className="text-my-accent" />
          <span className="text-[10px] font-bold text-my-muted uppercase tracking-widest">Neural Cluster Analyzer</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setFilterMode(f => f === 'all' ? 'high' : 'all')}
            className={`flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase transition-all border ${
              filterMode === 'high' ? 'bg-my-accent text-white border-my-accent' : 'text-my-muted border-my-border hover:border-my-accent'
            }`}
          >
            <Filter size={10} /> {filterMode === 'all' ? 'Filter: All' : 'Filter: Critical'}
          </button>
          <div className="w-px h-4 bg-my-border mx-1" />
          <button 
            onClick={() => fgRef.current?.zoomToFit(500)}
            className="p-1.5 text-my-muted hover:text-my-accent transition-colors"
            title="Auto-Fit"
          >
            <Target size={14} />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-my-muted hover:text-my-accent transition-colors"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height - 40}
            graphData={graphData}
            nodeRelSize={4}
            linkColor={() => theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}
            linkWidth={(link: any) => (link.strength || 1) * 1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.012}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleColor={() => '#F27D26'}
            onNodeClick={handleNodeClick}
            onNodeDragEnd={(node) => { node.fx = node.x; node.fy = node.y; }}
            onNodeHover={setHoverNode}
            d3VelocityDecay={0.25}
            cooldownTicks={100}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              const nodeRadius = Math.sqrt(node.val) * 1.8;
              const isHovered = hoverNode === node;
              const isRoot = node.id === 'root' || node.val > 25;

              // Smart Glow
              if (isHovered || isRoot) {
                ctx.shadowBlur = 20 / globalScale;
                ctx.shadowColor = node.color;
              }

              // Node Body
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
              ctx.fillStyle = isHovered ? '#F27D26' : node.color;
              ctx.fill();
              
              ctx.shadowBlur = 0;

              // Type Ring
              if (node.type) {
                ctx.lineWidth = 1.5 / globalScale;
                ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
                ctx.stroke();
              }

              // Smart Labeling (Only show if important or hovered or zoomed)
              if (isHovered || isRoot || globalScale > 1.2 || node.importance > 0.8) {
                const labelColor = isHovered ? '#F27D26' : (theme === 'dark' ? '#F1F5F9' : '#1A1A1A');
                ctx.font = `${(isHovered || isRoot) ? 'bold' : 'normal'} ${fontSize}px "Outfit", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.6);
                
                ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)';
                ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + nodeRadius + 5, bckgDimensions[0], bckgDimensions[1]);
                
                ctx.fillStyle = labelColor;
                ctx.fillText(label, node.x, node.y + nodeRadius + 8);
              }
            }}
          />
        )}

        {/* Intelligence Snapshot Modal */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 flex items-center justify-center p-6 z-30"
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedNode(null)} />
              <div className="relative w-full max-w-[360px] bg-my-sidebar border border-my-border shadow-2xl p-8">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-my-accent to-transparent" />
                
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="absolute top-4 right-4 text-my-muted hover:text-my-ink"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-my-accent/10 flex items-center justify-center text-my-accent">
                    <Cpu size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-my-ink leading-tight uppercase tracking-widest text-[11px]">Knowledge Synthesis</h3>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] bg-my-accent/10 text-my-accent px-1.5 py-0.5 font-bold uppercase">{selectedNode.type || 'CONCEPT'}</span>
                      <span className="text-[9px] text-my-muted font-mono opacity-60">ID: {selectedNode.id.substring(0, 8)}</span>
                    </div>
                  </div>
                </div>

                <div className="min-h-[90px] mb-8 relative">
                  {loadingInfo ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <Loader2 size={24} className="animate-spin text-my-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse text-my-muted">Neural Mapping in Progress...</span>
                    </div>
                  ) : (
                    <div className="p-5 bg-my-bg border border-my-border italic shadow-inner">
                      <p className="text-[14px] text-my-ink leading-relaxed">
                        "{miniInfo}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      onSubSearch(selectedNode.sub_query || selectedNode.name);
                      setSelectedNode(null);
                    }}
                    className="col-span-2 bg-my-accent text-white py-4 px-4 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-my-ink transition-all shadow-xl"
                  >
                    <Target size={16} /> Execute Research
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2.5 border border-my-border text-my-muted hover:text-my-ink text-[9px] font-bold uppercase transition-colors">
                    <Share2 size={14} /> Map Source
                  </button>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="flex items-center justify-center gap-2 py-2.5 border border-my-border text-my-muted hover:text-my-ink text-[9px] font-bold uppercase transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cluster Footer Info */}
      <div className="h-8 bg-my-sidebar/30 border-t border-my-border flex items-center px-4 shrink-0">
        <div className="flex items-center gap-4 text-[9px] font-bold text-my-muted uppercase tracking-widest">
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#F27D26] rounded-full" /> Root</div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#38BDF8] rounded-full" /> Concept</div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#EF4444] rounded-full" /> Conflict</div>
           <span className="ml-auto opacity-30">Nodes: {graphData.nodes.length} | Links: {graphData.links.length}</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, useMemo } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, type Node, type Edge, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, Star, ChevronRight } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useSkillTreeLayout, type LayoutNode, type SkillNodeData } from '@/hooks/useSkillTreeLayout';
import { nodeVariants, springs, easings, durations } from '@/lib/motion';

/* ═══════════════════════════════════════════
   Path Color System — Rich, vibrant, screenshot-worthy
   ═══════════════════════════════════════════ */

const pathColors: Record<string, { bg: string; border: string; glow: string; text: string }> = {
  'Frontend Wizard': { bg: '#3b82f6', border: '#3b82f6', glow: '0 0 20px #3b82f640', text: '#60a5fa' },
  'Systems Engineer': { bg: '#ef4444', border: '#ef4444', glow: '0 0 20px #ef444440', text: '#f87171' },
  'Data Scientist': { bg: '#22c55e', border: '#22c55e', glow: '0 0 20px #22c55e40', text: '#4ade80' },
  'Core': { bg: '#FF6154', border: '#FF6154', glow: '0 0 20px #FF615440', text: '#FF6154' },
  'Fullstack Legend': { bg: '#FBBF24', border: '#FBBF24', glow: '0 0 20px #FBBF2440', text: '#FBBF24' },
  'DevOps Architect': { bg: '#22D3EE', border: '#22D3EE', glow: '0 0 20px #22D3EE40', text: '#22D3EE' },
};

const defaultPathStyle = { bg: '#6b7280', border: '#374151', glow: 'none', text: '#9CA3B8' };

/* ═══════════════════════════════════════════
   Custom Node Component — Three-tier hierarchy
   ═══════════════════════════════════════════ */

function SkillNodeComponent({ data }: { data: SkillNodeData & { _layoutX?: number; _layoutY?: number; _depth?: number } }) {
  const style = pathColors[data.path] || defaultPathStyle;
  const isUnlocked = data.status === 'unlocked';
  const isMastered = data.status === 'mastered';
  const isAvailable = data.status === 'available';
  const isLocked = data.status === 'locked';

  const width = isMastered ? 200 : isUnlocked ? 180 : 140;

  return (
    <motion.div
      initial="hidden"
      animate="entering"
      custom={data._depth || 0}
      variants={nodeVariants}
      style={{ width }}
      className={`
        relative group cursor-pointer select-none
        ${isUnlocked ? 'animate-breathe' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-border-strong)] !w-1.5 !h-1.5 !border-none" />
      
      {/* Mastered star marker */}
      {isMastered && (
        <div className="absolute -top-2 -right-2 z-10">
          <Star className="h-4 w-4 fill-[var(--color-accent-achievement)] text-[var(--color-accent-achievement)]" />
        </div>
      )}

      <div
        className={`
          relative overflow-hidden rounded-[var(--radius-standard)] p-3 transition-all duration-200
          ${isLocked ? 'opacity-40 grayscale-[50%]' : ''}
          ${isUnlocked || isMastered ? 'hover:scale-[1.02]' : 'hover:opacity-60'}
        `}
        style={{
          background: isUnlocked || isMastered
            ? `radial-gradient(ellipse at center, ${style.bg}${isMastered ? '25' : '15'} 0%, var(--color-elevated) 70%)`
            : 'var(--color-elevated)',
          border: isMastered
            ? `2px solid ${style.border}B0`
            : isAvailable
              ? `1px solid ${style.border}60`
              : `1px solid var(--color-border-subtle)`,
          boxShadow: isMastered
            ? `0 0 30px ${style.bg}30, 0 0 60px ${style.bg}15, inset 0 0 20px ${style.bg}10`
            : isUnlocked
              ? `0 0 20px ${style.bg}20, 0 0 40px ${style.bg}10`
              : 'none',
        }}
      >
        {/* Shimmer sweep for unlocked/mastered */}
        {(isUnlocked || isMastered) && (
          <div className="absolute inset-0 shimmer-sweep opacity-40" />
        )}

        <div className="flex items-center gap-2 mb-1.5">
          {isLocked && <Lock className="h-3 w-3 text-[var(--color-text-dim)] shrink-0" />}
          {data.generatedBy === 'ai' && (
            <Sparkles className="h-3 w-3 text-[var(--color-accent-secondary)] shrink-0" />
          )}
          <span
            className={`text-xs font-semibold truncate ${
              isLocked ? 'text-[var(--color-text-dim)]' :
              isUnlocked || isMastered ? 'text-[var(--color-text-primary)]' :
              'text-[var(--color-text-muted)]'
            }`}
            style={isMastered ? { textShadow: `0 0 8px ${style.bg}50` } : {}}
          >
            {data.label}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            {data.path}
          </span>
          <span className="text-[10px] font-mono font-bold text-[var(--color-accent-achievement)]">
            +{data.xpReward}
          </span>
        </div>

        {/* Status indicator dot */}
        <div className={`
          absolute top-2 right-2 h-1.5 w-1.5 rounded-full
          ${isUnlocked ? 'bg-[var(--color-accent-success)] shadow-glow-emerald' : ''}
          ${isMastered ? 'bg-[var(--color-accent-achievement)] shadow-glow-gold' : ''}
          ${isAvailable ? 'bg-[var(--color-accent-tertiary)] shadow-glow-cyan' : ''}
          ${isLocked ? 'bg-[var(--color-text-dim)]' : ''}
        `} />
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-border-strong)] !w-1.5 !h-1.5 !border-none" />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Custom Edge Component — Animated paths
   ═══════════════════════════════════════════ */

function AnimatedEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
}: any) {
  const isMet = data?.isMet === true;

  const edgePath = `M${sourceX},${sourceY} C${sourceX},${(sourceY + targetY) / 2} ${targetX},${(sourceY + targetY) / 2} ${targetX},${targetY}`;

  return (
    <g>
      {/* Glow layer for met edges */}
      {isMet && (
        <path
          d={edgePath}
          fill="none"
          stroke="var(--color-accent-success)"
          strokeWidth={3}
          strokeOpacity={0.15}
          style={{ filter: 'blur(4px)' }}
        />
      )}
      {/* Main edge */}
      <path
        d={edgePath}
        fill="none"
        stroke={isMet ? 'var(--color-accent-success)' : 'var(--color-border-strong)'}
        strokeWidth={isMet ? 2 : 1}
        strokeDasharray={isMet ? 'none' : '6 4'}
        strokeOpacity={isMet ? 0.7 : 0.4}
        className={!isMet ? 'animate-edge-flow' : ''}
      />
    </g>
  );
}

/* ═══════════════════════════════════════════
   Detail Panel — Node inspection sidebar
   ═══════════════════════════════════════════ */

function NodeDetailPanel({ node, onClose }: { node: SkillNodeData | null; onClose: () => void }) {
  if (!node) return null;

  const style = pathColors[node.path] || defaultPathStyle;
  const isUnlocked = node.status === 'unlocked';
  const isMastered = node.status === 'mastered';
  const isLocked = node.status === 'locked';

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: durations.fast, ease: easings.outExpo }}
          className="w-full lg:w-80 shrink-0 prismatic-card p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">{node.label}</h3>
            <div className="flex items-center gap-1.5">
              {node.generatedBy === 'ai' && (
                <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border border-[var(--color-accent-secondary)]/30 text-[var(--color-accent-secondary)] bg-[var(--color-accent-secondary-dim)]">
                  <Sparkles className="h-2.5 w-2.5" />AI
                </span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                isUnlocked || isMastered
                  ? 'border-[var(--color-accent-success)]/30 text-[var(--color-accent-success)] bg-[var(--color-accent-success-dim)]'
                  : isLocked
                    ? 'border-[var(--color-border-default)] text-[var(--color-text-dim)] bg-[var(--color-border-subtle)]'
                    : 'border-[var(--color-accent-tertiary)]/30 text-[var(--color-accent-tertiary)] bg-[var(--color-accent-tertiary-dim)]'
              }`}>
                {isLocked && <Lock className="h-2.5 w-2.5 mr-0.5 inline" />}
                {node.status}
              </span>
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{node.path}</p>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{node.description}</p>

          <div className="flex items-center justify-between text-sm pt-2 border-t border-[var(--color-border-subtle)]">
            <span className="text-[var(--color-text-muted)]">Reward</span>
            <span className="font-mono font-bold text-[var(--color-accent-achievement)]">+{node.xpReward} XP</span>
          </div>

          {node.requirements && Object.keys(node.requirements).length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--color-border-subtle)]">
              <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-dim)]">Requirements</p>
              {Object.entries(node.requirements).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">{key.replace(/_/g, ' ')}</span>
                  <span className="text-[var(--color-text-secondary)] font-mono">{val as number}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════
   Main SkillTree Component
   ═══════════════════════════════════════════ */

export function SkillTree() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SkillNodeData | null>(null);
  const [focusUnlocked, setFocusUnlocked] = useState(false);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    async function loadTree() {
      try {
        const clerkId = user?.id;
        const url = clerkId ? `/api/skilltree?clerkId=${clerkId}` : '/api/skilltree';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();

        const flowNodes: Node[] = (data.nodes || []).map((node: any, index: number) => ({
          id: node.id,
          position: node.position || { x: 0, y: 0 },
          type: 'skillNode',
          data: {
            label: node.name,
            description: node.description,
            status: node.status,
            path: node.path,
            xpReward: node.xpReward,
            requirements: node.requirements,
            generatedBy: node.generatedBy,
            _depth: 0,
          },
        }));

        const flowEdges: Edge[] = (data.edges || []).map((edge: any) => {
          const sourceNode = (data.nodes || []).find((n: any) => n.id === edge.source);
          const targetNode = (data.nodes || []).find((n: any) => n.id === edge.target);
          const isMet = sourceNode?.status === 'unlocked' || sourceNode?.status === 'mastered';

          return {
            ...edge,
            type: 'animatedEdge',
            data: { isMet },
            animated: false,
          };
        });

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch {
        setNodes([]);
        setEdges([]);
      } finally {
        setLoading(false);
      }
    }
    loadTree();
  }, [isLoaded, user, setNodes, setEdges]);

  // Compute layout with d3-hierarchy
  const rootNodeId = useMemo(() => {
    if (nodes.length === 0) return '';
    // Find root: node that is not a target of any edge
    const targetIds = new Set(edges.map((e: any) => e.target));
    const root = nodes.find((n: any) => !targetIds.has(n.id));
    return root?.id || nodes[0]?.id || '';
  }, [nodes, edges]);

  const { layoutNodes, isCalculating } = useSkillTreeLayout(nodes, edges, rootNodeId);

  // Apply layout positions to nodes
  useEffect(() => {
    if (layoutNodes.length === 0) return;

    setNodes((prevNodes: Node[]) =>
      prevNodes.map((node: Node) => {
        const layoutNode = layoutNodes.find(ln => ln.id === node.id);
        if (!layoutNode) return node;
        return {
          ...node,
          position: { x: layoutNode.x, y: layoutNode.y },
          data: {
            ...node.data,
            _depth: layoutNode.depth,
          },
        };
      })
    );
  }, [layoutNodes, setNodes]);

  const onConnect = useCallback((params: any) => setEdges((eds: any) => addEdge(params, eds)), [setEdges]);
  const onNodeClick = useCallback((_event: any, node: Node) => {
    setSelectedNode(node.data as unknown as SkillNodeData);
  }, []);

  // Filter nodes for focus mode
  const visibleNodes = useMemo(() => {
    if (!focusUnlocked) return nodes;
    return nodes.filter((n: any) => n.data?.status !== 'locked');
  }, [nodes, focusUnlocked]);

  const nodeTypes = useMemo(() => ({
    skillNode: SkillNodeComponent,
  }), []);

  const edgeTypes = useMemo(() => ({
    animatedEdge: AnimatedEdge,
  }), []);

  if (loading) {
    return (
      <div className="w-full h-[500px] rounded-[var(--radius-container)] overflow-hidden surface-elevated animate-pulse-glow" />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 h-[500px] rounded-[var(--radius-container)] overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-base)] relative">
        {/* Focus toggle */}
        <div className="absolute top-3 right-14 z-10">
          <button
            onClick={() => setFocusUnlocked(!focusUnlocked)}
            className={`
              text-[10px] uppercase tracking-[0.08em] font-medium px-3 py-1.5 rounded-full border transition-all duration-200
              ${focusUnlocked
                ? 'border-[var(--color-accent-success)]/40 text-[var(--color-accent-success)] bg-[var(--color-accent-success-dim)]'
                : 'border-[var(--color-border-default)] text-[var(--color-text-muted)] bg-[var(--color-elevated)] hover:border-[var(--color-border-strong)]'
              }
            `}
          >
            {focusUnlocked ? 'Unlocked Only' : 'Show All'}
          </button>
        </div>

        <ReactFlow
          nodes={focusUnlocked ? visibleNodes : nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Controls className="!bg-[var(--color-elevated)] !border-[var(--color-border-default)] [&>button]:!bg-[var(--color-elevated)] [&>button]:!border-[var(--color-border-subtle)] [&>button]:!text-[var(--color-text-muted)] [&>button:hover]:!bg-[var(--color-overlay)] [&>button:hover]:!text-[var(--color-text-primary)]" />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="!bg-[var(--color-elevated)] !border-[var(--color-border-default)]"
            nodeColor={(n) => {
              const style = pathColors[(n.data as any)?.path] || defaultPathStyle;
              return style.bg;
            }}
          />
          <Background gap={24} size={1} color="var(--color-border-subtle)" />
        </ReactFlow>
      </div>

      {/* Detail panel */}
      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}

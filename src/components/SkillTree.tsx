"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, Crown, Star } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { computeSkillTreeLayout, type SkillNodeData } from "@/hooks/useSkillTreeLayout";
import { slideFromRight } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";

const pathColors: Record<string, { bg: string; border: string; glow: string }> = {
  "Frontend Wizard": { bg: "#3b82f6", border: "#3b82f6", glow: "0 0 20px #3b82f640" },
  "Systems Engineer": { bg: "#ef4444", border: "#ef4444", glow: "0 0 20px #ef444440" },
  "Data Scientist": { bg: "#22c55e", border: "#22c55e", glow: "0 0 20px #22c55e40" },
  Core: { bg: "#a855f7", border: "#a855f7", glow: "0 0 20px #a855f740" },
  "Fullstack Legend": { bg: "#f59e0b", border: "#f59e0b", glow: "0 0 20px #f59e0b40" },
  "DevOps Architect": { bg: "#06b6d4", border: "#06b6d4", glow: "0 0 20px #06b6d440" },
};

const defaultPathStyle = { bg: "#6b7280", border: "#374151", glow: "none" };

/* ── Custom React Flow Node ── */
function SkillNode({ data }: NodeProps) {
  const nodeData = data as unknown as SkillNodeData;
  const style = pathColors[nodeData.path] || defaultPathStyle;
  const isUnlocked = nodeData.status === "unlocked";
  const isAvailable = nodeData.status === "available";
  const isMastered = nodeData.status === "mastered";

  const sizeClass = isMastered ? "w-[220px]" : isUnlocked || isAvailable ? "w-[180px]" : "w-[150px]";
  const opacityClass = nodeData.status === "locked" ? "opacity-40 grayscale-[0.7]" : "opacity-100";
  const glowStyle = isMastered
    ? { boxShadow: `0 0 30px ${style.bg}60, 0 0 60px ${style.bg}30` }
    : isUnlocked
    ? { boxShadow: `0 0 20px ${style.bg}40` }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`${sizeClass} ${opacityClass} rounded-[var(--radius-standard)] border px-4 py-3 text-white select-none cursor-pointer`}
      style={{
        background: isUnlocked || isMastered || isAvailable
          ? `linear-gradient(135deg, ${style.bg}30, ${style.bg}10)`
          : "hsl(var(--surface))",
        borderColor: isAvailable
          ? style.border
          : isUnlocked || isMastered
          ? `${style.border}80`
          : "hsl(var(--border))",
        borderWidth: isAvailable ? "2px" : "1px",
        ...glowStyle,
      }}
      whileHover={{ scale: 1.04, transition: { duration: 0.15 } }}
    >
      <div className="flex items-center gap-2">
        {isMastered && <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
        {isUnlocked && !isMastered && <Star className="h-3.5 w-3.5 shrink-0" style={{ color: style.bg }} />}
        {nodeData.status === "locked" && <Lock className="h-3.5 w-3.5 text-fg-muted shrink-0" />}
        <span className={`text-xs font-semibold truncate ${isUnlocked || isMastered ? "" : "text-fg-dim"}`}>
          {nodeData.label}
        </span>
      </div>
      <p className="text-[10px] text-fg-muted mt-1 truncate">{nodeData.path}</p>
    </motion.div>
  );
}

const nodeTypes = { skillNode: SkillNode };

export function SkillTree() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SkillNodeData | null>(null);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    async function loadTree() {
      try {
        const clerkId = user?.id;
        const url = clerkId ? `/api/skilltree?clerkId=${clerkId}` : "/api/skilltree";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();

        const flowNodes = (data.nodes || []).map((node: any) => ({
          id: node.id,
          position: { x: 0, y: 0 },
          data: {
            label: node.name,
            description: node.description,
            status: node.status,
            path: node.path,
            xpReward: node.xpReward,
            requirements: node.requirements,
            generatedBy: node.generatedBy,
          },
          type: "skillNode",
        }));

        const flowEdges = (data.edges || []).map((edge: any) => {
          const isMet = edge.sourceStatus === "unlocked" || edge.sourceStatus === "mastered";
          return {
            id: edge.id || `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            type: "smoothstep",
            animated: isMet,
            style: {
              stroke: isMet ? "#a78bfa" : "rgba(255, 255, 255, 0.35)",
              strokeWidth: isMet ? 3 : 2,
            },
          };
        });

        // Compute layout directly from raw data before entering React Flow state
        const { layoutNodes } = computeSkillTreeLayout(flowNodes, flowEdges, "root");
        const positionedNodes = flowNodes.map((node: any) => {
          const layout = layoutNodes.find((l) => l.id === node.id);
          if (!layout) return node;
          return { ...node, position: { x: layout.x, y: layout.y } };
        });

        setNodes(positionedNodes);
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

  const onConnect = useCallback((params: any) => setEdges((eds: any) => addEdge(params, eds)), [setEdges]);
  const onNodeClick = useCallback((_event: any, node: Node) => {
    setSelectedNode(node.data as unknown as SkillNodeData);
  }, []);

  if (loading) {
    return <Skeleton className="w-full h-[500px] rounded-[var(--radius-container)]" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 h-[600px] rounded-[var(--radius-container)] overflow-hidden border border-white/[0.06] bg-base">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          nodeTypes={nodeTypes}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Controls className="bg-surface border-white/[0.06] [&>button]:bg-surface [&>button]:border-white/[0.06] [&>button]:text-fg-dim" />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="bg-surface border-white/[0.06]"
            nodeColor={(n) => {
              const style = pathColors[(n.data as any)?.path] || defaultPathStyle;
              return style.bg;
            }}
          />
          <Background gap={24} size={1} color="rgba(255,255,255,0.025)" />
        </ReactFlow>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            variants={slideFromRight}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
            className="w-full lg:w-80 shrink-0 surface-elevated p-5"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-base font-bold text-white">{selectedNode.label}</h3>
              <div className="flex items-center gap-1.5">
                {selectedNode.generatedBy === "ai" && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-accent/30 text-accent bg-accent/10">
                    <Sparkles className="h-2.5 w-2.5" /> AI
                  </span>
                )}
                <StatusBadge status={selectedNode.status} />
              </div>
            </div>
            <p className="text-[10px] text-fg-muted mb-4">{selectedNode.path}</p>

            <p className="text-sm text-fg-dim leading-relaxed mb-4">{selectedNode.description}</p>

            <div className="flex items-center justify-between text-sm py-3 border-t border-white/[0.05]">
              <span className="text-fg-muted">Reward</span>
              <span className="text-accent font-bold font-mono">+{selectedNode.xpReward} XP</span>
            </div>

            {selectedNode.requirements && Object.keys(selectedNode.requirements).length > 0 && (
              <div className="space-y-1.5 pt-3 border-t border-white/[0.05]">
                <p className="text-label text-fg-muted">Requirements</p>
                {Object.entries(selectedNode.requirements).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-fg-muted">{key.replace(/_/g, " ")}</span>
                    <span className="text-fg-dim font-mono">{val as number}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedNode(null)}
              className="mt-4 w-full py-2 text-xs text-fg-muted hover:text-white transition-colors border border-white/[0.06] rounded-[var(--radius-compact)] hover:bg-white/[0.03]"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { text: string; className: string; icon?: React.ReactNode }> = {
    unlocked: { text: "Unlocked", className: "border-success/30 text-success bg-success/10" },
    available: { text: "Available", className: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10" },
    locked: { text: "Locked", className: "border-white/10 text-fg-muted bg-white/[0.04]", icon: <Lock className="h-2.5 w-2.5 mr-0.5" /> },
    mastered: { text: "Mastered", className: "border-amber-500/30 text-amber-400 bg-amber-500/10", icon: <Crown className="h-2.5 w-2.5 mr-0.5" /> },
  };
  const cfg = configs[status] || configs.locked;
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.className}`}>
      {cfg.icon}
      {cfg.text}
    </span>
  );
}

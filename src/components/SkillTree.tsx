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

const pathColors: Record<string, { bg: string; border: string }> = {
  "Frontend Wizard": { bg: "#3b82f6", border: "#3b82f6" },
  "Systems Engineer": { bg: "#ef4444", border: "#ef4444" },
  "Data Scientist": { bg: "#22c55e", border: "#22c55e" },
  Core: { bg: "#a855f7", border: "#a855f7" },
  "Fullstack Legend": { bg: "#f59e0b", border: "#f59e0b" },
  "DevOps Architect": { bg: "#06b6d4", border: "#06b6d4" },
};

const defaultPathStyle = { bg: "#6b7280", border: "#374151" };

/* ── Custom React Flow Node ── */
function SkillNode({ data }: NodeProps) {
  const nodeData = data as unknown as SkillNodeData;
  const style = pathColors[nodeData.path] || defaultPathStyle;
  const isUnlocked = nodeData.status === "unlocked";
  const isAvailable = nodeData.status === "available";
  const isMastered = nodeData.status === "mastered";

  const sizeClass = isMastered ? "w-[220px]" : "w-[180px]";
  const opacityClass = nodeData.status === "locked" ? "opacity-50 grayscale" : "opacity-100";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${sizeClass} ${opacityClass} rounded-xl border px-3 py-2.5 text-white select-none cursor-pointer`}
      style={{
        background: isUnlocked || isMastered || isAvailable
          ? `linear-gradient(135deg, ${style.bg}20, ${style.bg}05)`
          : "#111113",
        borderColor: isAvailable
          ? style.border
          : isUnlocked || isMastered
          ? `${style.border}60`
          : "rgba(255,255,255,0.06)",
        borderWidth: "1px",
      }}
      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
    >
      <div className="flex items-center gap-1.5">
        {isMastered && <Crown className="h-3 w-3 text-amber-400 shrink-0" />}
        {isUnlocked && !isMastered && <Star className="h-3 w-3 shrink-0" style={{ color: style.bg }} />}
        {nodeData.status === "locked" && <Lock className="h-3 w-3 text-white/30 shrink-0" />}
        <span className={`text-[11px] font-semibold truncate tracking-wide ${isUnlocked || isMastered ? "" : "text-white/40"}`}>
          {nodeData.label}
        </span>
      </div>
      <p className="text-[9px] text-white/40 mt-1 uppercase tracking-widest truncate">{nodeData.path}</p>
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
              stroke: isMet ? "#8b5cf6" : "rgba(255, 255, 255, 0.15)",
              strokeWidth: isMet ? 2 : 1.5,
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
    return <Skeleton className="w-full h-[500px] rounded-xl bg-[#18181b] border border-white/[0.04]" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 h-[600px] rounded-xl overflow-hidden border border-white/[0.06] bg-[#0c0c0e]">
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
          <Controls className="bg-[#18181b] border-white/[0.06] [&>button]:bg-[#18181b] [&>button]:border-white/[0.06] [&>button]:text-white/50" />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="bg-[#111113] border-white/[0.06]"
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
            className="w-full lg:w-[320px] shrink-0 bg-[#111113] border border-white/[0.06] rounded-xl p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="text-[15px] font-bold text-white/90">{selectedNode.label}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedNode.generatedBy === "ai" && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-violet-500/30 text-violet-300 bg-violet-500/10">
                    <Sparkles className="h-2.5 w-2.5" /> AI
                  </span>
                )}
                <StatusBadge status={selectedNode.status} />
              </div>
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4 font-semibold">{selectedNode.path}</p>

            <p className="text-[13px] text-white/60 leading-relaxed mb-5">{selectedNode.description}</p>

            <div className="flex items-center justify-between text-[13px] py-3.5 border-t border-white/[0.04]">
              <span className="text-white/40 font-medium">Reward</span>
              <span className="text-violet-400 font-bold font-mono">+{selectedNode.xpReward} XP</span>
            </div>

            {selectedNode.requirements && Object.keys(selectedNode.requirements).length > 0 && (
              <div className="space-y-2 pt-3.5 border-t border-white/[0.04]">
                <p className="text-[10px] uppercase font-bold tracking-widest text-white/40">Requirements</p>
                {Object.entries(selectedNode.requirements).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-white/60">{key.replace(/_/g, " ")}</span>
                    <span className="text-white/80 font-mono font-medium">{val as number}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedNode(null)}
              className="mt-6 w-full py-2.5 text-xs text-white/50 font-semibold uppercase tracking-wider hover:text-white transition-colors border border-white/[0.06] rounded-lg hover:bg-[#18181b]"
            >
              Close Details
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { text: string; className: string; icon?: React.ReactNode }> = {
    unlocked: { text: "Unlocked", className: "border-green-500/30 text-green-400 bg-green-500/10" },
    available: { text: "Available", className: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10" },
    locked: { text: "Locked", className: "border-white/10 text-white/40 bg-white/[0.02]", icon: <Lock className="h-2.5 w-2.5 mr-0.5" /> },
    mastered: { text: "Mastered", className: "border-amber-500/30 text-amber-400 bg-amber-500/10", icon: <Crown className="h-2.5 w-2.5 mr-0.5" /> },
  };
  const cfg = configs[status] || configs.locked;
  return (
    <span className={`inline-flex items-center text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border ${cfg.className}`}>
      {cfg.icon}
      {cfg.text}
    </span>
  );
}

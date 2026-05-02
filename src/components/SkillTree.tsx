"use client";

import { useCallback, useEffect, useState } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Sparkles } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface SkillTreeNodeData {
  label: string;
  description: string;
  status: string;
  path: string;
  xpReward: number;
  requirements?: Record<string, number>;
  generatedBy?: string;
}

const pathColors: Record<string, { bg: string; border: string; glow: string }> = {
  'Frontend Wizard': { bg: '#3b82f6', border: '#3b82f6', glow: '0 0 20px #3b82f640' },
  'Systems Engineer': { bg: '#ef4444', border: '#ef4444', glow: '0 0 20px #ef444440' },
  'Data Scientist': { bg: '#22c55e', border: '#22c55e', glow: '0 0 20px #22c55e40' },
  'Core': { bg: '#a855f7', border: '#a855f7', glow: '0 0 20px #a855f740' },
  'Fullstack Legend': { bg: '#f59e0b', border: '#f59e0b', glow: '0 0 20px #f59e0b40' },
  'DevOps Architect': { bg: '#06b6d4', border: '#06b6d4', glow: '0 0 20px #06b6d440' },
};

const defaultPathStyle = { bg: '#6b7280', border: '#374151', glow: 'none' };

export function SkillTree() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SkillTreeNodeData | null>(null);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    async function loadTree() {
      try {
        const userId = user?.id;
        const url = userId ? `/api/skilltree?userId=${userId}` : '/api/skilltree';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();

        const colors = { ...pathColors };

        const flowNodes = (data.nodes || []).map((node: any) => {
          const style = colors[node.path] || defaultPathStyle;
          const isUnlocked = node.status === 'unlocked';
          const isAvailable = node.status === 'available';

          return {
            id: node.id,
            position: node.position,
            data: {
              label: node.name,
              description: node.description,
              status: node.status,
              path: node.path,
              xpReward: node.xpReward,
              requirements: node.requirements,
              generatedBy: node.generatedBy,
            },
            style: {
              background: isUnlocked ? `linear-gradient(135deg, ${style.bg}40, ${style.bg}20)` : '#111118',
              color: '#fff',
              border: isAvailable ? `2px solid ${style.border}` : isUnlocked ? `1px solid ${style.border}80` : '1px solid #1f2937',
              borderRadius: '12px',
              padding: '12px 16px',
              width: 180,
              fontSize: '12px',
              fontWeight: isUnlocked ? 600 : 400,
              opacity: node.status === 'locked' ? 0.4 : 1,
              boxShadow: isUnlocked ? style.glow : 'none',
            },
          };
        });

        setNodes(flowNodes);
        setEdges(data.edges || []);
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
    setSelectedNode(node.data as unknown as SkillTreeNodeData);
  }, []);

  if (loading) return <Skeleton className="w-full h-[500px] rounded-xl" />;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 h-[500px] rounded-xl overflow-hidden border border-white/[0.06] bg-[#08080c]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Controls className="bg-[#111118] border-white/10 [&>button]:bg-[#111118] [&>button]:border-white/10 [&>button]:text-white" />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="bg-[#111118] border-white/10"
            nodeColor={(n) => {
              const style = pathColors[(n.data as any)?.path] || defaultPathStyle;
              return style.bg;
            }}
          />
          <Background gap={24} size={1} color="rgba(255,255,255,0.03)" />
        </ReactFlow>
      </div>

      {selectedNode && (
        <Card className="w-full lg:w-80 glass-card shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base text-white">{selectedNode.label}</CardTitle>
              <div className="flex items-center gap-1.5">
                {selectedNode.generatedBy === 'ai' && (
                  <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-400 bg-purple-500/10">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />AI
                  </Badge>
                )}
                <Badge
                  variant={selectedNode.status === 'unlocked' ? 'default' : selectedNode.status === 'available' ? 'secondary' : 'outline'}
                  className={`text-[10px] ${
                    selectedNode.status === 'unlocked' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    selectedNode.status === 'available' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                    'bg-white/5 text-white/30 border-white/10'
                  }`}
                >
                  {selectedNode.status === 'locked' && <Lock className="h-2.5 w-2.5 mr-0.5" />}
                  {selectedNode.status}
                </Badge>
              </div>
            </div>
            <p className="text-[10px] text-white/30">{selectedNode.path}</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <p className="text-sm text-white/50 leading-relaxed">{selectedNode.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/30">Reward</span>
              <span className="text-purple-400 font-bold">+{selectedNode.xpReward} XP</span>
            </div>
            {selectedNode.requirements && Object.keys(selectedNode.requirements).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/20 uppercase tracking-widest">Requirements</p>
                {Object.entries(selectedNode.requirements).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-white/40">{key.replace(/_/g, ' ')}</span>
                    <span className="text-white/60">{val as number}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
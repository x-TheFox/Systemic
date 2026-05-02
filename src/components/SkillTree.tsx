"use client";

import { useCallback, useEffect, useState } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SkillTreeNodeData {
  label: string;
  description: string;
  status: 'locked' | 'available' | 'unlocked';
  path: string;
  xpReward: number;
  requirements?: Array<{ type: string; value: number }>;
}

const pathColors: Record<string, string> = {
  'Frontend Wizard': '#3b82f6',
  'Systems Engineer': '#ef4444',
  'Data Scientist': '#22c55e',
  'Core': '#a855f7',
};

export function SkillTree() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SkillTreeNodeData | null>(null);

  useEffect(() => {
    async function loadTree() {
      try {
        const res = await fetch('/api/skilltree?userId=demo');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        const flowNodes = data.nodes.map((node: any) => ({
          id: node.id,
          position: node.position,
          data: {
            label: node.name,
            description: node.description,
            status: node.status,
            path: node.path,
            xpReward: node.xpReward,
            requirements: node.requirements,
          },
          style: {
            background: node.status === 'unlocked' ? pathColors[node.path] || '#333' : '#1f2937',
            color: '#fff',
            border: node.status === 'available' ? `2px solid ${pathColors[node.path] || '#a855f7'}` : '1px solid #374151',
            borderRadius: '8px',
            padding: '10px',
            width: 180,
            opacity: node.status === 'locked' ? 0.5 : 1,
          },
        }));

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
  }, [setNodes, setEdges]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = useCallback((_event: any, node: Node) => {
    setSelectedNode(node.data as unknown as SkillTreeNodeData);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="flex-1 h-[500px] bg-gray-900 rounded-xl border border-gray-800">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>

      {selectedNode && (
        <Card className="w-80 bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">{selectedNode.label}</CardTitle>
              <Badge
                variant={selectedNode.status === 'unlocked' ? 'default' : selectedNode.status === 'available' ? 'secondary' : 'outline'}
                style={{ backgroundColor: selectedNode.status === 'unlocked' ? pathColors[selectedNode.path] : undefined }}
              >
                {selectedNode.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-400">{selectedNode.path}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-300">{selectedNode.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">XP Reward</span>
              <span className="text-purple-400 font-semibold">+{selectedNode.xpReward} XP</span>
            </div>
            {selectedNode.requirements && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Requirements</p>
                {selectedNode.requirements.map((req, i) => (
                  <div key={i} className="text-xs text-gray-400">
                    {req.type}: {req.value}
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

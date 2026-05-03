import { useMemo, useState } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';
import type { Node, Edge } from '@xyflow/react';

export interface SkillNodeData {
  label: string;
  description: string;
  status: string;
  path: string;
  xpReward: number;
  requirements?: Record<string, number>;
  generatedBy?: string;
  [key: string]: unknown;
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  data: SkillNodeData;
  depth: number;
}

interface HierarchyNode {
  id: string;
  data: SkillNodeData;
  children?: HierarchyNode[];
}

export function useSkillTreeLayout(
  nodes: Node[],
  edges: Edge[],
  rootId: string
): { layoutNodes: LayoutNode[]; isCalculating: boolean } {
  const [isCalculating] = useState(false);

  const layoutNodes = useMemo(() => {
    if (nodes.length === 0) return [];

    const childrenMap = new Map<string, string[]>();
    const nodeMap = new Map<string, Node>();

    nodes.forEach(n => nodeMap.set(n.id, n));
    edges.forEach(e => {
      const children = childrenMap.get(e.source) || [];
      children.push(e.target);
      childrenMap.set(e.source, children);
    });

    function buildHierarchy(id: string): HierarchyNode {
      const node = nodeMap.get(id);
      const children = childrenMap.get(id) || [];
      return {
        id,
        data: (node?.data || {}) as SkillNodeData,
        children: children.length > 0 ? children.map(buildHierarchy) : undefined,
      };
    }

    const hierarchyData = buildHierarchy(rootId);
    const root = hierarchy(hierarchyData);

    const nodeCount = nodes.length;
    const treeWidth = Math.max(600, nodeCount * 60);
    const treeHeight = Math.max(400, nodeCount * 30);

    const separationFactor = nodeCount > 30 ? 2.0 : 1.5;
    const treeLayout = tree<HierarchyNode>()
      .size([treeWidth, treeHeight])
      .separation((a, b) => (a.parent === b.parent ? separationFactor : separationFactor + 0.5));

    const layoutRoot = treeLayout(root);

    const result: LayoutNode[] = [];
    layoutRoot.descendants().forEach(d => {
      result.push({
        id: d.data.id,
        x: d.x,
        y: d.y,
        data: d.data.data as SkillNodeData,
        depth: d.depth,
      });
    });

    return result;
  }, [nodes, edges, rootId]);

  return { layoutNodes, isCalculating };
}

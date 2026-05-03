import { hierarchy, tree, HierarchyNode } from "d3-hierarchy";
import type { Node, Edge } from "@xyflow/react";

export interface SkillNodeData {
  label: string;
  description: string;
  status: string;
  path: string;
  xpReward: number;
  requirements?: Record<string, number>;
  generatedBy?: string;
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  data: SkillNodeData;
  status: string;
  depth: number;
}

function buildHierarchy(nodes: Node[], edges: Edge[], rootId: string) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();

  nodes.forEach((n) => childrenMap.set(n.id, []));

  edges.forEach((edge) => {
    const source = edge.source;
    const target = edge.target;
    if (childrenMap.has(source)) {
      childrenMap.get(source)!.push(target);
    }
  });

  let effectiveRoot = rootId;
  if (!nodeMap.has(rootId)) {
    const incoming = new Set(edges.map((e) => e.target));
    const roots = nodes.filter((n) => !incoming.has(n.id));
    effectiveRoot = roots[0]?.id || nodes[0]?.id;
  }

  function buildNode(id: string): any {
    const node = nodeMap.get(id);
    if (!node) return null;
    const children = childrenMap.get(id) || [];
    return {
      id,
      data: node.data,
      status: (node.data as any)?.status || "locked",
      children: children.map(buildNode).filter(Boolean),
    };
  }

  const root = buildNode(effectiveRoot);
  if (!root) return null;

  const visited = new Set<string>();
  function markVisited(n: any) {
    visited.add(n.id);
    n.children?.forEach(markVisited);
  }
  markVisited(root);

  const orphans = nodes.filter((n) => !visited.has(n.id));
  if (orphans.length > 0) {
    root.children = root.children || [];
    orphans.forEach((o) => {
      root.children.push({
        id: o.id,
        data: o.data,
        status: (o.data as any)?.status || "locked",
        children: [],
      });
    });
  }

  return root;
}

export function computeSkillTreeLayout(
  nodes: Node[],
  edges: Edge[],
  rootId: string
): { layoutNodes: LayoutNode[] } {
  if (nodes.length === 0) {
    return { layoutNodes: [] };
  }

  const rootData = buildHierarchy(nodes, edges, rootId);
  if (!rootData) {
    return { layoutNodes: [] };
  }

  const root = hierarchy(rootData);

  // Increased spacing to prevent overlap
  const horizontalGap = 280; // was ~160-240
  const verticalGap = 160;   // was ~80-100

  const layout = tree<any>()
    .size([nodes.length * horizontalGap * 0.5, root.height * verticalGap * 1.5])
    .nodeSize([horizontalGap, verticalGap]);

  layout(root);

  const result: LayoutNode[] = [];
  root.each((d: HierarchyNode<any>) => {
    result.push({
      id: d.data.id,
      x: d.x ?? 0,
      y: d.y ?? 0,
      data: d.data.data as SkillNodeData,
      status: d.data.status,
      depth: d.depth,
    });
  });

  // Center the tree
  const xValues = result.map((n) => n.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const centerOffset = (minX + maxX) / 2;

  const centered = result.map((n) => ({
    ...n,
    x: n.x - centerOffset,
  }));

  return { layoutNodes: centered };
}

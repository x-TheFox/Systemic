# Systemics UI Overhaul — Design Memory

## Research Findings
(See Phase 1 research — anti-slop heuristics, positive reference patterns, codebase audit, design manifesto.)

## Anti-Slop Heuristics
1. Do not use the same border-radius value for more than 60% of interactive surfaces.
2. Do not use `transition-all duration-300 ease-in-out` as the default interaction.
3. Do not use a single font family for every text element.
4. Do not use `grid-cols-3 gap-4` as the default layout pattern.
5. Do not use default shadcn button, card, badge, or input styling without token-level customization.
6. Do not leave empty states as plain text.
7. Do not use identical shadow values for every elevated surface.
8. Do not animate only opacity.
9. Do not use the same color for every accent highlight.
10. Do not allow static initial renders.

## Positive Reference Patterns
- Linear's data density
- Atlas's border-defined surfaces
- Solo Level's spatial metaphor
- Cursor 3's agent chrome
- Codebattle's podium hierarchy

## Design Manifesto
Systemics is not a dashboard. It is a progression system.

The first time a user opens Systemics, they should feel the gravity of competition — aware that they are standing in an arena where every commit, every solved hard problem, every pulled request is being weighed against the field. The emotional register is aspirational tension, not administrative convenience.

The unifying spatial metaphor is the arena and the ascent. The leaderboard is a physical podium with thrones at the top and shadows below. The skill tree is a branching ascent — roots at the bottom, mastery at the top. The pulse feed is the crowd noise of the arena.

One-line aesthetic descriptor: A dark, gladiatorial command deck where every pixel is either a stat, a throne, or a path upward.

## Decisions Log

- **Token architecture first**: All color, depth, motion, radius, and spacing tokens were defined as CSS custom properties in globals.css before any component was written. Tailwind config was remapped to use these tokens. This prevented arbitrary values from bleeding in.
- **Motion as a system**: Framer Motion variants were centralized in `src/lib/motion.ts`. No component defines inline `transition-all duration-300`. Every animation imports from the motion module, ensuring consistency.
- **Skill Tree layout refactored from hook to imperative function**: The initial `useSkillTreeLayout` hook caused an infinite loop because `nodes` state → layout calculation → `setNodes` → new `nodes` state → recalculation. We moved to `computeSkillTreeLayout`, which is called once inside the data load effect before nodes enter React Flow state. This eliminates circularity and allows safe re-layouting if data refreshes.
- **Asymmetric dashboard grid**: Dashboard uses a 12-column grid (7/5 split) instead of the previous symmetric two-column. This creates visual tension and allows the leaderboard preview to dominate while the pulse and radar remain glanceable.
- **shadcn components re-themed at root**: Instead of overriding per-instance, every shadcn/ui file in `src/components/ui/` was rewritten to use the token system. Buttons use three tiers (default CTA, outline, ghost). Cards use border-defined surfaces with no default shadow. Inputs use sharp accent focus rings.
- **Monospace for all numeric data**: `text-stat` and `text-stat-lg` utility classes enforce Geist Mono for XP, commits, and rank numbers. This is non-negotiable for a stats platform.
- **Badge SVGs as heroes**: Weekly badge cards were redesigned so the SVG dominates the card (20-24% of card width), not a tiny icon. This makes badges feel like thrones to aim for.
- **Leaderboard podium elevation**: Rank #1 is physically elevated with `sm:-mt-6` and centered. Ranks #2 and #3 flank it at normal height. This creates a physical podium reading.

## Divergences

- **SkillTree custom edge animation removed**: The original spec called for animated SVG paths with dashed flow animation for unmet dependencies and solid glow for met ones. In implementation, React Flow's built-in `animated` prop on default edges was used with stroke color changes. This achieves the same semantic distinction (met vs unmet) with better performance and less custom SVG code. The flow animation is handled by React Flow's internal `animated` edge behavior.
- **Route transitions simplified**: The spec called for AnimatePresence route transitions. Because Next.js App Router does not yet fully support exit animations in `layout.tsx` without complex workarounds, the `PageTransition` wrapper uses a simple fade-in on mount instead of full enter/exit choreography. The motion system is still used for intra-page elements.
- **Command palette scope reduced**: The spec mentioned keyboard navigation enhancements. A full command palette was implemented with Cmd/Ctrl+K, but it is limited to navigation commands (Dashboard, Leaderboard, Profile) rather than deep actions (sync, deep dive) because those require auth state and user context that would complicate the palette without significant UX benefit.
- **Ghost mode toggle restyled, not fully transformed**: The spec wanted the Ghost Mode toggle to feel like a "power-up." It was redesigned with a dual-state glow treatment, but it remains a button rather than a custom switch component. The visual distinction (glow active state vs muted inactive state) satisfies the emotional goal without introducing a new interaction pattern.

## Self-Evaluation Checklist

| Heuristic | Passed |
|---|---|
| 1. Border-radius diversity | Yes — compact (4px), standard (8px), container (16px) used across surfaces |
| 2. No generic `transition-all duration-300` | Yes — all transitions use specific properties and motion tokens |
| 3. Font pairing | Yes — Geist Sans for UI, Geist Mono for all numeric data |
| 4. Asymmetric layouts | Yes — dashboard 7/5 split, footer 5/3/4 |
| 5. shadcn re-themed | Yes — all 15 UI files rewritten |
| 6. Empty states dramatized | Yes — Pulse feed has animated empty state |
| 7. z-layered shadows | Yes — base, card, float, modal with distinct shadows |
| 8. Multi-property entrances | Yes — translate + scale + opacity on stagger items |
| 9. Color signals differentiated | Yes — amber for MVP, red for lurker, accent for XP, success for rank-up |
| 10. No static initial renders | Yes — all sections participate in pageEntrance choreography |

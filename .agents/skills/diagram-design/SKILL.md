---
name: diagram-design
description: Create branded architecture, architecture delta, IT current-state, flowchart, sequence, state machine, ER/data model, timeline, swimlane, quadrant, radar/spider, polar chart, loop/flywheel, nested, tree, org chart, layer stack, exploded axonometric, axonometric plan, Venn, pyramid/funnel, treemap, heatmap, bar, waterfall, line, Gantt, scatter, high-level, process, medallion, data flow, DP integration, DP security matrix, Sankey, fishbone, Wardley map, kanban, user journey, service blueprint, deployment, dependency graph, UML class, story map, or database schema diagrams as standalone HTML with inline SVG and editorial design system.
license: MIT
metadata:
  version: "2.6"
---

# Diagram Design

Create diagrams as self-contained HTML files with inline SVG and an editorial design system.
Forty-five visual types. Semantic patterns describe behavior; type references describe layout.

## Core Rules & Philosophy
1. **The highest-quality move is deletion.** Target density 4/10. No visual clutter.
2. **One accent, not a rainbow.** Accent color is editorial (1–2 focal nodes per diagram).
3. **Orthogonal connectors are mandatory.** Right-angle elbow paths with rounded corners (`r=8`). Diagonal lines between off-axis nodes are prohibited.
4. **Z-Order Hierarchy:** Background -> Zones -> Arrows/Connectors -> Nodes -> Labels/Badges.
5. **Legibility at desktop zoom:** Min text size 9px (mono) / 12px (sans) / 18px+ (serif titles).
6. **Self-contained HTML + SVG:** Opens double-clicked offline with zero dependencies or build steps.

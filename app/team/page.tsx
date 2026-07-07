"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";
import { 
  Users, 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  ArrowLeft, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Search, 
  X, 
  Eye, 
  Moon, 
  Sun,
  ChevronUp,
  MapPin
} from "lucide-react";
import toast from "react-hot-toast";

type TreeNode = {
  memberId: string;
  fullName: string;
  rank: string;
  isActive: boolean;
  position?: string;
  walletBalance?: number;
  totalInvestment?: number;
  createdAt?: string;
  hasChildren?: boolean;
  teamCount?: number;
  profilePhotoUrl?: string;
};

type TreeData = {
  node: TreeNode;
  left: TreeNode | null;
  right: TreeNode | null;
  stats: {
    leftTeamCount: number;
    rightTeamCount: number;
    totalTeam: number;
    leftCurrentBusiness: number;
    rightCurrentBusiness: number;
    leftTotalBusiness: number;
    rightTotalBusiness: number;
    totalBusiness: number;
  };
};

interface LocalNodeState {
  node: TreeNode;
  left: TreeNode | null;
  right: TreeNode | null;
  stats: any;
  isExpanded: boolean;
}

interface CoordinateNode {
  id: string;
  isPlaceholder: boolean;
  side?: "left" | "right";
  x: number;
  y: number;
  parentId: string | null;
  node: TreeNode | null;
}

const CARD_WIDTH = 160;
const CARD_HEIGHT = 100;
const INITIAL_H_SPACING = 240;
const V_SPACING = 170;

export default function TeamPage() {
  const [treeState, setTreeState] = useState<Record<string, LocalNodeState>>({});
  const [rootId, setRootId] = useState<string>("");
  const [sessionRootId, setSessionRootId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Navigation / Details Panel state
  const [selectedNode, setSelectedNode] = useState<{ node: TreeNode; stats: any } | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);
  const [directTeam, setDirectTeam] = useState<any[]>([]);

  // Canvas Panning and Zooming State
  const [pan, setPan] = useState({ x: 0, y: 50 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // 1. Load Node Details recursively or single level
  const loadNode = useCallback(async (memberId: string, expandAfterLoad = false) => {
    try {
      const res = await fetch(`/api/team/tree?rootId=${memberId}`, { cache: "no-store" });
      if (res.ok) {
        const data: TreeData = await res.json();
        setTreeState((prev) => ({
          ...prev,
          [memberId]: {
            node: data.node,
            left: data.left,
            right: data.right,
            stats: data.stats,
            isExpanded: expandAfterLoad ? true : prev[memberId]?.isExpanded ?? false,
          },
        }));
        return data;
      }
    } catch (err) {
      toast.error("Failed to load network branch");
    }
    return null;
  }, []);

  // Initialize root user tree
  const initTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/tree", { cache: "no-store" });
      if (res.ok) {
        const data: TreeData = await res.json();
        setRootId(data.node.memberId);
        setSessionRootId(data.node.memberId);
        setTreeState({
          [data.node.memberId]: {
            node: data.node,
            left: data.left,
            right: data.right,
            stats: data.stats,
            isExpanded: true,
          },
        });
        setSelectedNode({ node: data.node, stats: data.stats });
        // Center the tree layout initially
        if (canvasRef.current) {
          const width = canvasRef.current.clientWidth;
          setPan({ x: width / 2 - CARD_WIDTH / 2, y: 60 });
        }
      }
    } catch {
      toast.error("Failed to load binary tree");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initTree();
    // Load direct team list separately
    fetch("/api/team", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDirectTeam(d.directTeam || []))
      .catch(() => {});
  }, [initTree]);

  // Center a specific coordinate in the viewport
  const centerNode = useCallback((x: number, y: number) => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight || 500;
    // Calculate offset to place (x, y) at the middle
    setPan({
      x: width / 2 - x * zoom - (CARD_WIDTH / 2) * zoom,
      y: height / 3 - y * zoom - (CARD_HEIGHT / 2) * zoom,
    });
  }, [zoom]);

  // Handle expand/collapse of a node
  const handleExpandToggle = async (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    const id = node.memberId;
    const isExpanded = treeState[id]?.isExpanded;

    if (!isExpanded) {
      // Lazy load children if not loaded
      if (!treeState[id]?.left && !treeState[id]?.right && node.hasChildren) {
        toast.loading("Loading downline...", { id: "tree-lazy-load" });
        await loadNode(id, true);
        toast.dismiss("tree-lazy-load");
      } else {
        setTreeState((prev) => ({
          ...prev,
          [id]: { ...prev[id], isExpanded: true },
        }));
      }
    } else {
      setTreeState((prev) => ({
        ...prev,
        [id]: { ...prev[id], isExpanded: false },
      }));
    }

    // Auto-center the clicked node
    const nodeCoords = findNodeCoordinates(id);
    if (nodeCoords) {
      centerNode(nodeCoords.x, nodeCoords.y);
    }
  };

  // Click card container directly: selects node, toggles expansion, and centers it
  const handleNodeCardClick = async (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    const id = node.memberId;
    
    setSelectedNode({ node, stats: treeState[id]?.stats });

    const isExpanded = treeState[id]?.isExpanded;
    if (!isExpanded) {
      if (!treeState[id]?.left && !treeState[id]?.right && node.hasChildren) {
        toast.loading("Loading downline...", { id: "tree-lazy-load" });
        await loadNode(id, true);
        toast.dismiss("tree-lazy-load");
      } else {
        setTreeState((prev) => ({
          ...prev,
          [id]: { ...prev[id], isExpanded: true },
        }));
      }
    } else {
      setTreeState((prev) => ({
        ...prev,
        [id]: { ...prev[id], isExpanded: false },
      }));
    }

    setTimeout(() => {
      const nodeCoords = findNodeCoordinates(id);
      if (nodeCoords) {
        centerNode(nodeCoords.x, nodeCoords.y);
      }
    }, 100);
  };

  // Search logic
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/team/tree?search=${encodeURIComponent(searchQuery.trim())}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.searchResult) {
        // Path matches: [rootId, ..., targetId]
        // Inject all retrieved path node details into treeState
        setTreeState((prev) => {
          const updated = { ...prev };
          Object.keys(data.nodes).forEach((key) => {
            updated[key] = {
              node: data.nodes[key].node,
              left: data.nodes[key].left,
              right: data.nodes[key].right,
              stats: data.nodes[key].stats,
              isExpanded: true,
            };
          });
          return updated;
        });

        // Set target highlighted
        setHighlightedId(data.targetId);
        toast.success(`Located ${data.targetId}`);

        // Update selected detail panel
        const targetDetails = data.nodes[data.targetId] || await fetchNode(data.targetId);
        if (targetDetails) {
          setSelectedNode({ node: targetDetails.node, stats: targetDetails.stats });
        }

        // Center on target node. Need a slight delay to allow coordinate calculation
        setTimeout(() => {
          const coords = findNodeCoordinates(data.targetId);
          if (coords) {
            centerNode(coords.x, coords.y);
          }
        }, 150);

      } else {
        toast.error(data.error || "No member found matching query");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  // Generate recursive binary tree layout with coordinates
  const getCoordinatesLayout = useCallback(() => {
    const coords: CoordinateNode[] = [];
    if (!rootId || !treeState[rootId]) return coords;

    const widthMap: Record<string, number> = {};

    // Helper to calculate horizontal width occupied by each subtree
    function calculateSubtreeWidth(id: string): number {
      const current = treeState[id];
      if (!current || !current.isExpanded) {
        widthMap[id] = 200; // default node leaf width including margins
        return 200;
      }

      const leftWidth = current.left ? calculateSubtreeWidth(current.left.memberId) : 200;
      const rightWidth = current.right ? calculateSubtreeWidth(current.right.memberId) : 200;

      const totalWidth = leftWidth + rightWidth + 40; // 40px gap between left & right subtrees
      widthMap[id] = totalWidth;
      return totalWidth;
    }

    calculateSubtreeWidth(rootId);

    function traverse(
      node: TreeNode,
      x: number,
      y: number,
      parentId: string | null,
      side?: "left" | "right"
    ) {
      const id = node.memberId;

      coords.push({
        id,
        isPlaceholder: false,
        side,
        x,
        y,
        parentId,
        node,
      });

      const current = treeState[id];

      // If expanded, draw left and right positions
      if (current && current.isExpanded) {
        const nextY = y + V_SPACING;
        
        const leftWidth = current.left ? (widthMap[current.left.memberId] || 200) : 200;
        const rightWidth = current.right ? (widthMap[current.right.memberId] || 200) : 200;

        const leftX = x - leftWidth / 2 - 20;
        const rightX = x + rightWidth / 2 + 20;

        // Left Position
        if (current.left) {
          traverse(current.left, leftX, nextY, id, "left");
        } else {
          // Placeholder for empty left slot
          coords.push({
            id: `${id}-empty-left`,
            isPlaceholder: true,
            side: "left",
            x: leftX,
            y: nextY,
            parentId: id,
            node: null,
          });
        }

        // Right Position
        if (current.right) {
          traverse(current.right, rightX, nextY, id, "right");
        } else {
          // Placeholder for empty right slot
          coords.push({
            id: `${id}-empty-right`,
            isPlaceholder: true,
            side: "right",
            x: rightX,
            y: nextY,
            parentId: id,
            node: null,
          });
        }
      }
    }

    // Traverse starting at root node coordinates (0, 0)
    traverse(treeState[rootId].node, 0, 0, null);
    return coords;
  }, [rootId, treeState]);

  // Find a specific node's coordinate helper
  const findNodeCoordinates = (id: string) => {
    const layout = getCoordinatesLayout();
    return layout.find((l) => l.id === id);
  };

  // Drag Canvas handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2, z + 0.1));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, z - 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    // Recenter root
    if (canvasRef.current) {
      const width = canvasRef.current.clientWidth;
      setPan({ x: width / 2 - CARD_WIDTH / 2, y: 60 });
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.05;
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(2, z + zoomFactor));
    } else {
      setZoom((z) => Math.max(0.3, z - zoomFactor));
    }
  };

  // Expand / Collapse All
  const handleExpandAll = () => {
    setTreeState((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key].isExpanded = true;
      });
      return updated;
    });
    toast.success("Expanded loaded branches");
  };

  const handleCollapseAll = () => {
    setTreeState((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (key !== rootId) {
          updated[key].isExpanded = false;
        }
      });
      return updated;
    });
    toast.success("Collapsed branches");
  };

  const handleCenterRoot = () => {
    handleZoomReset();
  };

  // Breadcrumb navigation
  const navigateTo = async (node: TreeNode) => {
    if (!node.hasChildren) {
      setSelectedNode({
        node,
        stats: {
          leftTeamCount: 0,
          rightTeamCount: 0,
          totalTeam: 0,
          leftCurrentBusiness: 0,
          rightCurrentBusiness: 0,
          leftTotalBusiness: 0,
          rightTotalBusiness: 0,
          totalBusiness: 0,
        },
      });
      return;
    }
    setBreadcrumb((prev) => [...prev, { id: rootId, name: treeState[rootId]?.node.fullName || rootId }]);
    setRootId(node.memberId);
    if (!treeState[node.memberId]) {
      await loadNode(node.memberId, true);
    }
  };

  const navigateBack = (index: number) => {
    const targetId = index < 0 ? sessionRootId : breadcrumb[index].id;
    setBreadcrumb((prev) => prev.slice(0, index < 0 ? 0 : index));
    setRootId(targetId);
  };

  // Node details loader for breadcrumb path setup
  const fetchNode = async (memberId: string) => {
    const res = await fetch(`/api/team/tree?rootId=${memberId}`);
    if (res.ok) return await res.json();
    return null;
  };

  const coordinates = getCoordinatesLayout();

  // Find relationships to draw connector paths
  const parentChildPairs = coordinates.filter((c) => c.parentId !== null);

  const themeClass = theme === "dark" 
    ? "bg-slate-950 text-white" 
    : "bg-slate-50 text-slate-900";

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
            <Users className="text-neon-cyan" size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Interactive Genealogy</h1>
            <p className="text-xs text-ink-muted">View, expand, and search your entire binary tree structure.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme switcher */}
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-ink-muted hover:text-white transition"
            title="Toggle theme view"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={initTree}
            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-ink-muted hover:text-white transition"
            title="Reload tree"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div className="glass-card p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search Member ID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full pl-10 pr-24 py-2 text-sm"
          />
          <Search className="absolute left-3 top-2.5 text-ink-muted" size={16} />
          <button
            type="submit"
            disabled={searching}
            className="absolute right-1.5 top-1.5 px-3 py-1 rounded-lg bg-neon-cyan hover:bg-neon-cyan/80 text-black text-xs font-semibold transition"
          >
            {searching ? "..." : "Locate"}
          </button>
        </form>

        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs text-ink-muted flex-wrap">
          <button
            onClick={() => navigateBack(-1)}
            className="hover:text-neon-cyan transition font-semibold"
          >
            Root
          </button>
          {breadcrumb.map((b, idx) => (
            <div key={b.id} className="flex items-center gap-1">
              <ChevronRight size={12} className="opacity-50" />
              <button
                onClick={() => navigateBack(idx)}
                className="hover:text-neon-cyan transition font-semibold"
              >
                {b.name}
              </button>
            </div>
          ))}
          {rootId && treeState[rootId] && (
            <>
              <ChevronRight size={12} className="opacity-50" />
              <span className="text-neon-cyan font-bold">{treeState[rootId].node.fullName}</span>
            </>
          )}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        className={`relative w-full h-[520px] rounded-2xl overflow-hidden border border-white/10 select-none cursor-grab active:cursor-grabbing ${themeClass}`}
        style={{
          backgroundImage: theme === "dark" 
            ? "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)"
            : "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* SVG Connector Lines Layer */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <g>
            {parentChildPairs.map((pair) => {
              const parent = coordinates.find((c) => c.id === pair.parentId);
              if (!parent) return null;

              // Calculate start coordinates (bottom-middle of parent card)
              const startX = parent.x + CARD_WIDTH / 2;
              const startY = parent.y + CARD_HEIGHT;

              // Calculate end coordinates (top-middle of child card)
              const endX = pair.x + CARD_WIDTH / 2;
              const endY = pair.y;

              // Control midpoint for orthogonal connector curve
              const midY = startY + (endY - startY) / 2;

              // Draw neat path
              const pathData = `
                M ${startX} ${startY}
                L ${startX} ${midY}
                L ${endX} ${midY}
                L ${endX} ${endY}
              `;

              return (
                <path
                  key={pair.id}
                  d={pathData}
                  fill="none"
                  stroke={pair.isPlaceholder ? "rgba(255,255,255,0.08)" : "rgba(0,229,255,0.25)"}
                  strokeWidth="2"
                  strokeDasharray={pair.isPlaceholder ? "4 4" : "0"}
                  className="transition-all duration-300"
                />
              );
            })}
          </g>
        </svg>

        {/* Nodes Layer */}
        <div
          className="absolute transform-gpu origin-top-left transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {coordinates.map((item) => {
            const isTarget = item.id === highlightedId;

            if (item.isPlaceholder) {
              return (
                <div
                  key={item.id}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  }}
                  className="absolute flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/2 text-center p-3"
                >
                  <div className="w-8 h-8 rounded-full border border-dashed border-white/20 bg-white/2 flex items-center justify-center mb-1.5 text-ink-muted text-xs">
                    +
                  </div>
                  <p className="text-[10px] text-ink-muted font-semibold uppercase tracking-wider">Empty slot</p>
                </div>
              );
            }

            const isExpanded = treeState[item.id]?.isExpanded;
            const nodeData = item.node!;

            return (
              <div
                key={item.id}
                onClick={(e) => handleNodeCardClick(e, nodeData)}
                style={{
                  left: item.x,
                  top: item.y,
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                }}
                className={`absolute rounded-2xl border p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  item.id === rootId
                    ? "bg-gradient-to-b from-neon-cyan/15 to-neon-cyan/5 border-neon-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                    : isTarget
                    ? "bg-yellow-400/10 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.25)] animate-pulse"
                    : nodeData.isActive
                    ? "bg-neon-green/5 border-neon-green/40 shadow-[0_0_10px_rgba(0,230,118,0.1)] hover:border-neon-green"
                    : "bg-red-500/5 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:border-red-500"
                }`}
              >
                {/* Active Status Ring Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white mb-1.5 shrink-0 border-2 ${
                    nodeData.isActive ? "border-neon-green bg-neon-green/20" : "border-red-500 bg-red-500/20"
                  }`}
                >
                  {nodeData.fullName?.[0]?.toUpperCase() || "?"}
                </div>

                <p className="text-[11px] font-bold text-white truncate w-full px-1">{nodeData.fullName}</p>
                <p className="text-[9px] text-ink-muted font-mono">{nodeData.memberId}</p>

                {/* Expand / Collapse trigger badge */}
                {nodeData.hasChildren && (
                  <button
                    onClick={(e) => handleExpandToggle(e, nodeData)}
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border border-white/10 bg-slate-900 text-white hover:text-neon-cyan hover:border-neon-cyan flex items-center justify-center transition-colors shadow-md"
                  >
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                )}

                {/* Enter Subtree Quick Access */}
                {nodeData.hasChildren && item.id !== rootId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateTo(nodeData);
                    }}
                    title="Enter this member's network"
                    className="absolute right-1 bottom-1 p-1 rounded-md text-ink-muted hover:text-neon-cyan transition-colors"
                  >
                    <Eye size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating controls panel */}
        <div className="absolute bottom-4 right-4 flex flex-col sm:flex-row gap-2 bg-slate-900/90 border border-white/10 p-1.5 rounded-xl shadow-2xl backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-ink-muted hover:text-white hover:bg-white/5 transition"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg text-ink-muted hover:text-white hover:bg-white/5 transition"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleZoomReset}
            className="p-2 rounded-lg text-ink-muted hover:text-white hover:bg-white/5 transition text-xs font-semibold"
            title="Reset view"
          >
            Reset
          </button>
          <div className="w-px h-auto bg-white/10 hidden sm:block" />
          <button
            onClick={handleExpandAll}
            className="p-2 rounded-lg text-ink-muted hover:text-white hover:bg-white/5 transition"
            title="Expand All branches"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={handleCollapseAll}
            className="p-2 rounded-lg text-ink-muted hover:text-white hover:bg-white/5 transition"
            title="Collapse All branches"
          >
            <Minimize2 size={14} />
          </button>
          <button
            onClick={handleCenterRoot}
            className="p-2 rounded-lg text-ink-muted hover:text-white hover:bg-white/5 transition"
            title="Center Root"
          >
            <MapPin size={14} />
          </button>
        </div>
      </div>

      {/* Selected Node Details Stats Panel */}
      {selectedNode && (
        <div className="glass-card p-5 mt-6 border-neon-cyan/20">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-neon-cyan" />
              <h3 className="font-display font-semibold">
                Network Details: <span className="text-neon-cyan">{selectedNode.node.fullName}</span>
                <span className="text-ink-muted text-xs font-mono ml-2">({selectedNode.node.memberId})</span>
              </h3>
            </div>
            {/* Quick center locator */}
            <button
              onClick={() => {
                const coords = findNodeCoordinates(selectedNode.node.memberId);
                if (coords) centerNode(coords.x, coords.y);
              }}
              className="text-xs text-neon-cyan hover:underline flex items-center gap-1"
            >
              Locate on Tree
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-ink-muted">Left Team</p>
              <p className="font-bold text-neon-green text-lg mt-1">{selectedNode.stats?.leftTeamCount ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-ink-muted">Right Team</p>
              <p className="font-bold text-neon-violet text-lg mt-1">{selectedNode.stats?.rightTeamCount ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-ink-muted">Total Network</p>
              <p className="font-bold text-white text-lg mt-1">{selectedNode.stats?.totalTeam ?? 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-ink-muted">Total Business</p>
              <p className="font-bold text-neon-cyan text-lg mt-1">${(selectedNode.stats?.totalBusiness ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-ink-muted">Left Business</p>
              <p className="font-bold text-neon-green mt-1">${(selectedNode.stats?.leftCurrentBusiness ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-ink-muted">Right Business</p>
              <p className="font-bold text-neon-violet mt-1">${(selectedNode.stats?.rightCurrentBusiness ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-ink-muted">Left Total Business</p>
              <p className="font-bold mt-1">${(selectedNode.stats?.leftTotalBusiness ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-ink-muted">Right Total Business</p>
              <p className="font-bold mt-1">${(selectedNode.stats?.rightTotalBusiness ?? 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-ink-muted">
            <div className="bg-white/3 rounded-xl p-3 space-y-1">
              <p className="font-semibold text-white mb-1">Member Information</p>
              <p>Status: <span className={selectedNode.node.isActive ? "text-neon-green font-semibold" : "text-red-400 font-semibold"}>{selectedNode.node.isActive ? "Active" : "Inactive"}</span></p>
              <p>Rank Tier: <span className="text-white font-medium">{selectedNode.node.rank}</span></p>
              {selectedNode.node.createdAt && <p>Registered On: <span className="text-white">{new Date(selectedNode.node.createdAt).toLocaleDateString()}</span></p>}
            </div>
            <div className="bg-white/3 rounded-xl p-3 space-y-1">
              <p className="font-semibold text-white mb-1">Financial Overview</p>
              <p>USDT Wallet: <span className="text-neon-cyan font-bold">${(selectedNode.node.walletBalance || 0).toLocaleString()}</span></p>
              <p>Investment Volume: <span className="text-neon-violet font-bold">${(selectedNode.node.totalInvestment || 0).toLocaleString()}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Direct Team Table */}
      <div className="glass-card p-5 mt-6">
        <h2 className="font-display font-semibold mb-4">Direct Team Referrals ({directTeam.length})</h2>
        {!directTeam.length ? (
          <p className="text-sm text-ink-muted py-8 text-center">No direct referrals yet. Invite members to grow your tree.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted border-b border-white/10">
                  <th className="py-2 pr-4">Member</th>
                  <th className="py-2 pr-4">Position</th>
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Joined Date</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {directTeam.map((m: any) => (
                  <tr
                    key={m.memberId}
                    className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors cursor-pointer"
                    onClick={async () => {
                      setRootId(m.memberId);
                      if (!treeState[m.memberId]) {
                        await loadNode(m.memberId, true);
                      }
                      setBreadcrumb((prev) => [...prev, { id: rootId, name: treeState[rootId]?.node.fullName || rootId }]);
                    }}
                  >
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-white">{m.fullName}</p>
                      <p className="text-xs text-ink-muted">{m.memberId}</p>
                    </td>
                    <td className="py-2.5 pr-4 capitalize text-xs">{m.position || "—"}</td>
                    <td className="py-2.5 pr-4 text-xs">{m.rank}</td>
                    <td className="py-2.5 pr-4 text-ink-muted text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        m.isActive ? "bg-neon-green/15 text-neon-green" : "bg-white/5 text-ink-muted"
                      }`}>{m.isActive ? "Active" : "Inactive"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

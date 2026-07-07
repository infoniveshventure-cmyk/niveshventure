"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";
import {
  Users,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Search,
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
  children: TreeNode[];
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
  children: TreeNode[];
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

const CARD_WIDTH = 90;
const CARD_HEIGHT = 65;
const V_SPACING = 120;
const NODE_GAP = 20; // Gap between sibling cards/subtrees

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

  // Details Panel and Side referrals list
  const [selectedNode, setSelectedNode] = useState<{ node: TreeNode; stats: any } | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);
  const [directTeam, setDirectTeam] = useState<any[]>([]);

  // Canvas Panning and Zooming State
  const [pan, setPan] = useState({ x: 0, y: 50 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load a single level of the tree
  const loadNode = useCallback(async (memberId: string, expandAfterLoad = false) => {
    try {
      const res = await fetch(`/api/team/tree?rootId=${memberId}`, { cache: "no-store" });
      if (res.ok) {
        const data: TreeData = await res.json();
        setTreeState((prev) => ({
          ...prev,
          [memberId]: {
            node: data.node,
            children: data.children || [],
            stats: data.stats,
            isExpanded: expandAfterLoad ? true : prev[memberId]?.isExpanded ?? false,
          },
        }));
        return data;
      }
    } catch {
      toast.error("Failed to load network branch");
    }
    return null;
  }, []);

  // Initialize tree
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
            children: data.children || [],
            stats: data.stats,
            isExpanded: true,
          },
        });
        setSelectedNode({ node: data.node, stats: data.stats });
        if (canvasRef.current) {
          const width = canvasRef.current.clientWidth;
          setPan({ x: width / 2 - CARD_WIDTH / 2, y: 60 });
        }
      }
    } catch {
      toast.error("Failed to load network tree");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initTree();
    fetch("/api/team", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDirectTeam(d.directTeam || []))
      .catch(() => { });
  }, [initTree]);

  // Center a node coordinate in viewport
  const centerNode = useCallback((x: number, y: number) => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight || 500;
    setPan({
      x: width / 2 - x * zoom - (CARD_WIDTH / 2) * zoom,
      y: height / 3 - y * zoom - (CARD_HEIGHT / 2) * zoom,
    });
  }, [zoom]);

  // Handle expand/collapse toggle
  const handleExpandToggle = async (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    const id = node.memberId;
    const isExpanded = treeState[id]?.isExpanded;

    if (!isExpanded) {
      if (!treeState[id] && node.hasChildren) {
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

    const nodeCoords = findNodeCoordinates(id);
    if (nodeCoords) {
      centerNode(nodeCoords.x, nodeCoords.y);
    }
  };

  // Node Click: Select node, toggle expand/collapse, and center
  const handleNodeCardClick = async (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    const id = node.memberId;

    setSelectedNode({ node, stats: treeState[id]?.stats });

    const isExpanded = treeState[id]?.isExpanded;
    if (!isExpanded) {
      if (!treeState[id] && node.hasChildren) {
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
        setTreeState((prev) => {
          const updated = { ...prev };
          Object.keys(data.nodes).forEach((key) => {
            updated[key] = {
              node: data.nodes[key].node,
              children: data.nodes[key].children || [],
              stats: data.nodes[key].stats,
              isExpanded: true,
            };
          });
          return updated;
        });

        setHighlightedId(data.targetId);
        toast.success(`Located ${data.targetId}`);

        const targetDetails = data.nodes[data.targetId] || await fetch(`/api/team/tree?rootId=${data.targetId}`).then((r) => r.json());
        if (targetDetails) {
          setSelectedNode({ node: targetDetails.node, stats: targetDetails.stats });
        }

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

  // Recursively calculate horizontal subtree widths and positions
  const getCoordinatesLayout = useCallback(() => {
    const coords: CoordinateNode[] = [];
    if (!rootId || !treeState[rootId]) return coords;

    const widthMap: Record<string, number> = {};

    // 1st Pass: Bottom-up subtree width calculator
    function calculateSubtreeWidth(id: string): number {
      const current = treeState[id];
      if (!current || !current.isExpanded || !current.children || current.children.length === 0) {
        widthMap[id] = CARD_WIDTH + NODE_GAP;
        return CARD_WIDTH + NODE_GAP;
      }

      let childrenWidth = 0;
      current.children.forEach((child) => {
        childrenWidth += calculateSubtreeWidth(child.memberId);
      });

      const totalWidth = childrenWidth + NODE_GAP * (current.children.length - 1);
      widthMap[id] = Math.max(CARD_WIDTH + NODE_GAP, totalWidth);
      return widthMap[id];
    }

    calculateSubtreeWidth(rootId);

    // 2nd Pass: Top-down coordinate assignment
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

      if (current && current.isExpanded && current.children && current.children.length > 0) {
        const nextY = y + V_SPACING;

        // Calculate combined widths of all subtrees
        let totalWidth = 0;
        current.children.forEach((child) => {
          totalWidth += widthMap[child.memberId] || (CARD_WIDTH + NODE_GAP);
        });
        totalWidth += NODE_GAP * (current.children.length - 1);

        let startX = x + CARD_WIDTH / 2 - totalWidth / 2;

        current.children.forEach((child) => {
          const childWidth = widthMap[child.memberId] || (CARD_WIDTH + NODE_GAP);
          const childX = startX + childWidth / 2 - CARD_WIDTH / 2;

          traverse(child, childX, nextY, id, child.position as any);
          startX += childWidth;
        });
      }
    }

    traverse(treeState[rootId].node, 0, 0, null);
    return coords;
  }, [rootId, treeState]);

  const findNodeCoordinates = (id: string) => {
    const layout = getCoordinatesLayout();
    return layout.find((l) => l.id === id);
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  // Touch panning and pinch zoom state
  const touchStart = useRef({ x: 0, y: 0 });
  const initialTouchDistance = useRef<number | null>(null);
  const initialZoom = useRef<number>(1);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      touchStart.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
      initialTouchDistance.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistance.current = dist;
      initialZoom.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - touchStart.current.x,
        y: e.touches[0].clientY - touchStart.current.y,
      });
    } else if (e.touches.length === 2 && initialTouchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialTouchDistance.current;
      const newZoom = Math.max(0.3, Math.min(2, initialZoom.current * ratio));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialTouchDistance.current = null;
  };

  // Prevent default scroll behavior while interacting with canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.05;
      if (e.deltaY < 0) {
        setZoom((z) => Math.min(2, z + zoomFactor));
      } else {
        setZoom((z) => Math.max(0.3, z - zoomFactor));
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(2, z + 0.1));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, z - 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    if (canvasRef.current) {
      const width = canvasRef.current.clientWidth;
      setPan({ x: width / 2 - CARD_WIDTH / 2, y: 60 });
    }
  };

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

  const navigateTo = async (node: TreeNode) => {
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

  const coordinates = getCoordinatesLayout();

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
            <h1 className="font-display text-2xl font-bold">Genealogy Tree View</h1>
            <p className="text-xs text-ink-muted">Redesigned multi-node sponsor referral layout with dynamic alignment.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[580px] rounded-2xl overflow-hidden bg-[#424242] border border-[#555] select-none cursor-grab active:cursor-grabbing text-white"
      >
        {/* Top Info Banner - Exactly matching screenshot */}
        <div className="absolute top-4 left-4 right-4 z-10 bg-black/30 border border-yellow-500/30 rounded-lg p-2.5 text-center text-xs text-yellow-500 font-medium">
          🔍 Note: You can zoom in or zoom out the page by using Ctrl + Mouse Wheel
        </div>

        {/* SVG Connector Lines Layer */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full overflow-visible"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <g>
            {Object.keys(treeState).map((parentId) => {
              const parentState = treeState[parentId];
              if (!parentState || !parentState.isExpanded || !parentState.children || parentState.children.length === 0) return null;

              const parentCoords = coordinates.find((c) => c.id === parentId);
              if (!parentCoords) return null;

              const pX = parentCoords.x + CARD_WIDTH / 2;
              const pY = parentCoords.y + 28; // precisely at bottom center of parent avatar

              // Find children coordinates
              const childCoords = parentState.children.map((child) =>
                coordinates.find((c) => c.id === child.memberId)
              ).filter(Boolean) as CoordinateNode[];

              if (childCoords.length === 0) return null;

              const midY = pY + (V_SPACING - 28) / 2;

              // Draw vertical drop stem from parent bottom to midY
              const stemPath = `M ${pX} ${pY} L ${pX} ${midY}`;

              // Draw horizontal connector bar spanning first to last child
              const xCoords = childCoords.map((c) => c.x + CARD_WIDTH / 2);
              const minX = Math.min(...xCoords);
              const maxX = Math.max(...xCoords);

              const barPath = `M ${minX} ${midY} L ${maxX} ${midY}`;

              return (
                <g key={`connectors-${parentId}`}>
                  {/* Parent vertical drop stem */}
                  <path d={stemPath} fill="none" stroke="#ffffff" strokeWidth="1.5" className="opacity-90" />

                  {/* Sibling horizontal bar */}
                  {childCoords.length > 1 && (
                    <path d={barPath} fill="none" stroke="#ffffff" strokeWidth="1.5" className="opacity-90" />
                  )}

                  {/* Individual vertical drops down to each child card */}
                  {childCoords.map((c) => {
                    const cx = c.x + CARD_WIDTH / 2;
                    const cy = c.y; // precisely at top center of child avatar
                    return (
                      <path
                        key={`line-${parentId}-${c.id}`}
                        d={`M ${cx} ${midY} L ${cx} ${cy}`}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="opacity-90"
                      />
                    );
                  })}
                </g>
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
            const isExpanded = treeState[item.id]?.isExpanded;
            const nodeData = item.node!;

            // Choose avatar background color based on status/active
            // Root is green/blue, active is blue, inactive is red
            const avatarBg = nodeData.isActive
              ? (item.id === rootId ? "bg-[#4CAF50]" : "bg-[#2196F3]")
              : "bg-[#F44336]";

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
                className="absolute flex flex-col items-center justify-start text-center cursor-pointer select-none group"
              >
                {/* User Avatar Circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-300 ${avatarBg} ${isTarget ? "ring-4 ring-yellow-400 animate-pulse" : "group-hover:scale-110"
                    }`}
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>

                {/* Member ID + Placement (L/R) label */}
                <span className="text-[9px] font-bold text-white mt-1 leading-none drop-shadow">
                  {nodeData.memberId} {nodeData.position ? `(${nodeData.position[0].toUpperCase()})` : ""}
                </span>

                {/* Full Name */}
                <span className="text-[9px] text-[#e0e0e0] mt-0.5 leading-none truncate max-w-[90px] drop-shadow">
                  {nodeData.fullName}
                </span>

                {/* Expand / Collapse trigger arrow */}
                {nodeData.hasChildren && (
                  <button
                    onClick={(e) => handleExpandToggle(e, nodeData)}
                    className="mt-1 w-3.5 h-3.5 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center transition-colors shadow-sm"
                  >
                    {isExpanded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating controls panel commented out
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
            onClick={handleZoomReset}
            className="p-2 rounded-lg text-ink-muted hover:text-white hover:bg-white/5 transition"
            title="Center Root"
          >
            <MapPin size={14} />
          </button>
        </div>
        */}
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
              <p className="text-xs text-ink-muted">Direct Network Size</p>
              <p className="font-bold text-neon-green text-lg mt-1">{selectedNode.stats?.leftTeamCount ?? 0}</p>
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
              <p className="text-xs text-ink-muted">Total Business</p>
              <p className="font-bold text-neon-cyan text-lg mt-1">${(selectedNode.stats?.totalBusiness ?? 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-ink-muted">
            <div className="bg-white/3 rounded-xl p-3 space-y-1">
              <p className="font-semibold text-white mb-1">Member Information</p>
              <p>Status: <span className={selectedNode.node.isActive ? "text-neon-green font-semibold" : "text-red-400 font-semibold"}>{selectedNode.node.isActive ? "Active" : "Inactive"}</span></p>
              <p>Rank Tier: <span className="text-white font-medium">{selectedNode.node.rank}</span></p>
              <p>Placement: <span className="text-white capitalize">{selectedNode.node.position || "Left"} side</span></p>
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.isActive ? "bg-neon-green/15 text-neon-green" : "bg-white/5 text-ink-muted"
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

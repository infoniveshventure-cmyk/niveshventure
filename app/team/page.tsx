"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Users, ChevronDown, ChevronRight, TrendingUp, ArrowLeft, RefreshCw } from "lucide-react";

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

function NodeCard({
  node,
  side,
  onClick,
  isRoot = false,
}: {
  node: TreeNode | null;
  side?: "left" | "right";
  onClick?: () => void;
  isRoot?: boolean;
}) {
  if (!node) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center w-36 min-h-[90px] rounded-2xl border-2 border-dashed border-white/15 bg-white/3 text-center p-3 ${
          isRoot ? "w-44 min-h-[110px]" : ""
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-1 text-ink-muted">+</div>
        <p className="text-[10px] text-ink-muted">Empty {side} slot</p>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center text-center w-36 rounded-2xl border transition-all duration-200 p-3 group ${
        isRoot
          ? "w-44 border-neon-cyan/50 bg-neon-cyan/5 shadow-[0_0_20px_rgba(0,229,255,0.1)]"
          : "border-white/15 bg-white/5 hover:border-neon-violet/50 hover:bg-neon-violet/5 hover:shadow-[0_0_15px_rgba(123,92,255,0.15)] cursor-pointer"
      }`}
    >
      {/* Active indicator */}
      <div
        className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-base-soft ${
          node.isActive ? "bg-neon-green" : "bg-gray-600"
        }`}
      />

      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full overflow-hidden mb-2 flex items-center justify-center text-sm font-bold text-white ${
          isRoot ? "w-12 h-12" : ""
        }`}
        style={{ background: "linear-gradient(135deg, #7B5CFF, #00E5FF)" }}
      >
        {node.fullName?.[0]?.toUpperCase() || "?"}
      </div>

      <p className={`font-semibold text-white leading-tight truncate w-full ${isRoot ? "text-sm" : "text-xs"}`}>
        {node.fullName}
      </p>
      <p className="text-[10px] text-ink-muted mt-0.5">{node.memberId}</p>
      <p className="text-[10px] text-neon-cyan mt-0.5">{node.rank}</p>

      {node.hasChildren && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-neon-violet">
          <Users size={9} /> {node.teamCount} members
        </div>
      )}

      {!isRoot && node.hasChildren && (
        <div className="mt-1 text-[10px] text-ink-muted opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
          Click to expand <ChevronDown size={8} />
        </div>
      )}
    </button>
  );
}

function StatsPanel({ node, stats }: { node: TreeNode; stats: TreeData["stats"] }) {
  return (
    <div className="glass-card p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-neon-cyan" />
        <h3 className="font-display font-semibold">
          Details: <span className="text-neon-cyan">{node.fullName}</span>
          <span className="text-ink-muted text-sm font-normal ml-2">({node.memberId})</span>
        </h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-ink-muted">Left Team</p>
          <p className="font-bold text-neon-green text-lg mt-1">{stats.leftTeamCount}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-ink-muted">Right Team</p>
          <p className="font-bold text-neon-violet text-lg mt-1">{stats.rightTeamCount}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-ink-muted">Total Network</p>
          <p className="font-bold text-white text-lg mt-1">{stats.totalTeam}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-ink-muted">Total Business</p>
          <p className="font-bold text-neon-cyan text-lg mt-1">${stats.totalBusiness.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-ink-muted">Left Business</p>
          <p className="font-bold text-neon-green mt-1">${stats.leftCurrentBusiness.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-ink-muted">Right Business</p>
          <p className="font-bold text-neon-violet mt-1">${stats.rightCurrentBusiness.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-ink-muted">Left Total Business</p>
          <p className="font-bold mt-1">${stats.leftTotalBusiness.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-ink-muted">Right Total Business</p>
          <p className="font-bold mt-1">${stats.rightTotalBusiness.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-ink-muted">
        <div className="bg-white/3 rounded-xl p-3">
          <p className="font-semibold text-white mb-1">Member Info</p>
          <p>Status: <span className={node.isActive ? "text-neon-green" : "text-neon-magenta"}>{node.isActive ? "Active" : "Inactive"}</span></p>
          <p>Rank: <span className="text-ink">{node.rank}</span></p>
          {node.createdAt && <p>Joined: <span className="text-ink">{new Date(node.createdAt).toLocaleDateString()}</span></p>}
        </div>
        <div className="bg-white/3 rounded-xl p-3">
          <p className="font-semibold text-white mb-1">Financial</p>
          <p>Wallet: <span className="text-neon-cyan">${(node.walletBalance || 0).toLocaleString()}</span></p>
          <p>Investment: <span className="text-neon-violet">${(node.totalInvestment || 0).toLocaleString()}</span></p>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRootId, setCurrentRootId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);
  const [directTeam, setDirectTeam] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<{ node: TreeNode; stats: TreeData["stats"] } | null>(null);

  const loadTree = useCallback(async (rootId?: string) => {
    setLoading(true);
    try {
      const url = rootId ? `/api/team/tree?rootId=${rootId}` : "/api/team/tree";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTreeData(data);
        setSelectedNode({ node: data.node, stats: data.stats });
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTree(currentRootId || undefined);
    // Load direct team separately
    fetch("/api/team", { cache: "no-store" }).then((r) => r.json()).then((d) => setDirectTeam(d.directTeam || []));
  }, [currentRootId, loadTree]);

  const navigateTo = (node: TreeNode) => {
    if (!node.hasChildren) {
      setSelectedNode({ node, stats: { leftTeamCount: 0, rightTeamCount: 0, totalTeam: 0, leftCurrentBusiness: 0, rightCurrentBusiness: 0, leftTotalBusiness: 0, rightTotalBusiness: 0, totalBusiness: 0 } });
      return;
    }
    setBreadcrumb((prev) => [
      ...prev,
      { id: treeData!.node.memberId, name: treeData!.node.fullName },
    ]);
    setCurrentRootId(node.memberId);
  };

  const navigateBack = (index: number) => {
    const targetId = index < 0 ? null : breadcrumb[index].id;
    setBreadcrumb((prev) => prev.slice(0, index < 0 ? 0 : index));
    setCurrentRootId(targetId);
  };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Users size={22} className="text-neon-cyan" /> My Network
        </h1>
        <button
          onClick={() => loadTree(currentRootId || undefined)}
          className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-ink-muted hover:border-white/25 flex items-center gap-1.5 transition"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button onClick={() => navigateBack(-1)} className="text-xs px-2 py-1 rounded border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 flex items-center gap-1 transition">
            <ArrowLeft size={11} /> Root
          </button>
          {breadcrumb.map((b, i) => (
            <button key={b.id} onClick={() => navigateBack(i)} className="text-xs px-2 py-1 rounded border border-white/10 text-ink-muted hover:border-white/25 flex items-center gap-1 transition">
              <ChevronRight size={11} /> {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Binary Tree Visualization */}
      <div className="glass-card p-6 overflow-x-auto">
        <h2 className="font-display font-semibold mb-6 text-center text-ink-muted text-sm uppercase tracking-wider">Binary Tree View</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : treeData ? (
          <div className="flex flex-col items-center gap-0 min-w-[400px]">
            {/* Root Node */}
            <div className="flex flex-col items-center">
              <NodeCard
                node={treeData.node}
                isRoot={true}
                onClick={() => setSelectedNode({ node: treeData.node, stats: treeData.stats })}
              />

              {/* Connector lines */}
              <div className="flex items-start gap-0 mt-0 relative">
                {/* Vertical line down */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-8 bg-gradient-to-b from-neon-cyan/50 to-white/10" />

                <div className="mt-8 flex items-start gap-32 relative">
                  {/* Horizontal connector */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-full bg-white/10" style={{ width: "calc(100% - 72px)" }} />

                  {/* Left branch */}
                  <div className="flex flex-col items-center gap-0 relative">
                    <div className="w-0.5 h-8 bg-white/10 mx-auto" />
                    <div className="mb-1 text-[10px] text-neon-green font-semibold uppercase tracking-wider">Left</div>
                    <NodeCard
                      node={treeData.left}
                      side="left"
                      onClick={treeData.left ? () => navigateTo(treeData.left!) : undefined}
                    />
                    {treeData.left && (
                      <div className="mt-2 text-[10px] text-ink-muted">{treeData.stats.leftTeamCount} in left team</div>
                    )}
                  </div>

                  {/* Right branch */}
                  <div className="flex flex-col items-center gap-0 relative">
                    <div className="w-0.5 h-8 bg-white/10 mx-auto" />
                    <div className="mb-1 text-[10px] text-neon-violet font-semibold uppercase tracking-wider">Right</div>
                    <NodeCard
                      node={treeData.right}
                      side="right"
                      onClick={treeData.right ? () => navigateTo(treeData.right!) : undefined}
                    />
                    {treeData.right && (
                      <div className="mt-2 text-[10px] text-ink-muted">{treeData.stats.rightTeamCount} in right team</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-muted text-center py-8">No tree data available.</p>
        )}
      </div>

      {/* Selected Node Stats */}
      {selectedNode && (
        <StatsPanel node={selectedNode.node} stats={selectedNode.stats} />
      )}

      {/* Direct Team Table */}
      <div className="glass-card p-5 mt-6">
        <h2 className="font-display font-semibold mb-4">Direct Team ({directTeam.length})</h2>
        {!directTeam.length ? (
          <p className="text-sm text-ink-muted py-8 text-center">No direct referrals yet. Share your QR code from My Profile.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted border-b border-white/10">
                  <th className="py-2 pr-4">Member</th>
                  <th className="py-2 pr-4">Position</th>
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Joined</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {directTeam.map((m: any) => (
                  <tr
                    key={m.memberId}
                    className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors cursor-pointer"
                    onClick={() => { setCurrentRootId(m.memberId); setBreadcrumb((prev) => treeData ? [...prev, { id: treeData.node.memberId, name: treeData.node.fullName }] : prev); }}
                  >
                    <td className="py-2.5 pr-4">
                      <p className="font-medium">{m.fullName}</p>
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

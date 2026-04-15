import { useState } from "react";
import { Plus, Search, Target, Zap, TrendingUp, Users } from "lucide-react";
import { useApp } from "../context/AppContext";
import BountyCard from "../components/BountyCard";
import CreateBountyModal from "../components/CreateBountyModal";

const CATEGORIES = ["All", "Frontend", "Backend", "DevOps", "Design", "QA", "Other"];
const STATUSES   = ["All", "Open", "Completed"];

export default function Dashboard() {
    const { bounties, wallet, submissions } = useApp();
    const [showCreate, setShowCreate]   = useState(false);
    const [search, setSearch]           = useState("");
    const [filterCat, setFilterCat]     = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");

    /* ── Stats ── */
    const openBounties   = bounties.filter((b) => b.status === "Open");
    const totalReward    = bounties.reduce((s, b) => s + b.reward, 0);
    const uniqueIssuers  = new Set(bounties.map((b) => b.issuer)).size;
    const uniqueSolvers  = new Set(
        Object.values(submissions).map((s) => s.solver)
    ).size;

    /* ── Filtered list ── */
    const filtered = bounties.filter((b) => {
        const matchSearch =
            !search.trim() ||
            b.title.toLowerCase().includes(search.toLowerCase()) ||
            b.description.toLowerCase().includes(search.toLowerCase());
        const matchCat    = filterCat    === "All" || b.category === filterCat;
        const matchStatus = filterStatus === "All" || b.status   === filterStatus;
        return matchSearch && matchCat && matchStatus;
    });

    return (
        <>
            <div className="space-y-8 animate-fade-in">

                {/* ── Hero ── */}
                <div className="relative overflow-hidden rounded-2xl bg-[#0f1629] border border-[#1e2d4a] px-8 py-10">
                    {/* decorative glow */}
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    Live on Stellar Testnet
                                </span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                                Temukan{" "}
                                <span className="text-amber-400">Bounty</span>
                                <br />
                                Buktikan Keahlianmu
                            </h1>
                            <p className="mt-3 text-slate-400 max-w-lg text-sm leading-relaxed">
                                Selesaikan tugas nyata, dapatkan reward XLM, dan kumpulkan{" "}
                                <span className="text-cyan-400 font-medium">Soulbound Badge</span>{" "}
                                sebagai portofolio on-chain yang tidak bisa dipalsukan.
                            </p>
                        </div>

                        {wallet ? (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="btn-primary shrink-0 text-sm px-5 py-3 shadow-lg shadow-amber-500/10"
                            >
                                <Plus className="w-4 h-4" />
                                Post Bounty
                            </button>
                        ) : (
                            <div className="shrink-0 text-center sm:text-right">
                                <p className="text-xs text-slate-500">Connect wallet untuk</p>
                                <p className="text-xs text-slate-400 font-medium">membuat atau mengerjakan bounty</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Stats row ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        {
                            icon: <Target className="w-4 h-4 text-amber-400" />,
                            label: "Total Bounties",
                            value: bounties.length,
                            bg: "bg-amber-500/5 border-amber-500/10",
                        },
                        {
                            icon: <Zap className="w-4 h-4 text-cyan-400" />,
                            label: "Total Reward Pool",
                            value: `${totalReward.toLocaleString()} XLM`,
                            bg: "bg-cyan-500/5 border-cyan-500/10",
                        },
                        {
                            icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
                            label: "Open Bounties",
                            value: openBounties.length,
                            bg: "bg-emerald-500/5 border-emerald-500/10",
                        },
                        {
                            icon: <Users className="w-4 h-4 text-violet-400" />,
                            label: "Active Hunters",
                            value: uniqueSolvers + uniqueIssuers,
                            bg: "bg-violet-500/5 border-violet-500/10",
                        },
                    ].map(({ icon, label, value, bg }) => (
                        <div key={label} className={`card flex items-center gap-3 px-4 py-3.5 border ${bg}`}>
                            <div className="w-8 h-8 rounded-lg bg-[#141d35] flex items-center justify-center shrink-0">
                                {icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 truncate">{label}</p>
                                <p className="text-base font-bold text-white truncate">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Filters ── */}
                <div className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                            className="input pl-10"
                            placeholder="Cari bounty berdasarkan judul atau deskripsi..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Category + Status chips */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex flex-wrap gap-1.5">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setFilterCat(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                                        filterCat === cat
                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                            : "bg-transparent text-slate-500 border-[#1e2d4a] hover:text-slate-300 hover:border-[#2a3d5e]"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-5 bg-[#1e2d4a] hidden sm:block" />

                        <div className="flex gap-1.5">
                            {STATUSES.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                                        filterStatus === s
                                            ? s === "Open"
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                : s === "Completed"
                                                ? "bg-slate-500/10 text-slate-400 border-slate-500/30"
                                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                            : "bg-transparent text-slate-500 border-[#1e2d4a] hover:text-slate-300 hover:border-[#2a3d5e]"
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Bounty grid ── */}
                {filtered.length > 0 ? (
                    <>
                        <p className="text-xs text-slate-600">
                            Menampilkan{" "}
                            <span className="text-slate-400 font-medium">{filtered.length}</span>{" "}
                            bounty
                            {filterCat !== "All" && <> di kategori <span className="text-amber-400">{filterCat}</span></>}
                            {filterStatus !== "All" && <> · status <span className="text-amber-400">{filterStatus}</span></>}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map((bounty) => (
                                <BountyCard key={bounty.id} bounty={bounty} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#141d35] border border-[#1e2d4a] flex items-center justify-center mb-4">
                            <Search className="w-7 h-7 text-slate-600" />
                        </div>
                        <h3 className="text-white font-semibold text-lg">Bounty tidak ditemukan</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-xs">
                            Coba ubah kata kunci pencarian atau filter kategori / status.
                        </p>
                        <button
                            onClick={() => { setSearch(""); setFilterCat("All"); setFilterStatus("All"); }}
                            className="btn-secondary mt-4 text-sm"
                        >
                            Reset Filter
                        </button>
                    </div>
                )}
            </div>

            {/* ── Modal ── */}
            {showCreate && <CreateBountyModal onClose={() => setShowCreate(false)} />}
        </>
    );
}

import { useParams, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
    Award,
    User,
    ExternalLink,
    Target,
    ArrowLeft,
    Shield,
    Zap,
    Copy,
    CheckCheck,
} from "lucide-react";
import { useState } from "react";

const CATEGORY_STYLES = {
    Backend:  { pill: "bg-violet-500/10 text-violet-400 border-violet-500/20", glow: "shadow-violet-500/10" },
    Frontend: { pill: "bg-blue-500/10  text-blue-400  border-blue-500/20",  glow: "shadow-blue-500/10"   },
    DevOps:   { pill: "bg-orange-500/10 text-orange-400 border-orange-500/20", glow: "shadow-orange-500/10" },
    Design:   { pill: "bg-pink-500/10  text-pink-400  border-pink-500/20",  glow: "shadow-pink-500/10"   },
    QA:       { pill: "bg-teal-500/10  text-teal-400  border-teal-500/20",  glow: "shadow-teal-500/10"   },
};

function shortAddr(addr) {
    if (!addr) return "—";
    return addr.slice(0, 8) + "..." + addr.slice(-6);
}

function formatDate(ts) {
    return new Date(ts).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function BadgeCard({ badge }) {
    const style = CATEGORY_STYLES[badge.category] ?? {
        pill: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        glow: "shadow-slate-500/10",
    };

    return (
        <div
            className={`relative group card p-5 flex flex-col gap-4 hover:border-amber-500/20 transition-all duration-300 shadow-lg ${style.glow} hover:shadow-amber-500/10 animate-slide-up`}
        >
            {/* Decorative glow */}
            <div className="absolute inset-0 rounded-xl bg-amber-500/0 group-hover:bg-amber-500/[0.02] transition-colors duration-300 pointer-events-none" />

            {/* Badge icon */}
            <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner group-hover:bg-amber-500/15 transition-colors">
                    <Award className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.pill}`}>
                        {badge.category}
                    </span>
                    <span className="text-xs text-slate-600 mono">#{badge.id}</span>
                </div>
            </div>

            {/* Badge info */}
            <div className="flex-1">
                <p className="text-xs font-medium text-amber-400/70 uppercase tracking-wider mb-1">
                    Soulbound Badge
                </p>
                <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">
                    {badge.title}
                </h3>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1e2d4a]">
                <span className="text-xs text-slate-600">
                    {formatDate(badge.issued_at)}
                </span>
                <Link
                    to={`/bounty/${badge.bounty_id}`}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-cyan-400 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    Bounty #{badge.bounty_id}
                    <ExternalLink className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-300 transition-colors px-2 py-1 rounded-md hover:bg-[#141d35]"
            title="Salin alamat"
        >
            {copied ? (
                <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                </>
            ) : (
                <>
                    <Copy className="w-3.5 h-3.5" />
                    Salin
                </>
            )}
        </button>
    );
}

export default function Profile() {
    const { address: paramAddr } = useParams();
    const { wallet, badges, bounties, submissions } = useApp();

    /* Resolve which address to show */
    const address = paramAddr ?? wallet;

    /* Not connected and no param */
    if (!address) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-[#141d35] border border-[#1e2d4a] flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-slate-600" />
                </div>
                <h2 className="text-white font-semibold text-xl">Wallet Belum Terhubung</h2>
                <p className="text-slate-500 text-sm mt-1 max-w-xs">
                    Hubungkan wallet untuk melihat koleksi Soulbound Badge kamu.
                </p>
                <Link to="/" className="btn-secondary mt-5 text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Dashboard
                </Link>
            </div>
        );
    }

    const isOwnProfile   = wallet && address === wallet;
    const earnedBadges   = badges[address] ?? [];

    /* Stats */
    const completedBounties = bounties.filter(
        (b) => b.status === "Completed" && submissions[b.id]?.solver === address
    );
    const postedBounties = bounties.filter((b) => b.issuer === address);
    const categoryCount  = [...new Set(earnedBadges.map((b) => b.category))].length;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-8">

            {/* Back (only for public profiles) */}
            {paramAddr && (
                <Link to="/" className="btn-ghost text-sm -ml-2 inline-flex">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                </Link>
            )}

            {/* ── Profile Header ── */}
            <div className="relative overflow-hidden card p-6 sm:p-8">
                {/* decorative */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-[#141d35] border-2 border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/5">
                            <User className="w-8 h-8 text-amber-400/60" />
                        </div>
                        {earnedBadges.length > 0 && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 border-2 border-[#0f1629] flex items-center justify-center">
                                <span className="text-[9px] font-bold text-black">{earnedBadges.length}</span>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        {isOwnProfile && (
                            <p className="text-xs font-medium text-amber-400 mb-1">My Profile</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="mono text-sm text-white font-medium truncate">
                                {shortAddr(address)}
                            </span>
                            <CopyButton text={address} />
                        </div>
                        <p className="mono text-xs text-slate-600 mt-1 truncate max-w-sm hidden sm:block">
                            {address}
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 sm:gap-6 text-center shrink-0">
                        <div>
                            <p className="text-xl font-extrabold text-amber-400">{earnedBadges.length}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Badges</p>
                        </div>
                        <div className="w-px bg-[#1e2d4a]" />
                        <div>
                            <p className="text-xl font-extrabold text-white">{completedBounties.length}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Selesai</p>
                        </div>
                        <div className="w-px bg-[#1e2d4a]" />
                        <div>
                            <p className="text-xl font-extrabold text-white">{postedBounties.length}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Diposting</p>
                        </div>
                    </div>
                </div>

                {/* Category tags */}
                {categoryCount > 0 && (
                    <div className="relative mt-5 pt-5 border-t border-[#1e2d4a] flex flex-wrap gap-2">
                        <span className="text-xs text-slate-500 self-center mr-1">Keahlian:</span>
                        {[...new Set(earnedBadges.map((b) => b.category))].map((cat) => {
                            const s = CATEGORY_STYLES[cat] ?? { pill: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
                            return (
                                <span key={cat} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.pill}`}>
                                    {cat}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Soulbound Badges ── */}
            <div>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Award className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white text-base">Soulbound Badges</h2>
                            <p className="text-xs text-slate-500">
                                {earnedBadges.length > 0
                                    ? `${earnedBadges.length} badge diperoleh · tidak dapat dipindahtangankan`
                                    : "Belum ada badge"}
                            </p>
                        </div>
                    </div>
                </div>

                {earnedBadges.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {earnedBadges.map((badge) => (
                            <BadgeCard key={badge.id} badge={badge} />
                        ))}
                    </div>
                ) : (
                    <div className="card flex flex-col items-center justify-center py-16 text-center gap-4 border-dashed">
                        <div className="w-14 h-14 rounded-2xl bg-[#141d35] border border-[#1e2d4a] flex items-center justify-center">
                            <Award className="w-6 h-6 text-slate-700" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">
                                {isOwnProfile ? "Belum Ada Badge" : "Hunter Ini Belum Punya Badge"}
                            </h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
                                {isOwnProfile
                                    ? "Selesaikan bounty pertamamu untuk mendapatkan Soulbound Badge sebagai bukti keahlianmu."
                                    : "Hunter ini belum menyelesaikan bounty apapun."}
                            </p>
                        </div>
                        {isOwnProfile && (
                            <Link to="/" className="btn-primary text-sm mt-1">
                                <Target className="w-4 h-4" />
                                Jelajahi Bounty
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* ── Activity: Bounties Posted ── */}
            {postedBounties.length > 0 && (
                <div>
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Target className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white text-base">Bounty Diposting</h2>
                            <p className="text-xs text-slate-500">{postedBounties.length} bounty dibuat</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {postedBounties.map((b) => {
                            const catStyle = CATEGORY_STYLES[b.category]?.pill ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
                            return (
                                <Link
                                    key={b.id}
                                    to={`/bounty/${b.id}`}
                                    className="card-hover flex items-center gap-4 px-4 py-3.5"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#141d35] flex items-center justify-center shrink-0">
                                        <Zap className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{b.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                            <span className={`inline-flex items-center px-2 py-0 rounded-full text-xs border ${catStyle}`}>
                                                {b.category}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-sm font-bold text-amber-400">
                                            {b.reward.toLocaleString()} XLM
                                        </span>
                                        {b.status === "Open" ? (
                                            <span className="badge-open">Open</span>
                                        ) : (
                                            <span className="badge-completed">Done</span>
                                        )}
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

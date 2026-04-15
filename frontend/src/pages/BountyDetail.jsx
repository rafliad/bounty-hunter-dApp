import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import {
    ArrowLeft,
    Zap,
    User,
    Clock,
    CheckCircle,
    Send,
    Shield,
    ExternalLink,
    Target,
    Tag,
    AlertCircle,
    Award,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import SubmitWorkModal from "../components/SubmitWorkModal";

const CATEGORY_STYLES = {
    Backend:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
    Frontend: "bg-blue-500/10  text-blue-400  border-blue-500/20",
    DevOps:   "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Design:   "bg-pink-500/10  text-pink-400  border-pink-500/20",
    QA:       "bg-teal-500/10  text-teal-400  border-teal-500/20",
};

function shortAddr(addr) {
    if (!addr) return "—";
    return addr.slice(0, 8) + "..." + addr.slice(-6);
}

function timeAgo(ts) {
    const diff  = Date.now() - ts;
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    const mins  = Math.floor(diff / 60000);
    if (days  > 0) return `${days} hari yang lalu`;
    if (hours > 0) return `${hours} jam yang lalu`;
    if (mins  > 0) return `${mins} menit yang lalu`;
    return "baru saja";
}

export default function BountyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { bounties, wallet, submissions, approveSubmission, badges } = useApp();

    const [showSubmit, setShowSubmit]     = useState(false);
    const [approving, setApproving]       = useState(false);
    const [approveSuccess, setApproveSuccess] = useState(false);

    const bounty     = bounties.find((b) => b.id === Number(id));
    const submission = submissions[Number(id)];

    if (!bounty) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-[#141d35] border border-[#1e2d4a] flex items-center justify-center mb-4">
                    <Target className="w-7 h-7 text-slate-600" />
                </div>
                <h2 className="text-white font-semibold text-xl">Bounty tidak ditemukan</h2>
                <p className="text-slate-500 text-sm mt-1">Bounty dengan ID #{id} tidak ada.</p>
                <Link to="/" className="btn-secondary mt-5 text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Dashboard
                </Link>
            </div>
        );
    }

    const isOwner    = wallet && wallet === bounty.issuer;
    const isOpen     = bounty.status === "Open";
    const hasSubmit  = !!submission;
    const canSubmit  = wallet && !isOwner && isOpen;
    const canApprove = isOwner && isOpen && hasSubmit;
    const alreadySubmitted = wallet && submission?.solver === wallet;

    const catStyle   = CATEGORY_STYLES[bounty.category] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";

    /* solver's earned badge for this bounty */
    const solverBadges = submission ? (badges[submission.solver] ?? []) : [];
    const earnedBadge  = solverBadges.find((b) => b.bounty_id === bounty.id);

    const handleApprove = async () => {
        setApproving(true);
        await new Promise((r) => setTimeout(r, 800));
        approveSubmission(bounty.id);
        setApproving(false);
        setApproveSuccess(true);
    };

    return (
        <>
            <div className="max-w-4xl mx-auto animate-fade-in space-y-6">

                {/* Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="btn-ghost text-sm -ml-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Left: Bounty Details ───────────────────── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Title card */}
                        <div className="card p-6 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${catStyle}`}>
                                    <Tag className="w-3 h-3 mr-1" />
                                    {bounty.category}
                                </span>
                                {isOpen ? (
                                    <span className="badge-open">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                        Open
                                    </span>
                                ) : (
                                    <span className="badge-completed">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
                                        Completed
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl font-bold text-white leading-snug">
                                {bounty.title}
                            </h1>

                            <div className="flex items-center gap-1.5">
                                <Zap className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                                <span className="text-2xl font-extrabold text-amber-400">
                                    {bounty.reward.toLocaleString()}
                                </span>
                                <span className="text-base text-slate-400 font-medium">XLM</span>
                                <span className="ml-2 text-xs text-slate-600 bg-[#141d35] border border-[#1e2d4a] px-2 py-0.5 rounded-full">
                                    Escrow terkunci
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="card p-6">
                            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                <Target className="w-4 h-4 text-slate-500" />
                                Deskripsi Tugas
                            </h2>
                            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                                {bounty.description}
                            </p>
                        </div>

                        {/* Meta */}
                        <div className="card p-5">
                            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-slate-500" />
                                Informasi Bounty
                            </h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-2.5 border-b border-[#1e2d4a]">
                                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" /> Issuer
                                    </span>
                                    <Link
                                        to={`/profile/${bounty.issuer}`}
                                        className="mono text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                                    >
                                        {shortAddr(bounty.issuer)}
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-2.5 border-b border-[#1e2d4a]">
                                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> Diposting
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {timeAgo(bounty.createdAt)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5" /> Reward
                                    </span>
                                    <span className="text-xs font-bold text-amber-400">
                                        {bounty.reward.toLocaleString()} XLM
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Submission display (if exists) */}
                        {hasSubmit && (
                            <div className="card p-5 border-cyan-500/20">
                                <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                    <Send className="w-4 h-4 text-cyan-400" />
                                    Submission Masuk
                                </h2>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between py-2.5 border-b border-[#1e2d4a]">
                                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" /> Solver
                                        </span>
                                        <Link
                                            to={`/profile/${submission.solver}`}
                                            className="mono text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                                        >
                                            {shortAddr(submission.solver)}
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>
                                    <div className="flex items-start justify-between py-2.5 gap-4">
                                        <span className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0">
                                            <ExternalLink className="w-3.5 h-3.5" /> Bukti Kerja
                                        </span>
                                        <a
                                            href={submission.proof_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2 truncate max-w-[220px]"
                                        >
                                            {submission.proof_url}
                                        </a>
                                    </div>
                                </div>

                                {/* Earned badge indicator */}
                                {earnedBadge && (
                                    <div className="mt-4 flex items-center gap-3 bg-amber-500/5 border border-amber-500/15 rounded-lg px-4 py-3">
                                        <Award className="w-5 h-5 text-amber-400 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-amber-400">Soulbound Badge Diterbitkan</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Badge #{earnedBadge.id} telah dikirim ke wallet solver sebagai bukti reputasi permanen.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Right: Action Panel ─────────────────────── */}
                    <div className="space-y-4">

                        {/* Not connected */}
                        {!wallet && (
                            <div className="card p-5 text-center space-y-3">
                                <div className="w-12 h-12 rounded-xl bg-[#141d35] border border-[#1e2d4a] flex items-center justify-center mx-auto">
                                    <Shield className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Connect Wallet</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Hubungkan wallet untuk mengerjakan bounty ini.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Owner view */}
                        {isOwner && (
                            <div className="card p-5 space-y-3 border-amber-500/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                                    </div>
                                    <span className="text-sm font-semibold text-white">Panel Issuer</span>
                                </div>
                                <p className="text-xs text-slate-500">Ini adalah bounty milikmu.</p>

                                {!hasSubmit && isOpen && (
                                    <div className="flex items-start gap-2.5 bg-[#141d35] rounded-lg px-3 py-3">
                                        <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-slate-500">
                                            Menunggu Solver mengirimkan bukti kerja...
                                        </p>
                                    </div>
                                )}

                                {canApprove && !approveSuccess && (
                                    <>
                                        <div className="flex items-start gap-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-3">
                                            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-slate-400">
                                                Ada submission masuk. Periksa bukti kerja dan setujui jika memenuhi syarat.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleApprove}
                                            disabled={approving}
                                            className="w-full btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {approving ? (
                                                <>
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                    </svg>
                                                    Memproses...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    Approve Submission
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}

                                {approveSuccess && (
                                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <Award className="w-6 h-6 text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">Bounty Selesai!</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Reward dicairkan &amp; Soulbound Badge diterbitkan ke solver.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!isOpen && !approveSuccess && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <CheckCircle className="w-4 h-4 text-slate-600" />
                                        Bounty ini sudah selesai.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Solver view */}
                        {canSubmit && (
                            <div className="card p-5 space-y-3 border-cyan-500/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                        <Send className="w-3.5 h-3.5 text-cyan-400" />
                                    </div>
                                    <span className="text-sm font-semibold text-white">Kerjakan Bounty</span>
                                </div>

                                <div className="bg-[#141d35] rounded-lg px-4 py-3 flex items-center justify-between">
                                    <span className="text-xs text-slate-500">Reward kamu</span>
                                    <span className="text-sm font-bold text-amber-400">
                                        {bounty.reward.toLocaleString()} XLM
                                    </span>
                                </div>

                                {alreadySubmitted ? (
                                    <div className="flex items-start gap-2.5 bg-cyan-500/5 border border-cyan-500/15 rounded-lg px-3 py-3">
                                        <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                                        <p className="text-xs text-slate-400">
                                            Kamu sudah mengirim submission. Menunggu review dari Issuer.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-slate-500">
                                            Selesaikan tugas ini dan kirimkan bukti kerjamu. Jika disetujui, reward dan Soulbound Badge akan dikirim ke wallet-mu.
                                        </p>
                                        <button
                                            onClick={() => setShowSubmit(true)}
                                            className="w-full btn-primary justify-center"
                                        >
                                            <Send className="w-4 h-4" />
                                            Submit Hasil Kerja
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Completed state for solver */}
                        {wallet && !isOwner && !isOpen && (
                            <div className="card p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-slate-500" />
                                    <span className="text-sm font-semibold text-slate-400">Bounty Selesai</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                    Bounty ini sudah selesai dikerjakan.
                                </p>
                                {earnedBadge && submission?.solver === wallet && (
                                    <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-3">
                                        <Award className="w-5 h-5 text-amber-400 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-amber-400">Badge kamu</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Soulbound Badge #{earnedBadge.id} ada di profilmu.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Soulbound info card */}
                        <div className="card p-4 bg-[#0a111e]">
                            <div className="flex items-start gap-3">
                                <Award className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-300">Soulbound Badge</p>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        Setiap bounty yang selesai menghasilkan badge permanen yang melekat pada identitas digitalmu dan tidak bisa dipindahkan.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showSubmit && (
                <SubmitWorkModal bounty={bounty} onClose={() => setShowSubmit(false)} />
            )}
        </>
    );
}

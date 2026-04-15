import { Link } from "react-router-dom";
import { Clock, User, ArrowRight, Zap } from "lucide-react";

const CATEGORY_STYLES = {
    Backend:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
    Frontend: "bg-blue-500/10  text-blue-400  border-blue-500/20",
    DevOps:   "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Design:   "bg-pink-500/10  text-pink-400  border-pink-500/20",
    QA:       "bg-teal-500/10  text-teal-400  border-teal-500/20",
};

function shortAddr(addr) {
    if (!addr) return "—";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (days  > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins  > 0) return `${mins}m ago`;
    return "just now";
}

export default function BountyCard({ bounty }) {
    const { id, title, description, category, reward, issuer, status, createdAt } = bounty;
    const catStyle = CATEGORY_STYLES[category] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
    const isOpen   = status === "Open";

    return (
        <Link
            to={`/bounty/${id}`}
            className="group card-hover flex flex-col gap-4 p-5 cursor-pointer animate-slide-up"
        >
            {/* top row: category + status */}
            <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${catStyle}`}>
                    {category}
                </span>
                {isOpen ? (
                    <span className="badge-open">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        Open
                    </span>
                ) : (
                    <span className="badge-completed">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
                        Completed
                    </span>
                )}
            </div>

            {/* title */}
            <div>
                <h3 className="font-semibold text-white text-base leading-snug group-hover:text-amber-400 transition-colors line-clamp-2">
                    {title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {description}
                </p>
            </div>

            {/* reward */}
            <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span className="text-lg font-bold text-amber-400">{reward.toLocaleString()}</span>
                <span className="text-sm text-slate-500 font-medium">XLM</span>
            </div>

            {/* footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1e2d4a] mt-auto">
                <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="mono">{shortAddr(issuer)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(createdAt)}
                    </span>
                </div>
                <span className="flex items-center gap-1 text-xs text-slate-600 group-hover:text-amber-400 transition-colors font-medium">
                    View <ArrowRight className="w-3.5 h-3.5" />
                </span>
            </div>
        </Link>
    );
}

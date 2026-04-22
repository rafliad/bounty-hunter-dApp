import { useState } from "react";
import { X, Target, Zap, FileText, Tag, DollarSign } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

const CATEGORIES = ["Frontend", "Backend", "DevOps", "Design", "QA", "Other"];

const CATEGORY_STYLES = {
    Frontend: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    Backend:  "bg-violet-500/10 text-violet-400 border-violet-500/30",
    DevOps:   "bg-orange-500/10 text-orange-400 border-orange-500/30",
    Design:   "bg-pink-500/10 text-pink-400 border-pink-500/30",
    QA:       "bg-teal-500/10 text-teal-400 border-teal-500/30",
    Other:    "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

export default function CreateBountyModal({ onClose }) {
    const { createBounty } = useApp();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "Frontend",
        reward: "",
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const validate = () => {
        const errs = {};
        if (!form.title.trim()) errs.title = "Judul wajib diisi";
        if (form.title.trim().length > 80) errs.title = "Judul maksimal 80 karakter";
        if (!form.description.trim()) errs.description = "Deskripsi wajib diisi";
        if (!form.reward || isNaN(form.reward) || Number(form.reward) <= 0)
            errs.reward = "Reward harus berupa angka positif";
        if (Number(form.reward) > 1_000_000)
            errs.reward = "Reward maksimal 1.000.000 XLM";
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setLoading(true);
        try {
            const id = await createBounty(form);
            onClose();
            if (id) {
                navigate(`/bounty/${id}`);
            } else {
                navigate("/");
            }
        } catch (err) {
            // txError is set in AppContext, no extra handling needed here
            console.error("[CreateBountyModal] TX failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Panel */}
            <div className="relative w-full max-w-lg bg-[#0f1629] border border-[#1e2d4a] rounded-2xl shadow-2xl shadow-black/60 animate-scale-in overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d4a]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Target className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white text-sm">Post Bounty Baru</h2>
                            <p className="text-xs text-slate-500">Dana akan dikunci sebagai escrow</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-[#141d35] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Title */}
                    <div>
                        <label className="label flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Judul Tugas
                        </label>
                        <input
                            className="input"
                            placeholder="cth. Fix Login Bug di API Endpoint"
                            value={form.title}
                            onChange={set("title")}
                            maxLength={80}
                        />
                        <div className="flex justify-between mt-1">
                            {errors.title ? (
                                <p className="text-xs text-red-400">{errors.title}</p>
                            ) : <span />}
                            <p className="text-xs text-slate-600 ml-auto">{form.title.length}/80</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="label flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Deskripsi Lengkap
                        </label>
                        <textarea
                            className="textarea"
                            rows={4}
                            placeholder="Jelaskan detail tugas, requirement teknis, dan kriteria penerimaan hasil kerja..."
                            value={form.description}
                            onChange={set("description")}
                        />
                        {errors.description && (
                            <p className="text-xs text-red-400 mt-1">{errors.description}</p>
                        )}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="label flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-slate-500" />
                            Kategori
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setForm((p) => ({ ...p, category: cat }))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                                        form.category === cat
                                            ? CATEGORY_STYLES[cat]
                                            : "bg-transparent text-slate-500 border-[#1e2d4a] hover:border-[#2a3d5e] hover:text-slate-300"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reward */}
                    <div>
                        <label className="label flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                            Reward (XLM)
                        </label>
                        <div className="relative">
                            <input
                                className="input pr-16"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="500"
                                value={form.reward}
                                onChange={set("reward")}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-amber-400 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                XLM
                            </span>
                        </div>
                        {errors.reward ? (
                            <p className="text-xs text-red-400 mt-1">{errors.reward}</p>
                        ) : (
                            <p className="text-xs text-slate-600 mt-1">
                                Dana akan dikunci dalam escrow hingga bounty diselesaikan
                            </p>
                        )}
                    </div>

                    {/* Escrow notice */}
                    <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 rounded-lg px-4 py-3">
                        <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Dengan memposting bounty ini, kamu menyetujui bahwa{" "}
                            <span className="text-amber-400 font-medium">
                                {form.reward ? Number(form.reward).toLocaleString() : "0"} XLM
                            </span>{" "}
                            akan dikunci sebagai escrow dan hanya dicairkan setelah kamu menyetujui hasil kerja Solver.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <Target className="w-4 h-4" />
                                    Post Bounty
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

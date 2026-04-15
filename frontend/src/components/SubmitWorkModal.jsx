import { useState } from "react";
import { X, Send, Link2, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function SubmitWorkModal({ bounty, onClose }) {
    const { submitWork } = useApp();

    const [proofUrl, setProofUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    const validate = () => {
        if (!proofUrl.trim()) return "URL bukti kerja wajib diisi";
        try {
            new URL(proofUrl.trim());
        } catch {
            return "Masukkan URL yang valid (cth. https://github.com/...)";
        }
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) { setError(err); return; }
        setError("");
        setLoading(true);
        await new Promise((r) => setTimeout(r, 700));
        submitWork({ bounty_id: bounty.id, proof_url: proofUrl.trim() });
        setLoading(false);
        setDone(true);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative w-full max-w-md bg-[#0f1629] border border-[#1e2d4a] rounded-2xl shadow-2xl shadow-black/60 animate-scale-in overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d4a]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Send className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white text-sm">Submit Hasil Kerja</h2>
                            <p className="text-xs text-slate-500 truncate max-w-[220px]">{bounty.title}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-[#141d35] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {done ? (
                    /* Success state */
                    <div className="p-8 flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Send className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-lg">Submission Terkirim!</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Issuer akan mereview hasil kerjamu. Jika disetujui, reward dan Soulbound Badge akan otomatis diterbitkan ke wallet-mu.
                            </p>
                        </div>
                        <button onClick={onClose} className="btn-primary mt-2">
                            Tutup
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">

                        {/* Bounty info */}
                        <div className="flex items-center justify-between bg-[#141d35] rounded-lg px-4 py-3">
                            <span className="text-xs text-slate-500">Reward</span>
                            <span className="text-sm font-bold text-amber-400">
                                {bounty.reward.toLocaleString()} XLM
                            </span>
                        </div>

                        {/* Proof URL */}
                        <div>
                            <label className="label flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                                URL Bukti Kerja
                            </label>
                            <input
                                className="input"
                                type="text"
                                placeholder="https://github.com/username/repo"
                                value={proofUrl}
                                onChange={(e) => {
                                    setProofUrl(e.target.value);
                                    if (error) setError("");
                                }}
                            />
                            {error && (
                                <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    {error}
                                </p>
                            )}
                            <p className="text-xs text-slate-600 mt-1.5">
                                Link ke repository, pull request, dokumen teknis, atau demo live
                            </p>
                        </div>

                        {/* Notice */}
                        <div className="flex items-start gap-3 bg-cyan-500/5 border border-cyan-500/15 rounded-lg px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Pastikan link dapat diakses oleh Issuer. Jika Issuer menyetujui,{" "}
                                <span className="text-cyan-400 font-medium">Soulbound Badge</span>{" "}
                                akan otomatis diterbitkan ke wallet-mu sebagai bukti reputasi permanen.
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
                                        Mengirim...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Kirim Submission
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

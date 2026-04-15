import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Target, Wallet, LogOut, User, ChevronDown } from "lucide-react";
import { useState } from "react";

function shortAddr(addr) {
    if (!addr) return "";
    return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export default function Header() {
    const { wallet, connectWallet, disconnectWallet } = useApp();
    const location = useLocation();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    return (
        <header className="sticky top-0 z-40 border-b border-[#1e2d4a] bg-[#080d18]/90 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                            <Target className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="font-bold text-white tracking-tight">
                            Bounty<span className="text-amber-400">Hunter</span>
                        </span>
                    </Link>

                    {/* Nav links */}
                    <nav className="hidden sm:flex items-center gap-1">
                        <Link
                            to="/"
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                                isActive("/")
                                    ? "bg-[#141d35] text-white"
                                    : "text-slate-400 hover:text-white hover:bg-[#141d35]"
                            }`}
                        >
                            Bounties
                        </Link>
                        {wallet && (
                            <Link
                                to="/profile"
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                                    isActive("/profile")
                                        ? "bg-[#141d35] text-white"
                                        : "text-slate-400 hover:text-white hover:bg-[#141d35]"
                                }`}
                            >
                                My Badges
                            </Link>
                        )}
                    </nav>

                    {/* Wallet area */}
                    <div className="flex items-center gap-3">
                        {wallet ? (
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen((v) => !v)}
                                    className="flex items-center gap-2 bg-[#0f1629] hover:bg-[#141d35] border border-[#1e2d4a] hover:border-[#2a3d5e] text-white px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium"
                                >
                                    <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                        <User className="w-3 h-3 text-amber-400" />
                                    </div>
                                    <span className="font-mono text-xs text-slate-300">
                                        {shortAddr(wallet)}
                                    </span>
                                    <ChevronDown
                                        className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${
                                            dropdownOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>

                                {dropdownOpen && (
                                    <>
                                        {/* backdrop */}
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setDropdownOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-52 bg-[#0f1629] border border-[#1e2d4a] rounded-xl shadow-2xl shadow-black/50 z-20 animate-scale-in overflow-hidden">
                                            <div className="px-4 py-3 border-b border-[#1e2d4a]">
                                                <p className="text-xs text-slate-500 mb-1">Connected as</p>
                                                <p className="font-mono text-xs text-amber-400 truncate">{wallet}</p>
                                            </div>
                                            <div className="p-1.5">
                                                <Link
                                                    to="/profile"
                                                    onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-[#141d35] transition-colors"
                                                >
                                                    <User className="w-4 h-4" />
                                                    My Profile
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        disconnectWallet();
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Disconnect
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={connectWallet}
                                className="btn-primary text-sm"
                            >
                                <Wallet className="w-4 h-4" />
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

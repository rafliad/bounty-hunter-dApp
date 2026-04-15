import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import {
    connectFreighter,
    getActiveAddress,
    isFreighterInstalled,
    FreighterError,
} from "../stellar/freighter";

const AppContext = createContext(null);

// ── Seed addresses ───────────────────────────────────────────────
const ADDR_ALICE = "GBWHTX2JY3B5G5RLZPNOWV6QNQJYQMWT3CXFCV4WUQY7AYHEPZNYX2";
const ADDR_BOB = "GCXYZ9KQWERTYUIOPLKJHGFDSAZXCVBNM1234567890QWERTYUIOPAS";
const ADDR_CAROL = "GDABC7LMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXY";

// ── Seed data ────────────────────────────────────────────────────
const SEED_BOUNTIES = [
    {
        id: 1,
        title: "Fix JWT Authentication Bug",
        description:
            "Ada bug pada sistem autentikasi JWT dimana token tidak expire dengan benar setelah logout. Perlu diperbaiki di layer middleware Express.js dan pastikan semua test suite tetap passing setelah perubahan.",
        category: "Backend",
        reward: 500,
        issuer: ADDR_ALICE,
        status: "Open",
        createdAt: Date.now() - 86400000 * 2,
    },
    {
        id: 2,
        title: "Build Responsive Dashboard UI",
        description:
            "Buat halaman dashboard yang sepenuhnya responsif menggunakan React dan Tailwind CSS. Harus support tampilan mobile hingga desktop. Komponen yang dibutuhkan: sidebar, topbar, stats card, dan chart placeholder.",
        category: "Frontend",
        reward: 300,
        issuer: ADDR_BOB,
        status: "Open",
        createdAt: Date.now() - 86400000 * 1,
    },
    {
        id: 3,
        title: "Setup CI/CD Pipeline",
        description:
            "Konfigurasi GitHub Actions untuk automated testing, linting, dan deployment ke staging environment setiap kali ada push ke branch main. Sertakan badge status di README.",
        category: "DevOps",
        reward: 750,
        issuer: ADDR_ALICE,
        status: "Completed",
        createdAt: Date.now() - 86400000 * 5,
    },
    {
        id: 4,
        title: "Design System Component Library",
        description:
            "Buat design system lengkap dengan komponen Button, Input, Modal, Card, Badge, dan Tooltip yang konsisten. Dokumentasikan setiap komponen dengan Storybook.",
        category: "Design",
        reward: 400,
        issuer: ADDR_BOB,
        status: "Open",
        createdAt: Date.now() - 86400000 * 3,
    },
    {
        id: 5,
        title: "Optimize Database Query Performance",
        description:
            "Beberapa endpoint API memiliki query N+1 yang membuat response time lambat. Identifikasi semua query bermasalah dan optimasi menggunakan eager loading dan indexing yang tepat.",
        category: "Backend",
        reward: 600,
        issuer: ADDR_CAROL,
        status: "Open",
        createdAt: Date.now() - 86400000 * 0.5,
    },
    {
        id: 6,
        title: "Write E2E Test Suite",
        description:
            "Tulis end-to-end test menggunakan Playwright untuk semua user flow utama: register, login, checkout, dan dashboard. Target coverage minimal 80%.",
        category: "QA",
        reward: 350,
        issuer: ADDR_CAROL,
        status: "Open",
        createdAt: Date.now() - 86400000 * 4,
    },
];

const SEED_SUBMISSIONS = {
    3: {
        bounty_id: 3,
        solver: ADDR_BOB,
        proof_url: "https://github.com/bobdev/ci-cd-pipeline-setup",
    },
};

const SEED_BADGES = {
    [ADDR_BOB]: [
        {
            id: 1,
            bounty_id: 3,
            title: "Setup CI/CD Pipeline",
            category: "DevOps",
            issued_at: Date.now() - 86400000 * 4,
        },
    ],
};

// ── Provider ─────────────────────────────────────────────────────
export function AppProvider({ children }) {
    // Wallet state
    const [wallet, setWallet] = useState(null);
    const [walletLoading, setWalletLoading] = useState(true); // true while checking on mount
    const [walletError, setWalletError] = useState(null); // FreighterError | null
    const [freighterReady, setFreighterReady] = useState(false); // extension detected

    // App state (will be replaced by on-chain reads in layer 3 & 4)
    const [bounties, setBounties] = useState(SEED_BOUNTIES);
    const [submissions, setSubmissions] = useState(SEED_SUBMISSIONS);
    const [badges, setBadges] = useState(SEED_BADGES);
    const [nextBountyId, setNextBountyId] = useState(7);
    const [nextBadgeId, setNextBadgeId] = useState(2);

    // ── On mount: detect Freighter & restore session ──────────────
    useEffect(() => {
        async function init() {
            setWalletLoading(true);
            try {
                const installed = await isFreighterInstalled();
                setFreighterReady(installed);

                if (installed) {
                    // Silently restore previous session if permission still granted
                    const addr = await getActiveAddress();
                    if (addr) {
                        setWallet(addr);
                        localStorage.setItem("bh_wallet", addr);
                    } else {
                        // No active session — check if we had one cached
                        // (user may have disconnected Freighter externally)
                        const cached = localStorage.getItem("bh_wallet");
                        if (cached) {
                            // Permission revoked — clear stale cache
                            localStorage.removeItem("bh_wallet");
                        }
                    }
                }
            } catch (err) {
                console.warn("[AppContext] init error:", err);
            } finally {
                setWalletLoading(false);
            }
        }

        init();
    }, []);

    // ── Wallet actions ────────────────────────────────────────────
    const connectWallet = useCallback(async () => {
        setWalletError(null);
        setWalletLoading(true);
        try {
            const addr = await connectFreighter();
            setWallet(addr);
            localStorage.setItem("bh_wallet", addr);
        } catch (err) {
            if (err instanceof FreighterError) {
                setWalletError(err);
            } else {
                setWalletError(
                    new FreighterError(
                        "UNKNOWN",
                        "Terjadi kesalahan tak terduga saat menghubungkan wallet.",
                    ),
                );
            }
        } finally {
            setWalletLoading(false);
        }
    }, []);

    const disconnectWallet = useCallback(() => {
        setWallet(null);
        setWalletError(null);
        localStorage.removeItem("bh_wallet");
    }, []);

    const clearWalletError = useCallback(() => setWalletError(null), []);

    // ── Bounty actions (local state — replaced in layer 3) ────────
    const createBounty = useCallback(
        ({ title, description, category, reward }) => {
            const bounty = {
                id: nextBountyId,
                title,
                description,
                category,
                reward: Number(reward),
                issuer: wallet,
                status: "Open",
                createdAt: Date.now(),
            };
            setBounties((prev) => [bounty, ...prev]);
            setNextBountyId((prev) => prev + 1);
            return bounty.id;
        },
        [nextBountyId, wallet],
    );

    const submitWork = useCallback(
        ({ bounty_id, proof_url }) => {
            setSubmissions((prev) => ({
                ...prev,
                [bounty_id]: { bounty_id, solver: wallet, proof_url },
            }));
        },
        [wallet],
    );

    const approveSubmission = useCallback(
        (bounty_id) => {
            const bounty = bounties.find((b) => b.id === bounty_id);
            const submission = submissions[bounty_id];
            if (!bounty || !submission) return;

            setBounties((prev) =>
                prev.map((b) =>
                    b.id === bounty_id ? { ...b, status: "Completed" } : b,
                ),
            );

            const badge = {
                id: nextBadgeId,
                bounty_id,
                title: bounty.title,
                category: bounty.category,
                issued_at: Date.now(),
            };

            setBadges((prev) => ({
                ...prev,
                [submission.solver]: [
                    ...(prev[submission.solver] ?? []),
                    badge,
                ],
            }));
            setNextBadgeId((prev) => prev + 1);
        },
        [bounties, submissions, nextBadgeId],
    );

    // ── Context value ─────────────────────────────────────────────
    return (
        <AppContext.Provider
            value={{
                // wallet
                wallet,
                walletLoading,
                walletError,
                freighterReady,
                connectWallet,
                disconnectWallet,
                clearWalletError,
                // data
                bounties,
                createBounty,
                submissions,
                submitWork,
                badges,
                approveSubmission,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);

import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext(null);

const ADDR_ALICE = "GBWHTX2JY3B5G5RLZPNOWV6QNQJYQMWT3CXFCV4WUQY7AYHEPZNYX2";
const ADDR_BOB = "GCXYZ9KQWERTYUIOPLKJHGFDSAZXCVBNM1234567890QWERTYUIOPAS";
const ADDR_CAROL = "GDABC7LMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXY";

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

function generateAddress() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let addr = "G";
    for (let i = 0; i < 55; i++) {
        addr += chars[Math.floor(Math.random() * chars.length)];
    }
    return addr;
}

export function AppProvider({ children }) {
    const [wallet, setWallet] = useState(null);
    const [bounties, setBounties] = useState(SEED_BOUNTIES);
    const [submissions, setSubmissions] = useState(SEED_SUBMISSIONS);
    const [badges, setBadges] = useState(SEED_BADGES);
    const [nextBountyId, setNextBountyId] = useState(7);
    const [nextBadgeId, setNextBadgeId] = useState(2);

    useEffect(() => {
        const saved = localStorage.getItem("bh_wallet");
        if (saved) setWallet(saved);
    }, []);

    const connectWallet = () => {
        const addr = generateAddress();
        localStorage.setItem("bh_wallet", addr);
        setWallet(addr);
    };

    const disconnectWallet = () => {
        localStorage.removeItem("bh_wallet");
        setWallet(null);
    };

    const createBounty = ({ title, description, category, reward }) => {
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
    };

    const submitWork = ({ bounty_id, proof_url }) => {
        setSubmissions((prev) => ({
            ...prev,
            [bounty_id]: { bounty_id, solver: wallet, proof_url },
        }));
    };

    const approveSubmission = (bounty_id) => {
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
            [submission.solver]: [...(prev[submission.solver] || []), badge],
        }));
        setNextBadgeId((prev) => prev + 1);
    };

    return (
        <AppContext.Provider
            value={{
                wallet,
                connectWallet,
                disconnectWallet,
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

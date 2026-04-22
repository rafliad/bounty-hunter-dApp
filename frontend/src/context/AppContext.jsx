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
    signTx,
} from "../stellar/freighter";
import {
    fetchBounties,
    fetchSubmission,
    fetchBadges,
    buildCreateBountyTx,
    buildSubmitWorkTx,
    buildApproveSubmissionTx,
    submitTransaction,
    ContractCallError,
} from "../stellar/contract";
import { scValToNative } from "@stellar/stellar-sdk";

const AppContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────
export function AppProvider({ children }) {
    // Wallet state
    const [wallet, setWallet] = useState(null);
    const [walletLoading, setWalletLoading] = useState(true);
    const [walletError, setWalletError] = useState(null);
    const [freighterReady, setFreighterReady] = useState(false);

    // On-chain data state
    const [bounties, setBounties] = useState([]);
    const [submissions, setSubmissions] = useState({});
    const [badges, setBadges] = useState({});

    // Loading / error state
    const [bountyLoading, setBountyLoading] = useState(true);
    const [txLoading, setTxLoading] = useState(false);
    const [txError, setTxError] = useState(null);

    // ── On mount: detect Freighter, restore session, load bounties ──
    useEffect(() => {
        async function init() {
            setWalletLoading(true);
            try {
                const installed = await isFreighterInstalled();
                setFreighterReady(installed);

                if (installed) {
                    const addr = await getActiveAddress();
                    if (addr) {
                        setWallet(addr);
                        localStorage.setItem("bh_wallet", addr);
                    } else {
                        const cached = localStorage.getItem("bh_wallet");
                        if (cached) localStorage.removeItem("bh_wallet");
                    }
                }
            } catch (err) {
                console.warn("[AppContext] init error:", err);
            } finally {
                setWalletLoading(false);
            }
        }

        init();
        loadBounties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Data loaders ─────────────────────────────────────────────
    const loadBounties = useCallback(async () => {
        setBountyLoading(true);
        try {
            const data = await fetchBounties();
            setBounties(data);
        } catch (err) {
            console.error("[AppContext] loadBounties:", err);
        } finally {
            setBountyLoading(false);
        }
    }, []);

    /** Fetch submission for a single bounty and cache it in state */
    const loadSubmission = useCallback(async (bountyId) => {
        try {
            const sub = await fetchSubmission(Number(bountyId));
            setSubmissions((prev) => ({
                ...prev,
                [Number(bountyId)]: sub ?? undefined,
            }));
        } catch (err) {
            console.error("[AppContext] loadSubmission:", err);
        }
    }, []);

    /** Fetch badges for a given address and cache them in state */
    const loadBadges = useCallback(async (address) => {
        if (!address) return;
        try {
            const data = await fetchBadges(address);
            setBadges((prev) => ({ ...prev, [address]: data }));
        } catch (err) {
            console.error("[AppContext] loadBadges:", err);
        }
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
            setWalletError(
                err instanceof FreighterError
                    ? err
                    : new FreighterError("UNKNOWN", "Terjadi kesalahan tak terduga saat menghubungkan wallet.")
            );
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
    const clearTxError = useCallback(() => setTxError(null), []);

    // ── TX helper ─────────────────────────────────────────────────
    /** Generic wrapper: build XDR → sign via Freighter → submit → wait */
    const runTx = useCallback(async (buildFn) => {
        setTxLoading(true);
        setTxError(null);
        try {
            const xdr = await buildFn();
            const signedXdr = await signTx(xdr, wallet);
            return await submitTransaction(signedXdr);
        } catch (err) {
            const msg =
                err instanceof ContractCallError || err instanceof FreighterError
                    ? err.message
                    : "Transaksi gagal. Coba lagi.";
            setTxError(msg);
            throw err;
        } finally {
            setTxLoading(false);
        }
    }, [wallet]);

    // ── Bounty actions — Task 3.2 ─────────────────────────────────
    const createBounty = useCallback(
        async ({ title, description, category, reward }) => {
            if (!wallet) throw new Error("Wallet tidak terhubung");
            const { returnValue } = await runTx(() =>
                buildCreateBountyTx(wallet, title, description, category, Number(reward))
            );
            // Parse new bounty ID from contract return value
            let newId = null;
            if (returnValue) {
                try { newId = Number(scValToNative(returnValue)); } catch { /* ignored */ }
            }
            await loadBounties();
            return newId;
        },
        [wallet, runTx, loadBounties]
    );

    // ── Submit work — Task 3.3 ────────────────────────────────────
    const submitWork = useCallback(
        async ({ bounty_id, proof_url }) => {
            if (!wallet) throw new Error("Wallet tidak terhubung");
            await runTx(() => buildSubmitWorkTx(wallet, bounty_id, proof_url));
            await loadSubmission(bounty_id);
        },
        [wallet, runTx, loadSubmission]
    );

    // ── Approve submission — Task 3.4 ─────────────────────────────
    const approveSubmission = useCallback(
        async (bounty_id) => {
            if (!wallet) throw new Error("Wallet tidak terhubung");
            await runTx(() => buildApproveSubmissionTx(wallet, bounty_id));
            // Refresh bounty status + solver's badges
            await loadBounties();
            const sub = submissions[Number(bounty_id)];
            if (sub?.solver) await loadBadges(sub.solver);
        },
        [wallet, runTx, loadBounties, loadBadges, submissions]
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
                // on-chain data
                bounties,
                bountyLoading,
                submissions,
                badges,
                // tx state
                txLoading,
                txError,
                clearTxError,
                // write actions
                createBounty,
                submitWork,
                approveSubmission,
                // loaders (called by pages)
                loadBounties,
                loadSubmission,
                loadBadges,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);

import {
    isConnected,
    isAllowed,
    requestAccess,
    getAddress,
    getNetwork,
    signTransaction,
} from "@stellar/freighter-api";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const TESTNET_RPC_URL    = "https://soroban-testnet.stellar.org";

// ── Detection ───────────────────────────────────────────────────

/**
 * Check whether the Freighter extension is installed in the browser.
 * Returns true/false (never throws).
 */
export async function isFreighterInstalled() {
    try {
        const result = await isConnected();
        // freighter-api v2+ returns { isConnected: bool }
        if (typeof result === "object" && result !== null) {
            return result.isConnected === true;
        }
        return result === true;
    } catch {
        return false;
    }
}

/**
 * Check whether the user has already granted access to this dApp.
 */
export async function isFreighterAllowed() {
    try {
        const result = await isAllowed();
        if (typeof result === "object" && result !== null) {
            return result.isAllowed === true;
        }
        return result === true;
    } catch {
        return false;
    }
}

// ── Connection ───────────────────────────────────────────────────

/**
 * Request wallet access and return the user's public key.
 *
 * @throws {FreighterError} with a human-readable `message`
 */
export async function connectFreighter() {
    const installed = await isFreighterInstalled();
    if (!installed) {
        throw new FreighterError(
            "NOT_INSTALLED",
            "Freighter belum terinstall. Pasang ekstensinya di https://freighter.app lalu refresh halaman ini.",
        );
    }

    // Ask for permission (no-op if already granted)
    const accessResult = await requestAccess();
    if (accessResult?.error) {
        throw new FreighterError("ACCESS_DENIED", "Akses ke Freighter ditolak oleh pengguna.");
    }

    // Fetch the public key
    const addrResult = await getAddress();
    if (addrResult?.error || !addrResult?.address) {
        throw new FreighterError(
            "NO_ADDRESS",
            "Tidak bisa membaca alamat wallet. Coba buka Freighter dan pastikan akun aktif.",
        );
    }

    // Verify network
    await assertTestnet();

    return addrResult.address;
}

/**
 * Retrieve the currently active public key without requesting new access.
 * Returns null if not connected / no permission.
 */
export async function getActiveAddress() {
    try {
        const allowed = await isFreighterAllowed();
        if (!allowed) return null;

        const result = await getAddress();
        return result?.address ?? null;
    } catch {
        return null;
    }
}

// ── Network guard ────────────────────────────────────────────────

/**
 * Throw a FreighterError if the wallet is NOT set to Stellar Testnet.
 */
export async function assertTestnet() {
    try {
        const result = await getNetwork();
        const passphrase =
            typeof result === "object" ? result.networkPassphrase : result;

        if (passphrase && passphrase !== TESTNET_PASSPHRASE) {
            throw new FreighterError(
                "WRONG_NETWORK",
                `Wallet kamu terhubung ke jaringan yang salah.\n` +
                `Dibutuhkan: Testnet\n` +
                `Aktif saat ini: ${passphrase}\n\n` +
                `Ganti jaringan ke "Test SDF Network" di pengaturan Freighter.`,
            );
        }
    } catch (err) {
        if (err instanceof FreighterError) throw err;
        // getNetwork() may fail on older versions — treat as warning only
    }
}

// ── Transaction signing ──────────────────────────────────────────

/**
 * Sign a Stellar transaction XDR string via Freighter.
 *
 * @param {string} xdr          - Base64-encoded transaction XDR
 * @param {string} [address]    - Optional: assert the signing account
 * @returns {Promise<string>}   - Signed transaction XDR
 * @throws {FreighterError}
 */
export async function signTx(xdr, address) {
    await assertTestnet();

    const opts = {
        networkPassphrase: TESTNET_PASSPHRASE,
    };
    if (address) opts.accountToSign = address;

    const result = await signTransaction(xdr, opts);

    if (result?.error) {
        if (result.error.toLowerCase().includes("rejected")) {
            throw new FreighterError("USER_REJECTED", "Transaksi ditolak oleh pengguna.");
        }
        throw new FreighterError("SIGN_FAILED", `Gagal menandatangani transaksi: ${result.error}`);
    }

    const signed = typeof result === "string" ? result : result?.signedTxXdr;
    if (!signed) {
        throw new FreighterError("SIGN_FAILED", "Freighter tidak mengembalikan transaksi yang sudah ditandatangani.");
    }

    return signed;
}

// ── Error class ──────────────────────────────────────────────────

export class FreighterError extends Error {
    /**
     * @param {string} code    - Machine-readable error code
     * @param {string} message - Human-readable Indonesian message
     */
    constructor(code, message) {
        super(message);
        this.name  = "FreighterError";
        this.code  = code;
    }
}

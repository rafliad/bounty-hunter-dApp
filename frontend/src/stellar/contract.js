/**
 * contract.js — Soroban Contract Client Layer
 *
 * Modul ini adalah jembatan antara React dan smart contract di Stellar blockchain.
 * Menyediakan dua jenis operasi:
 *   - READ  : Query data langsung dari kontrak (tidak butuh tanda tangan)
 *   - WRITE : Membangun transaksi yang siap ditandatangani oleh Freighter
 *
 * Catatan: Modul ini TIDAK pernah menyimpan private key dan TIDAK pernah mengirim
 * transaksi secara langsung — itu semua dilakukan via Freighter.
 */

import {
    Contract,
    Networks,
    TransactionBuilder,
    BASE_FEE,
    nativeToScVal,
    scValToNative,
    Address,
    rpc,
    xdr,
} from "@stellar/stellar-sdk";

// ── Constants ────────────────────────────────────────────────────────────────

/** ID kontrak yang sudah di-deploy ke Stellar Testnet */
export const CONTRACT_ID =
    "CAOORSN3XLOHAOBT3KF6GKZR4L6P3HLKDV5F2SAZ5KLNNYQUD2XVFSTZ";

/** Network passphrase Testnet — harus cocok dengan yang ada di freighter.js */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** URL Soroban RPC untuk Testnet */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Fee default dalam stroops (100 stroops = 0.00001 XLM) */
const TX_FEE = BASE_FEE;

/** Timeout transaksi dalam detik */
const TX_TIMEOUT = 30;

// ── Server & Contract instance ───────────────────────────────────────────────

/** Soroban RPC server instance — digunakan untuk simulasi dan submit */
const server = new rpc.Server(RPC_URL, { allowHttp: false });

/** Contract instance — digunakan untuk membangun invocation */
const contract = new Contract(CONTRACT_ID);

// ── Type Converters ──────────────────────────────────────────────────────────
// Soroban menyimpan data sebagai ScVal (Stellar Contract Value), bukan tipe JS biasa.
// Fungsi-fungsi di bawah ini mengkonversi bolak-balik antara ScVal dan objek JS.

/**
 * Konversi ScVal Bounty dari kontrak ke objek JS yang ramah frontend.
 * Struktur kontrak: { id, title, description, category, reward, issuer, status }
 */
function scValToBounty(val) {
    const native = scValToNative(val);
    return {
        id: Number(native.id),
        title: native.title,
        description: native.description,
        category: native.category,
        reward: Number(native.reward),
        issuer: native.issuer.toString(),
        status: Object.keys(native.status)[0], // "Open" atau "Completed"
    };
}

/**
 * Konversi ScVal Submission dari kontrak ke objek JS.
 * Struktur kontrak: { bounty_id, solver, proof_url }
 */
function scValToSubmission(val) {
    const native = scValToNative(val);
    return {
        bounty_id: Number(native.bounty_id),
        solver: native.solver.toString(),
        proof_url: native.proof_url,
    };
}

/**
 * Konversi ScVal Badge dari kontrak ke objek JS.
 * Struktur kontrak: { id, bounty_id, title, category, issued_at }
 */
function scValToBadge(val) {
    const native = scValToNative(val);
    return {
        id: Number(native.id),
        bounty_id: Number(native.bounty_id),
        title: native.title,
        category: native.category,
        issued_at: Number(native.issued_at) * 1000, // detik → milidetik untuk JS Date
    };
}

// ── Core Helpers ─────────────────────────────────────────────────────────────

/**
 * Eksekusi view call (read-only) ke kontrak.
 * Tidak memerlukan akun atau tanda tangan — hanya simulasi.
 *
 * @param {xdr.Operation} operation - Operasi pemanggilan kontrak
 * @returns {Promise<xdr.ScVal>} - Nilai kembalian dari kontrak
 */
async function simulateReadOnly(operation) {
    // Untuk view calls, kita pakai akun dummy karena tidak ada transaksi nyata
    const DUMMY_ACCOUNT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

    const account = await server.getAccount(DUMMY_ACCOUNT).catch(() => null);

    // Jika akun dummy tidak ada di testnet, buat account object manual
    const sourceAccount = account ?? {
        accountId: () => DUMMY_ACCOUNT,
        sequenceNumber: () => "0",
        incrementSequenceNumber: () => { },
    };

    const tx = new TransactionBuilder(sourceAccount, {
        fee: TX_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(operation)
        .setTimeout(TX_TIMEOUT)
        .build();

    const simulation = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simulation)) {
        throw new ContractCallError("SIMULATION_FAILED", simulation.error);
    }

    // Ambil return value dari hasil simulasi
    return simulation.result?.retval;
}

/**
 * Membangun transaksi yang siap ditandatangani oleh Freighter wallet.
 * Fungsi ini:
 *   1. Mengambil data akun terbaru dari jaringan (untuk sequence number yang valid)
 *   2. Membuat raw transaction
 *   3. Mensimulasikan tx untuk mendapatkan resource fee
 *   4. Mengkembalikan XDR string yang siap untuk ditandatangani
 *
 * @param {string} sourceAddress - Alamat publik pengguna yang terkoneksi
 * @param {xdr.Operation} operation - Operasi pemanggilan kontrak
 * @returns {Promise<string>} - XDR base64 transaksi yang siap ditandatangani
 */
export async function buildTransaction(sourceAddress, operation) {
    // Ambil data akun terbaru (penting: sequence number harus up-to-date)
    const account = await server.getAccount(sourceAddress);

    const tx = new TransactionBuilder(account, {
        fee: TX_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(operation)
        .setTimeout(TX_TIMEOUT)
        .build();

    // Simulasikan untuk mendapatkan resource fee & footprint yang tepat
    const simulation = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simulation)) {
        throw new ContractCallError(
            "SIMULATION_FAILED",
            `Simulasi gagal: ${simulation.error}`
        );
    }

    // Assemble transaksi dengan resource fee dari simulasi
    const preparedTx = rpc.assembleTransaction(tx, simulation).build();

    // Kembalikan XDR string — ini yang akan dikirim ke Freighter untuk ditandatangani
    return preparedTx.toXDR();
}

/**
 * Mengirimkan transaksi yang sudah ditandatangani ke jaringan Stellar.
 * Menunggu konfirmasi (polling) hingga status final.
 *
 * @param {string} signedXdr - XDR transaksi yang sudah ditandatangani oleh Freighter
 * @returns {Promise<{success: boolean, txHash: string}>}
 */
export async function submitTransaction(signedXdr) {
    const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    const sendResult = await server.sendTransaction(tx);

    if (sendResult.status === "ERROR") {
        throw new ContractCallError(
            "SUBMIT_FAILED",
            `Submit gagal: ${sendResult.errorResult?.toString() ?? "Unknown error"}`
        );
    }

    const txHash = sendResult.hash;

    // Polling sampai transaksi dikonfirmasi (maks 30 detik)
    const MAX_POLLS = 10;
    for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(3000);
        const status = await server.getTransaction(txHash);

        if (status.status === rpc.Api.GetTransactionStatus.SUCCESS) {
            return { success: true, txHash, returnValue: status.returnValue ?? null };
        }

        if (status.status === rpc.Api.GetTransactionStatus.FAILED) {
            throw new ContractCallError(
                "TX_FAILED",
                `Transaksi gagal di jaringan. Hash: ${txHash}`
            );
        }

        // Status MISSING / NOT_FOUND = masih diproses, lanjut polling
    }

    throw new ContractCallError(
        "TX_TIMEOUT",
        `Transaksi timeout setelah ${MAX_POLLS * 3} detik. Hash: ${txHash}`
    );
}

// ── READ Functions (Task 2.3) ─────────────────────────────────────────────────
// Fungsi-fungsi ini mengambil data dari kontrak tanpa memerlukan wallet/tanda tangan.

/**
 * Ambil semua bounty dari kontrak.
 * @returns {Promise<Array>} - Array bounty dalam format JS object
 */
export async function fetchBounties() {
    const operation = contract.call("get_bounties");
    const retval = await simulateReadOnly(operation);

    if (!retval) return [];

    // retval adalah ScVal Vec — konversi setiap elemen
    const native = scValToNative(retval);
    if (!Array.isArray(native)) return [];

    // Konversi manual per item agar status enum ditangani dengan benar
    return native.map((item) => ({
        id: Number(item.id),
        title: item.title,
        description: item.description,
        category: item.category,
        reward: Number(item.reward),
        issuer: item.issuer.toString(),
        status: Object.keys(item.status)[0],
    }));
}

/**
 * Ambil satu bounty berdasarkan ID.
 * @param {number} id - ID bounty
 * @returns {Promise<object|null>} - Bounty object atau null jika tidak ada
 */
export async function fetchBounty(id) {
    const operation = contract.call(
        "get_bounty",
        nativeToScVal(id, { type: "u64" })
    );
    const retval = await simulateReadOnly(operation);
    if (!retval || retval.switch().name === "scvVoid") return null;

    // Option<Bounty>: jika ada nilainya, unwrap inner value
    try {
        return scValToBounty(retval);
    } catch {
        return null;
    }
}

/**
 * Ambil submission untuk sebuah bounty.
 * @param {number} bountyId - ID bounty
 * @returns {Promise<object|null>} - Submission object atau null
 */
export async function fetchSubmission(bountyId) {
    const operation = contract.call(
        "get_submission",
        nativeToScVal(bountyId, { type: "u64" })
    );
    const retval = await simulateReadOnly(operation);
    if (!retval || retval.switch().name === "scvVoid") return null;

    try {
        return scValToSubmission(retval);
    } catch {
        return null;
    }
}

/**
 * Ambil semua Soulbound Badge milik sebuah alamat.
 * @param {string} ownerAddress - Stellar public key (G...)
 * @returns {Promise<Array>} - Array badge objects
 */
export async function fetchBadges(ownerAddress) {
    const operation = contract.call(
        "get_badges",
        new Address(ownerAddress).toScVal()
    );
    const retval = await simulateReadOnly(operation);
    if (!retval) return [];

    const native = scValToNative(retval);
    if (!Array.isArray(native)) return [];

    return native.map((item) => ({
        id: Number(item.id),
        bounty_id: Number(item.bounty_id),
        title: item.title,
        category: item.category,
        issued_at: Number(item.issued_at) * 1000,
    }));
}

// ── WRITE TX Builders (Task 2.4) ──────────────────────────────────────────────
// Fungsi-fungsi ini membangun XDR transaksi yang siap ditandatangani oleh Freighter.
// Mereka TIDAK menandatangani atau mengirim transaksi sendiri.

/**
 * Bangun transaksi untuk membuat bounty baru.
 *
 * @param {string} issuerAddress - Alamat Issuer (wallet yang terkoneksi)
 * @param {string} title         - Judul bounty
 * @param {string} description   - Deskripsi bounty
 * @param {string} category      - Kategori (Frontend, Backend, dll)
 * @param {number} reward        - Jumlah reward dalam stroops
 * @returns {Promise<string>} XDR string siap tanda tangan
 */
export async function buildCreateBountyTx(
    issuerAddress,
    title,
    description,
    category,
    reward
) {
    const operation = contract.call(
        "create_bounty",
        new Address(issuerAddress).toScVal(),
        nativeToScVal(title, { type: "string" }),
        nativeToScVal(description, { type: "string" }),
        nativeToScVal(category, { type: "string" }),
        nativeToScVal(BigInt(reward), { type: "i128" })
    );
    return buildTransaction(issuerAddress, operation);
}

/**
 * Bangun transaksi untuk submit hasil kerja (proof of work).
 *
 * @param {string} solverAddress - Alamat Solver (wallet yang terkoneksi)
 * @param {number} bountyId      - ID bounty yang dikerjakan
 * @param {string} proofUrl      - URL bukti kerja (repo, docs, demo)
 * @returns {Promise<string>} XDR string siap tanda tangan
 */
export async function buildSubmitWorkTx(solverAddress, bountyId, proofUrl) {
    const operation = contract.call(
        "submit_work",
        new Address(solverAddress).toScVal(),
        nativeToScVal(BigInt(bountyId), { type: "u64" }),
        nativeToScVal(proofUrl, { type: "string" })
    );
    return buildTransaction(solverAddress, operation);
}

/**
 * Bangun transaksi untuk menyetujui submission (approve).
 * Hanya bisa dipanggil oleh Issuer pemilik bounty.
 *
 * @param {string} issuerAddress - Alamat Issuer (wallet yang terkoneksi)
 * @param {number} bountyId      - ID bounty yang akan disetujui
 * @returns {Promise<string>} XDR string siap tanda tangan
 */
export async function buildApproveSubmissionTx(issuerAddress, bountyId) {
    const operation = contract.call(
        "approve_submission",
        new Address(issuerAddress).toScVal(),
        nativeToScVal(BigInt(bountyId), { type: "u64" })
    );
    return buildTransaction(issuerAddress, operation);
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ContractCallError extends Error {
    /**
     * @param {string} code    - Kode error yang dapat dibaca mesin
     * @param {string} message - Pesan error yang dapat dibaca manusia
     */
    constructor(code, message) {
        super(message);
        this.name = "ContractCallError";
        this.code = code;
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

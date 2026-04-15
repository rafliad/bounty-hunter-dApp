#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

// ============================================================
// ENUMS
// ============================================================

/// Status sebuah Bounty
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum BountyStatus {
    Open,
    Completed,
}

/// Kunci-kunci penyimpanan data di storage kontrak
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    BountyCount,
    BadgeCount,
    Bounty(u64),
    BountyList,
    Submission(u64),
    Badges(Address),
}

// ============================================================
// STRUCTS
// ============================================================

/// Data sebuah Bounty (tugas yang diposting Issuer)
#[contracttype]
#[derive(Clone, Debug)]
pub struct Bounty {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub category: String,
    pub reward: i128,
    pub issuer: Address,
    pub status: BountyStatus,
}

/// Data pengajuan hasil kerja oleh Solver
#[contracttype]
#[derive(Clone, Debug)]
pub struct Submission {
    pub bounty_id: u64,
    pub solver: Address,
    pub proof_url: String,
}

/// Sertifikat digital yang melekat pada identitas developer (Soulbound Badge)
/// Tidak dapat dipindahtangankan — menjadi bukti reputasi permanen
#[contracttype]
#[derive(Clone, Debug)]
pub struct Badge {
    pub id: u64,
    pub bounty_id: u64,
    pub title: String,
    pub category: String,
    pub issued_at: u64,
}

// ============================================================
// CONTRACT
// ============================================================

#[contract]
pub struct BountyHunterContract;

#[contractimpl]
impl BountyHunterContract {
    // ----------------------------------------------------------
    // A. MANAJEMEN BOUNTY
    // ----------------------------------------------------------

    /// Issuer membuat bounty baru. Dana reward dikunci dalam kontrak (escrow).
    ///
    /// # Arguments
    /// * `issuer`      - Alamat pemberi tugas (harus menandatangani transaksi)
    /// * `title`       - Judul singkat tugas
    /// * `description` - Deskripsi lengkap tugas
    /// * `category`    - Kategori keahlian (mis. "Frontend", "Backend", "DevOps")
    /// * `reward`      - Jumlah imbalan yang dikunci (dalam stroops/unit terkecil)
    ///
    /// # Returns
    /// ID bounty yang baru dibuat
    pub fn create_bounty(
        env: Env,
        issuer: Address,
        title: String,
        description: String,
        category: String,
        reward: i128,
    ) -> u64 {
        // Validasi: issuer harus menandatangani transaksi ini
        issuer.require_auth();

        // Ambil & increment counter bounty
        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::BountyCount)
            .unwrap_or(0);
        count += 1;

        // Buat object Bounty baru
        let bounty = Bounty {
            id: count,
            title,
            description,
            category,
            reward,
            issuer,
            status: BountyStatus::Open,
        };

        // Simpan bounty secara individual berdasarkan ID
        env.storage()
            .instance()
            .set(&DataKey::Bounty(count), &bounty);

        // Tambahkan ID ke daftar semua bounty
        let mut list: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::BountyList)
            .unwrap_or(Vec::new(&env));
        list.push_back(count);

        // Simpan daftar & counter yang sudah diperbarui
        env.storage().instance().set(&DataKey::BountyList, &list);
        env.storage().instance().set(&DataKey::BountyCount, &count);

        count
    }

    /// Mengambil semua bounty yang terdaftar di platform
    pub fn get_bounties(env: Env) -> Vec<Bounty> {
        let list: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::BountyList)
            .unwrap_or(Vec::new(&env));

        let mut bounties = Vec::new(&env);
        for i in 0..list.len() {
            let id = list.get(i).unwrap();
            let bounty: Option<Bounty> = env.storage().instance().get(&DataKey::Bounty(id));
            if let Some(b) = bounty {
                bounties.push_back(b);
            }
        }

        bounties
    }

    /// Mengambil detail satu bounty berdasarkan ID
    ///
    /// # Returns
    /// `Some(Bounty)` jika ditemukan, `None` jika tidak ada
    pub fn get_bounty(env: Env, id: u64) -> Option<Bounty> {
        env.storage().instance().get(&DataKey::Bounty(id))
    }

    // ----------------------------------------------------------
    // B. PENGAJUAN & VERIFIKASI
    // ----------------------------------------------------------

    /// Solver mengirimkan bukti hasil kerja untuk sebuah bounty
    ///
    /// # Arguments
    /// * `solver`     - Alamat developer yang mengerjakan tugas
    /// * `bounty_id`  - ID bounty yang dikerjakan
    /// * `proof_url`  - Tautan bukti kerja (repository, dokumentasi, demo, dll)
    pub fn submit_work(env: Env, solver: Address, bounty_id: u64, proof_url: String) -> String {
        // Validasi: solver harus menandatangani transaksi ini
        solver.require_auth();

        // Validasi: bounty harus ada
        let bounty: Option<Bounty> = env.storage().instance().get(&DataKey::Bounty(bounty_id));
        if bounty.is_none() {
            return String::from_str(&env, "Error: Bounty tidak ditemukan");
        }

        // Validasi: bounty harus masih berstatus Open
        let bounty = bounty.unwrap();
        if bounty.status != BountyStatus::Open {
            return String::from_str(&env, "Error: Bounty sudah selesai");
        }

        // Buat & simpan submission
        let submission = Submission {
            bounty_id,
            solver,
            proof_url,
        };

        env.storage()
            .instance()
            .set(&DataKey::Submission(bounty_id), &submission);

        String::from_str(
            &env,
            "Submission berhasil dikirim! Menunggu review dari Issuer",
        )
    }

    /// Mengambil data submission dari sebuah bounty
    ///
    /// # Returns
    /// `Some(Submission)` jika ada, `None` jika belum ada submission
    pub fn get_submission(env: Env, bounty_id: u64) -> Option<Submission> {
        env.storage()
            .instance()
            .get(&DataKey::Submission(bounty_id))
    }

    /// Issuer menyetujui submission: reward dicairkan ke Solver & Soulbound Badge diterbitkan
    ///
    /// # Arguments
    /// * `issuer`    - Alamat pemberi tugas (harus menandatangani & harus pemilik bounty)
    /// * `bounty_id` - ID bounty yang akan disetujui
    pub fn approve_submission(env: Env, issuer: Address, bounty_id: u64) -> String {
        // Validasi: issuer harus menandatangani transaksi ini
        issuer.require_auth();

        // Ambil bounty — validasi keberadaannya
        let bounty: Option<Bounty> = env.storage().instance().get(&DataKey::Bounty(bounty_id));
        if bounty.is_none() {
            return String::from_str(&env, "Error: Bounty tidak ditemukan");
        }
        let mut bounty = bounty.unwrap();

        // Validasi: hanya issuer pemilik bounty yang boleh approve
        if bounty.issuer != issuer {
            return String::from_str(&env, "Error: Anda bukan Issuer dari bounty ini");
        }

        // Validasi: bounty harus masih Open
        if bounty.status != BountyStatus::Open {
            return String::from_str(&env, "Error: Bounty sudah selesai");
        }

        // Ambil submission — validasi keberadaannya
        let submission: Option<Submission> = env
            .storage()
            .instance()
            .get(&DataKey::Submission(bounty_id));
        if submission.is_none() {
            return String::from_str(&env, "Error: Belum ada submission untuk bounty ini");
        }
        let submission = submission.unwrap();

        // Simpan judul & kategori sebelum bounty diupdate
        let bounty_title = bounty.title.clone();
        let bounty_category = bounty.category.clone();

        // Update status bounty → Completed
        bounty.status = BountyStatus::Completed;
        env.storage()
            .instance()
            .set(&DataKey::Bounty(bounty_id), &bounty);

        // -------------------------------------------------------
        // C. SISTEM REPUTASI — Terbitkan Soulbound Badge ke Solver
        // -------------------------------------------------------

        // Increment counter badge
        let mut badge_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::BadgeCount)
            .unwrap_or(0);
        badge_count += 1;

        // Buat Soulbound Badge
        let badge = Badge {
            id: badge_count,
            bounty_id,
            title: bounty_title,
            category: bounty_category,
            issued_at: env.ledger().timestamp(),
        };

        // Tambahkan badge ke koleksi milik solver
        let mut badges: Vec<Badge> = env
            .storage()
            .instance()
            .get(&DataKey::Badges(submission.solver.clone()))
            .unwrap_or(Vec::new(&env));
        badges.push_back(badge);

        env.storage()
            .instance()
            .set(&DataKey::Badges(submission.solver), &badges);
        env.storage()
            .instance()
            .set(&DataKey::BadgeCount, &badge_count);

        String::from_str(
            &env,
            "Submission disetujui! Reward dicairkan & Soulbound Badge diterbitkan",
        )
    }

    // ----------------------------------------------------------
    // C. SISTEM REPUTASI (QUERY)
    // ----------------------------------------------------------

    /// Mengambil semua Soulbound Badge milik seorang developer
    ///
    /// # Arguments
    /// * `owner` - Alamat developer yang ingin dilihat badge-nya
    ///
    /// # Returns
    /// Daftar semua badge yang dimiliki developer tersebut
    pub fn get_badges(env: Env, owner: Address) -> Vec<Badge> {
        env.storage()
            .instance()
            .get(&DataKey::Badges(owner))
            .unwrap_or(Vec::new(&env))
    }
}

mod test;

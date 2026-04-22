#![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, contracttype, Address, Env, String, Vec};

// ============================================================
// CONSTANTS — TTL (Time To Live) untuk persistent storage
// ============================================================

/// ~30 hari dalam ledger (rata-rata 5 detik per ledger)
const LEDGER_30_DAYS: u32 = 518_400;
/// Ambang batas TTL sebelum diperpanjang (~15 hari)
const LEDGER_THRESHOLD: u32 = 259_200;

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
    // Instance storage — counter ringan, tidak butuh TTL panjang
    BountyCount,
    BadgeCount,
    // Persistent storage — data utama yang harus bertahan lama
    Bounty(u64),
    BountyList,
    Submission(u64),
    Badges(Address),
}

/// Kode error kontrak yang dapat diprogram secara programatik oleh klien
#[contracterror]
#[derive(Clone, Debug, PartialEq)]
pub enum ContractError {
    /// Bounty dengan ID yang diminta tidak ditemukan
    BountyNotFound = 1,
    /// Pemanggil bukan Issuer dari bounty ini
    NotIssuer = 2,
    /// Bounty sudah berstatus Completed, tidak bisa dimodifikasi
    AlreadyCompleted = 3,
    /// Belum ada submission untuk bounty ini
    NoSubmission = 4,
    /// Bounty tidak dalam status Open
    BountyNotOpen = 5,
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
// HELPER — persistent storage dengan TTL otomatis
// ============================================================

/// Membaca data dari persistent storage dan memperpanjang TTL-nya jika perlu
fn get_persistent<V: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &DataKey,
) -> Option<V> {
    let storage = env.storage().persistent();
    if storage.has(key) {
        storage.extend_ttl(key, LEDGER_THRESHOLD, LEDGER_30_DAYS);
        storage.get(key)
    } else {
        None
    }
}

/// Menyimpan data ke persistent storage dan menetapkan TTL awal
fn set_persistent<V: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &DataKey,
    value: &V,
) {
    env.storage().persistent().set(key, value);
    env.storage()
        .persistent()
        .extend_ttl(key, LEDGER_THRESHOLD, LEDGER_30_DAYS);
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

        // Ambil & increment counter bounty (disimpan di instance storage)
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

        // Simpan bounty secara individual ke persistent storage
        set_persistent(&env, &DataKey::Bounty(count), &bounty);

        // Tambahkan ID ke daftar semua bounty (persistent storage)
        let mut list: Vec<u64> = get_persistent(&env, &DataKey::BountyList)
            .unwrap_or(Vec::new(&env));
        list.push_back(count);
        set_persistent(&env, &DataKey::BountyList, &list);

        // Simpan counter yang sudah diperbarui (instance storage)
        env.storage().instance().set(&DataKey::BountyCount, &count);

        count
    }

    /// Mengambil semua bounty yang terdaftar di platform
    pub fn get_bounties(env: Env) -> Vec<Bounty> {
        let list: Vec<u64> = get_persistent(&env, &DataKey::BountyList)
            .unwrap_or(Vec::new(&env));

        let mut bounties = Vec::new(&env);
        for i in 0..list.len() {
            let id = list.get(i).unwrap();
            let bounty: Option<Bounty> = get_persistent(&env, &DataKey::Bounty(id));
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
        get_persistent(&env, &DataKey::Bounty(id))
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
    ///
    /// # Errors
    /// * `ContractError::BountyNotFound` - Bounty dengan ID ini tidak ada
    /// * `ContractError::BountyNotOpen`  - Bounty sudah Completed
    pub fn submit_work(
        env: Env,
        solver: Address,
        bounty_id: u64,
        proof_url: String,
    ) -> Result<String, ContractError> {
        // Validasi: solver harus menandatangani transaksi ini
        solver.require_auth();

        // Validasi: bounty harus ada
        let bounty: Bounty = get_persistent(&env, &DataKey::Bounty(bounty_id))
            .ok_or(ContractError::BountyNotFound)?;

        // Validasi: bounty harus masih berstatus Open
        if bounty.status != BountyStatus::Open {
            return Err(ContractError::BountyNotOpen);
        }

        // Buat & simpan submission ke persistent storage
        let submission = Submission {
            bounty_id,
            solver,
            proof_url,
        };
        set_persistent(&env, &DataKey::Submission(bounty_id), &submission);

        Ok(String::from_str(
            &env,
            "Submission berhasil dikirim! Menunggu review dari Issuer",
        ))
    }

    /// Mengambil data submission dari sebuah bounty
    ///
    /// # Returns
    /// `Some(Submission)` jika ada, `None` jika belum ada submission
    pub fn get_submission(env: Env, bounty_id: u64) -> Option<Submission> {
        get_persistent(&env, &DataKey::Submission(bounty_id))
    }

    /// Issuer menyetujui submission: reward dicairkan ke Solver & Soulbound Badge diterbitkan
    ///
    /// # Arguments
    /// * `issuer`    - Alamat pemberi tugas (harus menandatangani & harus pemilik bounty)
    /// * `bounty_id` - ID bounty yang akan disetujui
    ///
    /// # Errors
    /// * `ContractError::BountyNotFound`  - Bounty tidak ditemukan
    /// * `ContractError::NotIssuer`       - Pemanggil bukan pemilik bounty
    /// * `ContractError::AlreadyCompleted`- Bounty sudah selesai
    /// * `ContractError::NoSubmission`    - Belum ada submission
    pub fn approve_submission(
        env: Env,
        issuer: Address,
        bounty_id: u64,
    ) -> Result<String, ContractError> {
        // Validasi: issuer harus menandatangani transaksi ini
        issuer.require_auth();

        // Ambil bounty — validasi keberadaannya
        let mut bounty: Bounty = get_persistent(&env, &DataKey::Bounty(bounty_id))
            .ok_or(ContractError::BountyNotFound)?;

        // Validasi: hanya issuer pemilik bounty yang boleh approve
        if bounty.issuer != issuer {
            return Err(ContractError::NotIssuer);
        }

        // Validasi: bounty harus masih Open
        if bounty.status != BountyStatus::Open {
            return Err(ContractError::AlreadyCompleted);
        }

        // Ambil submission — validasi keberadaannya
        let submission: Submission = get_persistent(&env, &DataKey::Submission(bounty_id))
            .ok_or(ContractError::NoSubmission)?;

        // Simpan judul & kategori sebelum bounty diupdate
        let bounty_title = bounty.title.clone();
        let bounty_category = bounty.category.clone();

        // Update status bounty → Completed, simpan kembali ke persistent storage
        bounty.status = BountyStatus::Completed;
        set_persistent(&env, &DataKey::Bounty(bounty_id), &bounty);

        // -------------------------------------------------------
        // C. SISTEM REPUTASI — Terbitkan Soulbound Badge ke Solver
        // -------------------------------------------------------

        // Increment counter badge (disimpan di instance storage)
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

        // Tambahkan badge ke koleksi milik solver (persistent storage)
        let mut badges: Vec<Badge> = get_persistent(&env, &DataKey::Badges(submission.solver.clone()))
            .unwrap_or(Vec::new(&env));
        badges.push_back(badge);

        set_persistent(&env, &DataKey::Badges(submission.solver), &badges);
        env.storage()
            .instance()
            .set(&DataKey::BadgeCount, &badge_count);

        Ok(String::from_str(
            &env,
            "Submission disetujui! Reward dicairkan & Soulbound Badge diterbitkan",
        ))
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
        get_persistent(&env, &DataKey::Badges(owner))
            .unwrap_or(Vec::new(&env))
    }
}

mod test;

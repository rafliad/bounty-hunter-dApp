# Bounty Hunter

**Bounty Hunter** - Platform Micro-Bounty & Reputasi Digital Terdesentralisasi

## Deskripsi Proyek

Bounty Hunter adalah platform pasar kerja mikro (micro-task) terdesentralisasi yang dibangun di atas blockchain Stellar menggunakan Soroban SDK. Platform ini menghubungkan **Issuer** (pemberi tugas) dengan **Solver** (pengembang) melalui sistem bounty yang transparan, aman, dan adil.

Setiap tugas yang diselesaikan menghasilkan **Soulbound Badge** — sertifikat digital permanen yang melekat pada identitas developer dan tidak dapat dipindahtangankan. Bounty Hunter bukan sekadar alat pembayaran, melainkan sebuah *"LinkedIn Terdesentralisasi"* berbasis bukti kerja nyata.

---

## Masalah yang Diselesaikan

| Masalah | Solusi Bounty Hunter |
| :--- | :--- |
| **Risiko Tidak Dibayar** — Developer ragu mengerjakan tugas kecil | **Sistem Escrow** — Dana dikunci di kontrak sejak awal |
| **Portofolio Tidak Terverifikasi** — Sulit membuktikan kontribusi nyata | **Soulbound Badge** — Sertifikat digital permanen sebagai bukti reputasi |
| **Proses Birokrasi Lambat** — Rekrutmen tugas kecil memakan waktu | **Akses Terbuka** — Siapa pun langsung bisa berkontribusi |

---

## Fitur Utama

### A. Manajemen Bounty
- **Posting Tugas** — Issuer membuat bounty dengan judul, deskripsi, kategori, dan jumlah reward
- **Escrow Otomatis** — Dana reward dikunci dalam kontrak saat bounty dipublikasikan
- **Jelajah Bounty** — Solver dapat melihat semua bounty yang tersedia

### B. Pengajuan & Verifikasi
- **Submit Bukti Kerja** — Solver mengirimkan tautan repositori atau dokumentasi sebagai proof
- **Review & Approve** — Issuer meninjau hasil kerja dan memberikan persetujuan

### C. Sistem Reputasi (Soulbound Badge)
- **Mint Otomatis** — Badge diterbitkan langsung ke wallet Solver saat submission disetujui
- **Identitas Permanen** — Badge melekat pada alamat wallet dan tidak dapat dijual atau dipindahkan
- **Portofolio On-Chain** — Kumpulan badge menjadi rekam jejak reputasi yang terverifikasi secara transparan

---

## Alur Kerja

```
1. Issuer  →  create_bounty()       Posting tugas + kunci dana (escrow)
2. Solver  →  get_bounties()        Eksplorasi daftar bounty yang tersedia
3. Solver  →  submit_work()         Kirim bukti hasil kerja (URL repo/dokumentasi)
4. Issuer  →  approve_submission()  Setujui hasil kerja
              ↓
5. System  →  [otomatis] Cairkan reward ke Solver
              [otomatis] Terbitkan Soulbound Badge ke wallet Solver
```

---

## Fungsi Kontrak

| Fungsi | Parameter | Deskripsi |
| :--- | :--- | :--- |
| `create_bounty` | issuer, title, description, category, reward | Buat bounty baru, kunci dana escrow |
| `get_bounties` | — | Ambil semua bounty yang terdaftar |
| `get_bounty` | id | Ambil detail satu bounty berdasarkan ID |
| `submit_work` | solver, bounty_id, proof_url | Kirim bukti hasil kerja |
| `get_submission` | bounty_id | Lihat submission dari sebuah bounty |
| `approve_submission` | issuer, bounty_id | Setujui submission → cairkan reward + mint badge |
| `get_badges` | owner | Lihat semua Soulbound Badge milik seorang developer |

---

## Struktur Data

### `Bounty`
```rust
pub struct Bounty {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub category: String,   // mis. "Frontend", "Backend", "DevOps"
    pub reward: i128,       // dalam stroops (unit terkecil Stellar)
    pub issuer: Address,
    pub status: BountyStatus, // Open | Completed
}
```

### `Submission`
```rust
pub struct Submission {
    pub bounty_id: u64,
    pub solver: Address,
    pub proof_url: String, // tautan repositori / dokumentasi / demo
}
```

### `Badge` (Soulbound)
```rust
pub struct Badge {
    pub id: u64,
    pub bounty_id: u64,
    pub title: String,
    pub category: String,
    pub issued_at: u64, // ledger timestamp
}
```

---

## Memulai

### Persyaratan
- Rust & Cargo
- Soroban SDK
- Stellar CLI

### Build Kontrak
```bash
stellar contract build
```

### Jalankan Test
```bash
cargo test
```

### Deploy ke Testnet
```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/bounty_hunter.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>
```

---

## Nilai Strategis

Semakin banyak bounty yang diselesaikan seorang developer di Bounty Hunter, semakin kuat kredibilitas mereka karena setiap pencapaian didukung oleh **bukti kerja nyata** yang tercatat secara permanen dan transparan di blockchain Stellar — tidak bisa dipalsukan, tidak bisa dihapus.

---

## Persyaratan Teknis

- Soroban SDK `v25`
- Rust (target: `wasm32v1-none`)
- Stellar Blockchain Network

---

**Bounty Hunter** - Membuktikan Keahlian Melalui Bukti Kerja Nyata di Blockchain
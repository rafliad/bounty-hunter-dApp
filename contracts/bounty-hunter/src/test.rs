#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger as _}, Address, Env, String};

// ============================================================
// HELPER
// ============================================================

fn setup() -> (Env, BountyHunterContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    // Set ledger state agar persistent storage TTL berfungsi saat pengujian
    env.ledger().with_mut(|li| {
        li.sequence_number = 100;
        li.timestamp = 1_700_000_000;
    });
    let contract_id = env.register(BountyHunterContract, ());
    let client = BountyHunterContractClient::new(&env, &contract_id);
    (env, client)
}

// ============================================================
// A. TEST MANAJEMEN BOUNTY
// ============================================================

#[test]
fn test_create_bounty_returns_incremental_id() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);

    let id1 = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Login Bug"),
        &String::from_str(&env, "Perbaiki bug pada form login"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    let id2 = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Build Dashboard UI"),
        &String::from_str(&env, "Buat halaman dashboard dengan React"),
        &String::from_str(&env, "Frontend"),
        &200,
    );

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
fn test_get_bounties_returns_all() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);

    assert_eq!(client.get_bounties().len(), 0);

    client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Login Bug"),
        &String::from_str(&env, "Perbaiki bug pada form login"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    client.create_bounty(
        &issuer,
        &String::from_str(&env, "Build Dashboard UI"),
        &String::from_str(&env, "Buat halaman dashboard"),
        &String::from_str(&env, "Frontend"),
        &200,
    );

    let bounties = client.get_bounties();
    assert_eq!(bounties.len(), 2);
}

#[test]
fn test_get_bounty_by_id() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Login Bug"),
        &String::from_str(&env, "Perbaiki bug pada form login"),
        &String::from_str(&env, "Backend"),
        &500,
    );

    let bounty = client.get_bounty(&id).unwrap();

    assert_eq!(bounty.id, id);
    assert_eq!(bounty.reward, 500);
    assert_eq!(bounty.title, String::from_str(&env, "Fix Login Bug"));
    assert_eq!(bounty.category, String::from_str(&env, "Backend"));
    assert_eq!(bounty.status, BountyStatus::Open);
}

#[test]
fn test_get_bounty_not_found_returns_none() {
    let (_env, client) = setup();

    let result = client.get_bounty(&999);
    assert!(result.is_none());
}

// ============================================================
// B. TEST PENGAJUAN & VERIFIKASI
// ============================================================

#[test]
fn test_submit_work_success() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Build REST API"),
        &String::from_str(&env, "Buat endpoint CRUD sederhana"),
        &String::from_str(&env, "Backend"),
        &300,
    );

    // client.submit_work mengembalikan String langsung (Soroban client auto-unwrap Ok)
    let result = client.submit_work(
        &solver,
        &id,
        &String::from_str(&env, "https://github.com/dev/crud-api"),
    );

    assert_eq!(
        result,
        String::from_str(&env, "Submission berhasil dikirim! Menunggu review dari Issuer")
    );
}

#[test]
fn test_submit_work_bounty_not_found() {
    let (env, client) = setup();
    let solver = Address::generate(&env);

    // try_submit_work mengembalikan Result — digunakan untuk menguji kasus error
    let result = client.try_submit_work(
        &solver,
        &999,
        &String::from_str(&env, "https://github.com/dev/repo"),
    );

    assert_eq!(
        result,
        Err(Ok(ContractError::BountyNotFound))
    );
}

#[test]
fn test_submit_work_overwrites_previous_submission() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Bug"),
        &String::from_str(&env, "Deskripsi"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    client.submit_work(
        &solver,
        &id,
        &String::from_str(&env, "https://github.com/dev/v1"),
    );

    client.submit_work(
        &solver,
        &id,
        &String::from_str(&env, "https://github.com/dev/v2"),
    );

    let submission = client.get_submission(&id).unwrap();
    assert_eq!(
        submission.proof_url,
        String::from_str(&env, "https://github.com/dev/v2")
    );
}

#[test]
fn test_get_submission_returns_correct_data() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Bug"),
        &String::from_str(&env, "Deskripsi"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    client.submit_work(
        &solver,
        &id,
        &String::from_str(&env, "https://github.com/dev/repo"),
    );

    let submission = client.get_submission(&id).unwrap();
    assert_eq!(submission.bounty_id, id);
    assert_eq!(submission.solver, solver);
    assert_eq!(
        submission.proof_url,
        String::from_str(&env, "https://github.com/dev/repo")
    );
}

#[test]
fn test_get_submission_no_submission_returns_none() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Bug"),
        &String::from_str(&env, "Deskripsi"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    let result = client.get_submission(&id);
    assert!(result.is_none());
}

// ============================================================
// C. TEST APPROVE SUBMISSION & SOULBOUND BADGE
// ============================================================

#[test]
fn test_approve_submission_success() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Build REST API"),
        &String::from_str(&env, "Buat endpoint CRUD"),
        &String::from_str(&env, "Backend"),
        &500,
    );

    client.submit_work(
        &solver,
        &id,
        &String::from_str(&env, "https://github.com/dev/api"),
    );

    // client.approve_submission auto-unwrap Ok → langsung mengembalikan String
    let result = client.approve_submission(&issuer, &id);

    assert_eq!(
        result,
        String::from_str(
            &env,
            "Submission disetujui! Reward dicairkan & Soulbound Badge diterbitkan"
        )
    );
}

#[test]
fn test_approve_submission_updates_bounty_status() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Bug"),
        &String::from_str(&env, "Deskripsi"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    client.submit_work(
        &solver,
        &id,
        &String::from_str(&env, "https://github.com/dev/fix"),
    );

    client.approve_submission(&issuer, &id);

    let bounty = client.get_bounty(&id).unwrap();
    assert_eq!(bounty.status, BountyStatus::Completed);
}

#[test]
fn test_approve_submission_mints_badge_to_solver() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Build Dashboard UI"),
        &String::from_str(&env, "Buat halaman dashboard"),
        &String::from_str(&env, "Frontend"),
        &250,
    );

    client.submit_work(
        &solver,
        &id,
        &String::from_str(&env, "https://github.com/dev/dashboard"),
    );

    // Sebelum approve — solver belum punya badge
    assert_eq!(client.get_badges(&solver).len(), 0);

    client.approve_submission(&issuer, &id);

    // Setelah approve — solver mendapat 1 badge
    let badges = client.get_badges(&solver);
    assert_eq!(badges.len(), 1);

    let badge = badges.get(0).unwrap();
    assert_eq!(badge.bounty_id, id);
    assert_eq!(badge.title, String::from_str(&env, "Build Dashboard UI"));
    assert_eq!(badge.category, String::from_str(&env, "Frontend"));
}

#[test]
fn test_approve_submission_wrong_issuer() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver = Address::generate(&env);
    let attacker = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Bug"),
        &String::from_str(&env, "Deskripsi"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    client.submit_work(
        &solver,
        &id,
        &String::from_str(&env, "https://github.com/dev/repo"),
    );

    // Attacker mencoba approve bounty milik orang lain
    let result = client.try_approve_submission(&attacker, &id);

    assert_eq!(result, Err(Ok(ContractError::NotIssuer)));
}

#[test]
fn test_approve_submission_no_submission_yet() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Bug"),
        &String::from_str(&env, "Deskripsi"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    // Tidak ada submission, langsung approve
    let result = client.try_approve_submission(&issuer, &id);

    assert_eq!(result, Err(Ok(ContractError::NoSubmission)));
}

#[test]
fn test_approve_submission_bounty_not_found() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);

    let result = client.try_approve_submission(&issuer, &999);

    assert_eq!(result, Err(Ok(ContractError::BountyNotFound)));
}

#[test]
fn test_cannot_approve_already_completed_bounty() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Bug"),
        &String::from_str(&env, "Deskripsi"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    client.submit_work(
        &solver,
        &id,
        &String::from_str(&env, "https://github.com/dev/fix"),
    );

    // Approve pertama — berhasil
    client.approve_submission(&issuer, &id);

    // Approve kedua — harus gagal karena sudah Completed
    let result = client.try_approve_submission(&issuer, &id);
    assert_eq!(result, Err(Ok(ContractError::AlreadyCompleted)));
}

#[test]
fn test_cannot_submit_to_completed_bounty() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver1 = Address::generate(&env);
    let solver2 = Address::generate(&env);

    let id = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Bug"),
        &String::from_str(&env, "Deskripsi"),
        &String::from_str(&env, "Backend"),
        &100,
    );

    client.submit_work(
        &solver1,
        &id,
        &String::from_str(&env, "https://github.com/solver1/fix"),
    );

    client.approve_submission(&issuer, &id);

    // Solver lain mencoba submit ke bounty yang sudah selesai
    let result = client.try_submit_work(
        &solver2,
        &id,
        &String::from_str(&env, "https://github.com/solver2/fix"),
    );

    assert_eq!(result, Err(Ok(ContractError::BountyNotOpen)));
}

// ============================================================
// D. TEST FULL FLOW (END-TO-END)
// ============================================================

#[test]
fn test_full_bounty_hunter_flow() {
    let (env, client) = setup();
    let issuer = Address::generate(&env);
    let solver = Address::generate(&env);

    // 1. Issuer posting 2 bounty
    let id1 = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Fix Auth Bug"),
        &String::from_str(&env, "Perbaiki bug autentikasi JWT"),
        &String::from_str(&env, "Backend"),
        &1000,
    );
    let id2 = client.create_bounty(
        &issuer,
        &String::from_str(&env, "Redesign Landing Page"),
        &String::from_str(&env, "Modernisasi tampilan halaman utama"),
        &String::from_str(&env, "Frontend"),
        &800,
    );

    // 2. Solver melihat semua bounty
    let bounties = client.get_bounties();
    assert_eq!(bounties.len(), 2);

    // 3. Solver mengerjakan & submit bounty pertama
    client.submit_work(
        &solver,
        &id1,
        &String::from_str(&env, "https://github.com/solver/fix-jwt"),
    );

    // 4. Issuer approve bounty pertama
    client.approve_submission(&issuer, &id1);

    // 5. Solver sekarang punya 1 Soulbound Badge
    let badges = client.get_badges(&solver);
    assert_eq!(badges.len(), 1);
    assert_eq!(badges.get(0).unwrap().bounty_id, id1);

    // 6. Bounty pertama Completed, bounty kedua masih Open
    assert_eq!(
        client.get_bounty(&id1).unwrap().status,
        BountyStatus::Completed
    );
    assert_eq!(client.get_bounty(&id2).unwrap().status, BountyStatus::Open);

    // 7. Solver submit & selesaikan bounty kedua → total 2 badge
    client.submit_work(
        &solver,
        &id2,
        &String::from_str(&env, "https://github.com/solver/landing"),
    );
    client.approve_submission(&issuer, &id2);

    let badges = client.get_badges(&solver);
    assert_eq!(badges.len(), 2);
}

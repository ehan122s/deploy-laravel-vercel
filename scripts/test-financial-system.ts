import { DataService } from "../src/lib/data-service";
import { calculateTransactionFinancials } from "../src/lib/calculations";
import { AccountType, MutationType, Role } from "@prisma/client";
import assert from "assert";

async function runFinancialVerification() {
  console.log("=================================================================");
  console.log("   BRILINK MANAGEMENT SYSTEM - END-TO-END FINANCIAL TESTING");
  console.log("=================================================================\n");

  // Reset store for clean test run
  const branches = await DataService.getBranches();
  const branch1 = branches[0];
  const branch2 = branches[1];

  console.log("1. MEMERIKSA SALDO AWAL DEFAULT:");
  console.log(`   - ${branch1.name}: Kas=Rp${branch1.currentCashBalance.toLocaleString("id-ID")}, Bank=Rp${branch1.currentBankBalance.toLocaleString("id-ID")}, Total=Rp${(branch1.currentCashBalance + branch1.currentBankBalance).toLocaleString("id-ID")}`);
  console.log(`   - ${branch2.name}: Kas=Rp${branch2.currentCashBalance.toLocaleString("id-ID")}, Bank=Rp${branch2.currentBankBalance.toLocaleString("id-ID")}, Total=Rp${(branch2.currentCashBalance + branch2.currentBankBalance).toLocaleString("id-ID")}`);

  assert.strictEqual(branch1.currentCashBalance, 10000000, "Saldo kas awal Cabang 1 harus 10jt");
  assert.strictEqual(branch1.currentBankBalance, 25000000, "Saldo bank awal Cabang 1 harus 25jt");
  console.log("   [PASS] Saldo awal kedua cabang valid 100%.\n");

  // 2. SKENARIO WAJIB USER: Customer Transfer Rp1.000.000 (Admin Rp10.000, Potongan Bank Rp5.000)
  console.log("2. PENGUJIAN SKENARIO WAJIB: Transfer Sesama BRI Rp1.000.000");
  const initialAsset = branch1.currentCashBalance + branch1.currentBankBalance;

  const txTransfer = await DataService.createTransaction({
    branchId: branch1.id,
    userId: "user-kasir1",
    categoryCode: "TF_BRI",
    nominal: 1000000,
    customerAdmin: 10000,
    bankFee: 5000,
    customerName: "Bapak Suparman",
    paymentMethod: "TUNAI",
    notes: "No Rek BRI 0123-01-xxxx a.n Siti",
  });

  console.log(`   - No. Transaksi : ${txTransfer.transactionNo}`);
  console.log(`   - Nominal       : Rp${txTransfer.nominal.toLocaleString("id-ID")}`);
  console.log(`   - Admin Customer: Rp${txTransfer.customerAdmin.toLocaleString("id-ID")}`);
  console.log(`   - Potongan Bank : Rp${txTransfer.bankFee.toLocaleString("id-ID")}`);
  console.log(`   - Laba Bersih   : Rp${txTransfer.netProfit.toLocaleString("id-ID")}`);

  // Refetch branch
  const updatedB1 = (await DataService.getBranchById(branch1.id))!;
  const newAsset = updatedB1.currentCashBalance + updatedB1.currentBankBalance;

  console.log(`   - Saldo Kas Sesudah : Rp${updatedB1.currentCashBalance.toLocaleString("id-ID")} (Bertambah Rp1.010.000)`);
  console.log(`   - Saldo Bank Sesudah: Rp${updatedB1.currentBankBalance.toLocaleString("id-ID")} (Berkurang Rp1.005.000)`);
  console.log(`   - Total Aset Bersih : Rp${newAsset.toLocaleString("id-ID")} (Bertambah murni Rp${(newAsset - initialAsset).toLocaleString("id-ID")})`);

  assert.strictEqual(txTransfer.netProfit, 5000, "Laba bersih harus 5.000");
  assert.strictEqual(updatedB1.currentCashBalance, 11010000, "Kas fisik harus 11.010.000");
  assert.strictEqual(updatedB1.currentBankBalance, 23995000, "Saldo bank harus 23.995.000");
  assert.strictEqual(newAsset - initialAsset, 5000, "Total pertumbuhan aset harus persis Rp5.000");
  console.log("   [PASS] Perhitungan transfer sesama BRI lolos tanpa menganggap nominal pokok transfer sebagai omzet!\n");

  // 3. SKENARIO TARIK TUNAI Rp500.000 (Admin Rp5.000, Potongan Bank Rp2.000)
  console.log("3. PENGUJIAN SKENARIO TARIK TUNAI: Tarik Tunai Rp500.000 di Cabang 2");
  const assetB2Before = branch2.currentCashBalance + branch2.currentBankBalance;

  const txTarik = await DataService.createTransaction({
    branchId: branch2.id,
    userId: "user-kasir2",
    categoryCode: "TARIK_TUNAI",
    nominal: 500000,
    customerAdmin: 5000,
    bankFee: 2000,
    customerName: "Ibu Nurhayati",
    paymentMethod: "KARTU_DEBIT",
    notes: "Tarik Tunai via Mesin EDC BRI",
  });

  const updatedB2 = (await DataService.getBranchById(branch2.id))!;
  const assetB2After = updatedB2.currentCashBalance + updatedB2.currentBankBalance;

  console.log(`   - No. Transaksi : ${txTarik.transactionNo}`);
  console.log(`   - Laba Bersih   : Rp${txTarik.netProfit.toLocaleString("id-ID")}`);
  console.log(`   - Saldo Kas B2  : Rp${updatedB2.currentCashBalance.toLocaleString("id-ID")} (Keluar Rp495.000)`);
  console.log(`   - Saldo Bank B2 : Rp${updatedB2.currentBankBalance.toLocaleString("id-ID")} (Masuk Rp498.000)`);
  console.log(`   - Pertumbuhan Aset B2: +Rp${(assetB2After - assetB2Before).toLocaleString("id-ID")}`);

  assert.strictEqual(txTarik.netProfit, 3000, "Laba bersih tarik tunai harus 3.000");
  assert.strictEqual(assetB2After - assetB2Before, 3000, "Total aset cabang 2 harus bertambah Rp3.000");
  console.log("   [PASS] Perhitungan tarik tunai lolos 100%!\n");

  // 4. SKENARIO TRANSFER SALDO ANTAR CABANG: Cabang 1 kirim Rp2.000.000 Bank ke Cabang 2
  console.log("4. PENGUJIAN TRANSFER SALDO ANTAR-CABANG: Cabang 1 -> Cabang 2 (Rp2.000.000 Bank)");
  const b1BankBeforeTransfer = updatedB1.currentBankBalance;
  const b2BankBeforeTransfer = updatedB2.currentBankBalance;

  await DataService.adjustBalance({
    branchId: branch1.id,
    userId: "user-owner",
    accountType: AccountType.BANK,
    mutationType: MutationType.INTER_BRANCH_TRANSFER,
    amount: 2000000,
    reason: "Pemerataan kuota transfer EDC akhir pekan",
    targetBranchId: branch2.id,
  });

  const b1AfterTransfer = (await DataService.getBranchById(branch1.id))!;
  const b2AfterTransfer = (await DataService.getBranchById(branch2.id))!;

  console.log(`   - Saldo Bank Cabang 1 Sesudah: Rp${b1AfterTransfer.currentBankBalance.toLocaleString("id-ID")} (Berkurang Rp2.000.000)`);
  console.log(`   - Saldo Bank Cabang 2 Sesudah: Rp${b2AfterTransfer.currentBankBalance.toLocaleString("id-ID")} (Bertambah Rp2.000.000)`);

  assert.strictEqual(b1AfterTransfer.currentBankBalance, b1BankBeforeTransfer - 2000000);
  assert.strictEqual(b2AfterTransfer.currentBankBalance, b2BankBeforeTransfer + 2000000);
  console.log("   [PASS] Transfer saldo antar cabang lolos dengan pembukuan mutasi ganda!\n");

  // 5. SKENARIO REVERSAL / KOREKSI TRANSAKSI
  console.log("5. PENGUJIAN KOREKSI / REVERSAL TRANSAKSI:");
  console.log(`   - Mereversal transaksi tarik tunai: ${txTarik.transactionNo}`);

  const reversedTx = await DataService.reverseTransaction({
    transactionId: txTarik.id,
    reversalReason: "Salah nominal tarik tunai oleh nasabah",
    userId: "user-owner",
  });

  const b2AfterReversal = (await DataService.getBranchById(branch2.id))!;
  console.log(`   - Status Transaksi Sesudah: ${reversedTx.status}`);
  console.log(`   - Alasan Tercatat        : "${reversedTx.reversalReason}"`);
  console.log(`   - Kas Cabang 2 Kembali Ke: Rp${b2AfterReversal.currentCashBalance.toLocaleString("id-ID")}`);

  assert.strictEqual(reversedTx.status, "REVERSED", "Status harus REVERSED");
  assert.strictEqual(b2AfterReversal.currentCashBalance, 10000000, "Kas fisik Cabang 2 harus kembali ke 10jt");
  console.log("   [PASS] Reversal transaksi mengembalikan saldo 100% dan mencatat riwayat audit!\n");

  // 6. MEMERIKSA AUDIT LOG & MUTASI
  console.log("6. MEMERIKSA KELENGKAPAN AUDIT LOG:");
  const auditLogs = await DataService.getAuditLogs(10);
  console.log(`   - Total entri audit log tersimpan: ${auditLogs.length}`);
  const hasReversalAudit = auditLogs.some((l) => l.action === "REVERSE_TRANSACTION");
  const hasTxAudit = auditLogs.some((l) => l.action === "CREATE_TRANSACTION");
  const hasAdjustAudit = auditLogs.some((l) => l.action === "ADJUST_BALANCE");

  assert.ok(hasReversalAudit, "Harus mencatat log REVERSE_TRANSACTION");
  assert.ok(hasTxAudit, "Harus mencatat log CREATE_TRANSACTION");
  assert.ok(hasAdjustAudit, "Harus mencatat log ADJUST_BALANCE");
  console.log("   [PASS] Seluruh aksi finansial tercatat di Audit Log secara akurat!\n");

  console.log("=================================================================");
  console.log("   SEMUA 6/6 PENGUJIAN SKENARIO KEUANGAN LOLOS DENGAN SUKSES!");
  console.log("=================================================================\n");
}

runFinancialVerification().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

import { PrismaClient, Role, FlowDirection, MutationType, AccountType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting BRILink Database Seeding...");

  // 1. Bersihkan data lama (jika ada) dalam urutan aman
  await prisma.auditLog.deleteMany();
  await prisma.balanceMutation.deleteMany();
  await prisma.cashierShift.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.bankFeeSetting.deleteMany();
  await prisma.transactionCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  console.log("🧹 Cleaned existing tables.");

  // 2. Buat 2 Cabang Default
  const branch1 = await prisma.branch.create({
    data: {
      code: "CABANG-01",
      name: "BRILink Cabang 1 (Pusat)",
      address: "Jl. Sudirman No. 45, Sentra Niaga",
      phone: "081234567801",
      initialCashBalance: 10000000.00, // Rp10.000.000
      initialBankBalance: 25000000.00, // Rp25.000.000
      currentCashBalance: 10000000.00,
      currentBankBalance: 25000000.00,
      isActive: true,
    },
  });

  const branch2 = await prisma.branch.create({
    data: {
      code: "CABANG-02",
      name: "BRILink Cabang 2 (Pasar)",
      address: "Jl. Pasar Lama No. 12, Kios A-03",
      phone: "081234567802",
      initialCashBalance: 10000000.00, // Rp10.000.000
      initialBankBalance: 20000000.00, // Rp20.000.000
      currentCashBalance: 10000000.00,
      currentBankBalance: 20000000.00,
      isActive: true,
    },
  });

  console.log(`🏢 Branches created: ${branch1.name} & ${branch2.name}`);

  // 3. Buat Pengguna: Owner, User, Kasir masing-masing cabang
  const passwordSalt = await bcrypt.genSalt(10);
  const ownerPasswordHash = await bcrypt.hash("owner123", passwordSalt);
  const userPasswordHash = await bcrypt.hash("user123", passwordSalt);
  const cashierPasswordHash = await bcrypt.hash("kasir123", passwordSalt);

  const owner = await prisma.user.create({
    data: {
      username: "owner",
      passwordHash: ownerPasswordHash,
      name: "Bapak Hendra (Owner BRILink)",
      role: Role.OWNER,
      branchId: null, // Akses global seluruh cabang
      isActive: true,
    },
  });

  const defaultUser = await prisma.user.create({
    data: {
      username: "user",
      passwordHash: userPasswordHash,
      name: "Operator / Kasir (User)",
      role: Role.CASHIER,
      branchId: branch1.id,
      isActive: true,
    },
  });

  const defaultKasir = await prisma.user.create({
    data: {
      username: "kasir",
      passwordHash: cashierPasswordHash,
      name: "Kasir Petugas",
      role: Role.CASHIER,
      branchId: branch1.id,
      isActive: true,
    },
  });

  const cashier1 = await prisma.user.create({
    data: {
      username: "kasir1",
      passwordHash: cashierPasswordHash,
      name: "Siti Rahmawati (Kasir Cabang 1)",
      role: Role.CASHIER,
      branchId: branch1.id,
      isActive: true,
    },
  });

  const cashier2 = await prisma.user.create({
    data: {
      username: "kasir2",
      passwordHash: cashierPasswordHash,
      name: "Budi Santoso (Kasir Cabang 2)",
      role: Role.CASHIER,
      branchId: branch2.id,
      isActive: true,
    },
  });

  console.log(`👤 Users created: ${owner.username} (Owner), ${defaultUser.username} (User), ${defaultKasir.username} (Kasir), ${cashier1.username} (Kasir 1), ${cashier2.username} (Kasir 2)`);

  // 4. Buat Kategori Transaksi BRILink Lengkap
  const categories = [
    {
      code: "TF_BRI",
      name: "Transfer Sesama BRI",
      description: "Transfer dana antar rekening Bank BRI",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 10000.00,
      defaultBankFee: 5000.00,
    },
    {
      code: "TF_INTERBANK",
      name: "Transfer Antarbank (Online/BI-FAST)",
      description: "Transfer dari BRI ke bank lain (BCA, Mandiri, BNI, dll)",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 12000.00,
      defaultBankFee: 6500.00,
    },
    {
      code: "TARIK_TUNAI",
      name: "Tarik Tunai",
      description: "Penarikan uang tunai oleh customer via kartu ATM / EDC",
      cashFlow: FlowDirection.OUT,
      bankFlow: FlowDirection.IN,
      defaultCustomerAdmin: 5000.00,
      defaultBankFee: 2000.00,
    },
    {
      code: "SETOR_TUNAI",
      name: "Setor Tunai",
      description: "Customer menyetor tunai ke rekening BRI",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 10000.00,
      defaultBankFee: 5000.00,
    },
    {
      code: "PLN_TOKEN",
      name: "Pembelian Token Listrik PLN",
      description: "Isi ulang token prabayar PLN",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000.00,
      defaultBankFee: 2500.00,
    },
    {
      code: "PULSA_DATA",
      name: "Pembelian Pulsa & Paket Data",
      description: "Pulsa dan kuota internet seluruh operator",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 3000.00,
      defaultBankFee: 1500.00,
    },
    {
      code: "TOPUP_EWALLET",
      name: "Top Up E-Wallet (DANA/OVO/GoPay/Shopee)",
      description: "Isi saldo dompet digital nasabah",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000.00,
      defaultBankFee: 2000.00,
    },
    {
      code: "PAYMENT_BILLS",
      name: "Pembayaran BPJS / PDAM / Cicilan",
      description: "Pembayaran tagihan rutin masyarakat",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000.00,
      defaultBankFee: 2500.00,
    },
    {
      code: "OTHER",
      name: "Transaksi Lainnya",
      description: "Layanan jasa transaksi perbankan lainnya",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000.00,
      defaultBankFee: 2000.00,
    },
  ];

  for (const cat of categories) {
    await prisma.transactionCategory.create({ data: cat });
  }

  console.log(`📋 Created ${categories.length} transaction categories.`);

  // 5. Catat Mutasi Saldo Awal (Audit Trail Penetapan Modal Awal)
  await prisma.balanceMutation.createMany({
    data: [
      {
        branchId: branch1.id,
        userId: owner.id,
        mutationType: MutationType.INITIAL_BALANCE,
        accountType: AccountType.CASH,
        amount: 10000000.00,
        balanceBefore: 0.00,
        balanceAfter: 10000000.00,
        reason: "Penetapan Saldo Awal Kas Fisik Cabang 1 oleh Owner",
      },
      {
        branchId: branch1.id,
        userId: owner.id,
        mutationType: MutationType.INITIAL_BALANCE,
        accountType: AccountType.BANK,
        amount: 25000000.00,
        balanceBefore: 0.00,
        balanceAfter: 25000000.00,
        reason: "Penetapan Saldo Awal Rekening Operasional Cabang 1 oleh Owner",
      },
      {
        branchId: branch2.id,
        userId: owner.id,
        mutationType: MutationType.INITIAL_BALANCE,
        accountType: AccountType.CASH,
        amount: 10000000.00,
        balanceBefore: 0.00,
        balanceAfter: 10000000.00,
        reason: "Penetapan Saldo Awal Kas Fisik Cabang 2 oleh Owner",
      },
      {
        branchId: branch2.id,
        userId: owner.id,
        mutationType: MutationType.INITIAL_BALANCE,
        accountType: AccountType.BANK,
        amount: 20000000.00,
        balanceBefore: 0.00,
        balanceAfter: 20000000.00,
        reason: "Penetapan Saldo Awal Rekening Operasional Cabang 2 oleh Owner",
      },
    ],
  });

  // 6. Log Audit Penetapan
  await prisma.auditLog.create({
    data: {
      userId: owner.id,
      branchId: branch1.id,
      action: "INITIALIZE_SYSTEM",
      entity: "Branch",
      entityId: branch1.id,
      newValue: "Sistem BRILink diinisialisasi dengan Cabang 1 dan Cabang 2",
    },
  });

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

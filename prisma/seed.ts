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

  // 2. Buat 2 Cabang Default dengan ID deterministik
  const branch1 = await prisma.branch.create({
    data: {
      id: "branch-01",
      code: "CABANG-01",
      name: "Hani BRILink",
      address: "Cabang 1 - Hani BRILink",
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
      id: "branch-02",
      code: "CABANG-02",
      name: "Rahmat Berkah",
      address: "Cabang 2 - Rahmat Berkah",
      phone: "081234567802",
      initialCashBalance: 10000000.00, // Rp10.000.000
      initialBankBalance: 20000000.00, // Rp20.000.000
      currentCashBalance: 10000000.00,
      currentBankBalance: 20000000.00,
      isActive: true,
    },
  });

  console.log(`🏢 Branches created: ${branch1.name} & ${branch2.name}`);

  // 3. Buat Pengguna: Owner & Kasir masing-masing cabang
  const passwordSalt = await bcrypt.genSalt(10);
  const ownerPasswordHash = await bcrypt.hash("owner123", passwordSalt);
  const cashierPasswordHash = await bcrypt.hash("kasir123", passwordSalt);

  const owner = await prisma.user.create({
    data: {
      id: "user-owner",
      username: "owner",
      passwordHash: ownerPasswordHash,
      name: "Owner (Hani BRILink & Rahmat Berkah)",
      role: Role.OWNER,
      branchId: null, // Akses global seluruh cabang
      isActive: true,
    },
  });

  const cashier1 = await prisma.user.create({
    data: {
      id: "user-kasir1",
      username: "kasir1",
      passwordHash: cashierPasswordHash,
      name: "Kasir Hani BRILink",
      role: Role.CASHIER,
      branchId: branch1.id,
      isActive: true,
    },
  });

  const cashier2 = await prisma.user.create({
    data: {
      id: "user-kasir2",
      username: "kasir2",
      passwordHash: cashierPasswordHash,
      name: "Kasir Rahmat Berkah",
      role: Role.CASHIER,
      branchId: branch2.id,
      isActive: true,
    },
  });

  console.log(`👤 Users created: ${owner.username} (Owner), ${cashier1.username} (Hani BRILink), ${cashier2.username} (Rahmat Berkah)`);

  // 4. Buat Kategori Transaksi BRILink Lengkap
  const categories = [
    {
      id: "cat-tf-bri",
      code: "TF_BRI",
      name: "Transfer Sesama BRI",
      description: "Transfer dana antar rekening Bank BRI",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 10000.00,
      defaultBankFee: 5000.00,
    },
    {
      id: "cat-tf-interbank",
      code: "TF_INTERBANK",
      name: "Transfer Antarbank (Online/BI-FAST)",
      description: "Transfer dari BRI ke bank lain (BCA, Mandiri, BNI, dll)",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 12000.00,
      defaultBankFee: 6500.00,
    },
    {
      id: "cat-tarik-tunai",
      code: "TARIK_TUNAI",
      name: "Tarik Tunai",
      description: "Penarikan uang tunai oleh customer via kartu ATM / EDC",
      cashFlow: FlowDirection.OUT,
      bankFlow: FlowDirection.IN,
      defaultCustomerAdmin: 5000.00,
      defaultBankFee: 2000.00,
    },
    {
      id: "cat-setor-tunai",
      code: "SETOR_TUNAI",
      name: "Setor Tunai",
      description: "Customer menyetor tunai ke rekening BRI",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 10000.00,
      defaultBankFee: 5000.00,
    },
    {
      id: "cat-pln",
      code: "PLN_TOKEN",
      name: "Pembelian Token Listrik PLN",
      description: "Isi ulang token prabayar PLN",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000.00,
      defaultBankFee: 2500.00,
    },
    {
      id: "cat-pulsa",
      code: "PULSA_DATA",
      name: "Pembelian Pulsa & Paket Data",
      description: "Pulsa dan kuota internet seluruh operator",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 3000.00,
      defaultBankFee: 1500.00,
    },
    {
      id: "cat-ewallet",
      code: "TOPUP_EWALLET",
      name: "Top Up E-Wallet (DANA/OVO/GoPay/Shopee)",
      description: "Isi saldo dompet digital nasabah",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000.00,
      defaultBankFee: 2000.00,
    },
    {
      id: "cat-bills",
      code: "PAYMENT_BILLS",
      name: "Pembayaran BPJS / PDAM / Cicilan",
      description: "Pembayaran tagihan rutin masyarakat",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000.00,
      defaultBankFee: 2500.00,
    },
    {
      id: "cat-other",
      code: "LAINNYA",
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
        reason: "Penetapan Saldo Awal Kas Fisik Hani BRILink oleh Owner",
      },
      {
        branchId: branch1.id,
        userId: owner.id,
        mutationType: MutationType.INITIAL_BALANCE,
        accountType: AccountType.BANK,
        amount: 25000000.00,
        balanceBefore: 0.00,
        balanceAfter: 25000000.00,
        reason: "Penetapan Saldo Awal Rekening Operasional Hani BRILink oleh Owner",
      },
      {
        branchId: branch2.id,
        userId: owner.id,
        mutationType: MutationType.INITIAL_BALANCE,
        accountType: AccountType.CASH,
        amount: 10000000.00,
        balanceBefore: 0.00,
        balanceAfter: 10000000.00,
        reason: "Penetapan Saldo Awal Kas Fisik Rahmat Berkah oleh Owner",
      },
      {
        branchId: branch2.id,
        userId: owner.id,
        mutationType: MutationType.INITIAL_BALANCE,
        accountType: AccountType.BANK,
        amount: 20000000.00,
        balanceBefore: 0.00,
        balanceAfter: 20000000.00,
        reason: "Penetapan Saldo Awal Rekening Operasional Rahmat Berkah oleh Owner",
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
      newValue: "Sistem BRILink diinisialisasi dengan cabang Hani BRILink dan Rahmat Berkah",
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

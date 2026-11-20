import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "./db";
import { calculateTransactionFinancials } from "./calculations";
import { Role, TransactionStatus, AccountType, MutationType, FlowDirection } from "@prisma/client";

export interface BranchData {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  initialCashBalance: number;
  initialBankBalance: number;
  currentCashBalance: number;
  currentBankBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  isActive: boolean;
  branchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  cashFlow: FlowDirection;
  bankFlow: FlowDirection;
  defaultCustomerAdmin: number;
  defaultBankFee: number;
  isActive: boolean;
}

export interface TransactionData {
  id: string;
  transactionNo: string;
  branchId: string;
  branchName?: string;
  userId: string;
  cashierName?: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  customerName: string | null;
  nominal: number;
  customerAdmin: number;
  bankFee: number;
  netProfit: number;
  cashReceived: number;
  cashGiven: number;
  bankReceived: number;
  bankDeducted: number;
  paymentMethod: string;
  notes: string | null;
  status: TransactionStatus;
  reversalReason: string | null;
  reversedAt: string | null;
  reversedBy: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MutationData {
  id: string;
  branchId: string;
  branchName?: string;
  userId: string;
  userName?: string;
  accountType: AccountType;
  mutationType: MutationType;
  flowDirection: FlowDirection;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string | null;
  description: string;
  createdAt: string;
}

export interface AuditLogData {
  id: string;
  userId: string | null;
  userName: string | null;
  branchId: string | null;
  action: string;
  resource: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
}

export interface CashierShiftData {
  id: string;
  branchId: string;
  userId: string;
  cashierName: string;
  startTime: string;
  endTime: string | null;
  startingCash: number;
  endingCash: number | null;
  totalTransactions: number;
  totalNetProfit: number;
  status: "OPEN" | "CLOSED";
  notes: string | null;
}

interface StoreSchema {
  branches: BranchData[];
  users: UserData[];
  categories: CategoryData[];
  transactions: TransactionData[];
  mutations: MutationData[];
  auditLogs: AuditLogData[];
  shifts: CashierShiftData[];
}

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "brilink-data")
  : path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "brilink_store.json");

let memoryStore: StoreSchema | null = null;

// Default initial seed data for local storage
function getInitialSeedData(): StoreSchema {
  // Pre-hashed passwords:
  // owner123 -> $2a$10$vK6kZ.31d5HlIic6d9o47uQvVl/uKxZJ40Xh3P27Ffq70nLg14bce (or generated)
  // kasir123 -> $2a$10$gN3mZkGln0mF4y12vXbS4.oFj0N1h3k5K1G16V9eH51s6r7t8u9vi
  // We'll use bcrypt hash for 'owner123' and 'kasir123'
  const ownerHash = "$2a$10$ZXoyItgv3nckooY4PRTvxeWCb3.5vlcqDKmreN7S/H5bxfgZCpjDi"; // owner123
  const kasirHash = "$2a$10$5nnqfXUt1PyBiyfGMHME4u5uzFdDKxyyvja7oc6VZmmNIPdrOnZvG"; // kasir123

  const branch1: BranchData = {
    id: "branch-01",
    code: "CABANG-01",
    name: "BRILink Cabang 1 (Pusat)",
    address: "Jl. Sudirman No. 45, Sentra Niaga",
    phone: "081234567801",
    isActive: true,
    initialCashBalance: 10000000,
    initialBankBalance: 25000000,
    currentCashBalance: 10000000,
    currentBankBalance: 25000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const branch2: BranchData = {
    id: "branch-02",
    code: "CABANG-02",
    name: "BRILink Cabang 2 (Pasar)",
    address: "Jl. Pasar Lama No. 12, Kios A-03",
    phone: "081234567802",
    isActive: true,
    initialCashBalance: 10000000,
    initialBankBalance: 20000000,
    currentCashBalance: 10000000,
    currentBankBalance: 20000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const users: UserData[] = [
    {
      id: "user-owner",
      username: "owner",
      passwordHash: ownerHash,
      name: "Bapak Hendra (Owner)",
      role: Role.OWNER,
      isActive: true,
      branchId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "user-kasir1",
      username: "kasir1",
      passwordHash: kasirHash,
      name: "Siti Rahmawati (Kasir 1)",
      role: Role.CASHIER,
      isActive: true,
      branchId: "branch-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "user-kasir2",
      username: "kasir2",
      passwordHash: kasirHash,
      name: "Budi Santoso (Kasir 2)",
      role: Role.CASHIER,
      isActive: true,
      branchId: "branch-02",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const categories: CategoryData[] = [
    {
      id: "cat-tf-bri",
      code: "TF_BRI",
      name: "Transfer Sesama BRI",
      description: "Transfer dana ke rekening Bank BRI nasabah",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 10000,
      defaultBankFee: 5000,
      isActive: true,
    },
    {
      id: "cat-tf-interbank",
      code: "TF_INTERBANK",
      name: "Transfer Antarbank (Online/BI-FAST)",
      description: "Transfer dari BRI ke BCA, Mandiri, BNI, dll",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 12000,
      defaultBankFee: 6500,
      isActive: true,
    },
    {
      id: "cat-tarik-tunai",
      code: "TARIK_TUNAI",
      name: "Tarik Tunai",
      description: "Customer tarik uang tunai via kartu ATM / EDC Agen",
      cashFlow: FlowDirection.OUT,
      bankFlow: FlowDirection.IN,
      defaultCustomerAdmin: 5000,
      defaultBankFee: 2000,
      isActive: true,
    },
    {
      id: "cat-setor-tunai",
      code: "SETOR_TUNAI",
      name: "Setor Tunai",
      description: "Setor uang tunai langsung ke rekening BRI",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 10000,
      defaultBankFee: 5000,
      isActive: true,
    },
    {
      id: "cat-pln",
      code: "PLN_TOKEN",
      name: "Pembelian Token Listrik PLN",
      description: "Isi ulang token prabayar PLN nasabah",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000,
      defaultBankFee: 2500,
      isActive: true,
    },
    {
      id: "cat-pulsa",
      code: "PULSA_DATA",
      name: "Pembelian Pulsa & Kuota Data",
      description: "Isi pulsa seluler dan paket data",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 3000,
      defaultBankFee: 1500,
      isActive: true,
    },
    {
      id: "cat-ewallet",
      code: "TOPUP_EWALLET",
      name: "Top Up E-Wallet (DANA/OVO/GoPay/Shopee)",
      description: "Pengisian saldo dompet digital customer",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000,
      defaultBankFee: 2000,
      isActive: true,
    },
    {
      id: "cat-bills",
      code: "PAYMENT_BILLS",
      name: "Pembayaran BPJS / PDAM / Cicilan",
      description: "Pembayaran tagihan rutin bulanan nasabah",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000,
      defaultBankFee: 2500,
      isActive: true,
    },
    {
      id: "cat-other",
      code: "LAINNYA",
      name: "Transaksi Lainnya",
      description: "Layanan jasa perbankan lainnya",
      cashFlow: FlowDirection.IN,
      bankFlow: FlowDirection.OUT,
      defaultCustomerAdmin: 5000,
      defaultBankFee: 2000,
      isActive: true,
    },
  ];

  const now = new Date().toISOString();

  const mutations: MutationData[] = [
    {
      id: "mut-init-1-cash",
      branchId: branch1.id,
      branchName: branch1.name,
      userId: "user-owner",
      userName: "Bapak Hendra (Owner)",
      accountType: AccountType.CASH,
      mutationType: MutationType.INITIAL_BALANCE,
      flowDirection: FlowDirection.IN,
      amount: 10000000,
      balanceBefore: 0,
      balanceAfter: 10000000,
      referenceId: null,
      description: "Penetapan Saldo Awal Kas Fisik Cabang 1 oleh Owner",
      createdAt: now,
    },
    {
      id: "mut-init-1-bank",
      branchId: branch1.id,
      branchName: branch1.name,
      userId: "user-owner",
      userName: "Bapak Hendra (Owner)",
      accountType: AccountType.BANK,
      mutationType: MutationType.INITIAL_BALANCE,
      flowDirection: FlowDirection.IN,
      amount: 25000000,
      balanceBefore: 0,
      balanceAfter: 25000000,
      referenceId: null,
      description: "Penetapan Saldo Awal Rekening Bank/EDC Cabang 1 oleh Owner",
      createdAt: now,
    },
    {
      id: "mut-init-2-cash",
      branchId: branch2.id,
      branchName: branch2.name,
      userId: "user-owner",
      userName: "Bapak Hendra (Owner)",
      accountType: AccountType.CASH,
      mutationType: MutationType.INITIAL_BALANCE,
      flowDirection: FlowDirection.IN,
      amount: 10000000,
      balanceBefore: 0,
      balanceAfter: 10000000,
      referenceId: null,
      description: "Penetapan Saldo Awal Kas Fisik Cabang 2 oleh Owner",
      createdAt: now,
    },
    {
      id: "mut-init-2-bank",
      branchId: branch2.id,
      branchName: branch2.name,
      userId: "user-owner",
      userName: "Bapak Hendra (Owner)",
      accountType: AccountType.BANK,
      mutationType: MutationType.INITIAL_BALANCE,
      flowDirection: FlowDirection.IN,
      amount: 20000000,
      balanceBefore: 0,
      balanceAfter: 20000000,
      referenceId: null,
      description: "Penetapan Saldo Awal Rekening Bank/EDC Cabang 2 oleh Owner",
      createdAt: now,
    },
  ];

  const auditLogs: AuditLogData[] = [
    {
      id: "log-init-1",
      userId: "user-owner",
      userName: "Bapak Hendra (Owner)",
      branchId: null,
      action: "INIT_SYSTEM",
      resource: "SYSTEM",
      details: "Sistem BRILink Management System diinisialisasi untuk 2 cabang.",
      ipAddress: "127.0.0.1",
      createdAt: now,
    },
  ];

  return {
    branches: [branch1, branch2],
    users,
    categories,
    transactions: [],
    mutations,
    auditLogs,
    shifts: [],
  };
}

function loadStore(): StoreSchema {
  if (memoryStore) {
    return memoryStore;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial = getInitialSeedData();
      try {
        fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
      } catch {}
      memoryStore = initial;
      return initial;
    }
    const content = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(content);
    memoryStore = parsed;
    return parsed;
  } catch (err) {
    console.error("Error reading store, initializing fresh store:", err);
    const initial = getInitialSeedData();
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
    } catch {}
    memoryStore = initial;
    return initial;
  }
}

function saveStore(store: StoreSchema): void {
  memoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    // If filesystem write fails on serverless, memoryStore still persists in-container
    console.warn("Notice: Storage written to memory cache:", err);
  }
}

let isPrismaAvailable: boolean | null = null;
async function checkPrisma(): Promise<boolean> {
  if (isPrismaAvailable !== null) return isPrismaAvailable;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isPrismaAvailable = true;
  } catch {
    isPrismaAvailable = false;
  }
  return isPrismaAvailable;
}

export class DataService {
  // === BRANCHES ===
  static async getBranches(): Promise<BranchData[]> {
    const store = loadStore();
    return store.branches;
  }

  static async getBranchById(id: string): Promise<BranchData | null> {
    const store = loadStore();
    return store.branches.find((b) => b.id === id || b.code === id) || null;
  }

  // === USERS & AUTH ===
  static async getUsers(): Promise<UserData[]> {
    const store = loadStore();
    return store.users;
  }

  static async getUserByUsername(username: string): Promise<UserData | null> {
    const store = loadStore();
    return store.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  static async getUserById(id: string): Promise<UserData | null> {
    const store = loadStore();
    return store.users.find((u) => u.id === id) || null;
  }

  static async createCashier(data: {
    username: string;
    passwordHash: string;
    name: string;
    branchId: string;
  }): Promise<UserData> {
    const store = loadStore();
    const existing = store.users.find((u) => u.username.toLowerCase() === data.username.toLowerCase());
    if (existing) {
      throw new Error(`Username ${data.username} sudah digunakan.`);
    }

    const newUser: UserData = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: data.username,
      passwordHash: data.passwordHash,
      name: data.name,
      role: Role.CASHIER,
      isActive: true,
      branchId: data.branchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    saveStore(store);

    await this.logAudit({
      userId: null,
      userName: "Owner Action",
      branchId: data.branchId,
      action: "CREATE_CASHIER",
      resource: "USER",
      details: `Membuat akun kasir baru: ${data.name} (${data.username}) untuk cabang ${data.branchId}`,
    });

    return newUser;
  }

  static async toggleUserStatus(id: string, isActive: boolean): Promise<UserData> {
    const store = loadStore();
    const user = store.users.find((u) => u.id === id);
    if (!user) throw new Error("Pengguna tidak ditemukan.");

    user.isActive = isActive;
    user.updatedAt = new Date().toISOString();
    saveStore(store);

    await this.logAudit({
      userId: null,
      userName: "Owner Action",
      branchId: user.branchId,
      action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      resource: "USER",
      details: `Mengubah status user ${user.username} menjadi ${isActive ? "Aktif" : "Nonaktif"}`,
    });

    return user;
  }

  // === CATEGORIES ===
  static async getCategories(): Promise<CategoryData[]> {
    const store = loadStore();
    return store.categories.filter((c) => c.isActive);
  }

  static async getCategoryByCode(code: string): Promise<CategoryData | null> {
    const store = loadStore();
    return store.categories.find((c) => c.code === code) || null;
  }

  // === TRANSACTIONS ===
  static async getTransactions(params?: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    categoryCode?: string;
    userId?: string;
    limit?: number;
  }): Promise<TransactionData[]> {
    const store = loadStore();
    let list = [...store.transactions];

    if (params?.branchId && params.branchId !== "ALL") {
      list = list.filter((t) => t.branchId === params.branchId);
    }
    if (params?.categoryCode && params.categoryCode !== "ALL") {
      list = list.filter((t) => t.categoryCode === params.categoryCode);
    }
    if (params?.userId) {
      list = list.filter((t) => t.userId === params.userId);
    }
    if (params?.startDate) {
      const start = new Date(params.startDate).getTime();
      list = list.filter((t) => new Date(t.createdAt).getTime() >= start);
    }
    if (params?.endDate) {
      const end = new Date(params.endDate).getTime();
      list = list.filter((t) => new Date(t.createdAt).getTime() <= end);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (params?.limit && params.limit > 0) {
      return list.slice(0, params.limit);
    }
    return list;
  }

  static async getTransactionById(id: string): Promise<TransactionData | null> {
    const store = loadStore();
    return store.transactions.find((t) => t.id === id || t.transactionNo === id) || null;
  }

  static async createTransaction(input: {
    branchId: string;
    userId: string;
    categoryCode: string;
    nominal: number;
    customerAdmin: number;
    bankFee: number;
    customerName?: string;
    paymentMethod?: string;
    notes?: string;
    idempotencyKey?: string;
  }): Promise<TransactionData> {
    const store = loadStore();

    // 1. Idempotency protection against double submit
    if (input.idempotencyKey) {
      const existing = store.transactions.find((t) => t.idempotencyKey === input.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const branch = store.branches.find((b) => b.id === input.branchId);
    if (!branch) throw new Error("Cabang tidak valid.");

    const user = store.users.find((u) => u.id === input.userId);
    if (!user) throw new Error("Kasir tidak ditemukan.");

    const category = store.categories.find((c) => c.code === input.categoryCode);
    if (!category) throw new Error("Kategori transaksi tidak ditemukan.");

    // 2. Perform accurate financial calculation
    const calc = calculateTransactionFinancials({
      categoryCode: input.categoryCode,
      nominal: input.nominal,
      customerAdmin: input.customerAdmin,
      bankFee: input.bankFee,
    });

    if (!calc.balanceCheckPassed) {
      throw new Error("Gagal validasi neraca: Selisih saldo kas dan bank tidak seimbang dengan keuntungan bersih.");
    }

    // 3. Check sufficient funds
    if (calc.cashFlowChange < 0 && branch.currentCashBalance + calc.cashFlowChange < 0) {
      throw new Error(`Saldo Kas Fisik cabang tidak mencukupi (Tersedia: Rp${branch.currentCashBalance.toLocaleString("id-ID")}, Dibutuhkan: Rp${Math.abs(calc.cashFlowChange).toLocaleString("id-ID")}).`);
    }
    if (calc.bankFlowChange < 0 && branch.currentBankBalance + calc.bankFlowChange < 0) {
      throw new Error(`Saldo Rekening Bank/EDC cabang tidak mencukupi (Tersedia: Rp${branch.currentBankBalance.toLocaleString("id-ID")}, Dibutuhkan: Rp${Math.abs(calc.bankFlowChange).toLocaleString("id-ID")}).`);
    }

    // 4. Generate transaction number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transactionNo = `TRX-${dateStr}-${randomSuffix}`;
    const txId = `tx-${Date.now()}-${randomSuffix}`;
    const timestamp = today.toISOString();

    // 5. Update branch balance atomically
    const cashBefore = branch.currentCashBalance;
    const bankBefore = branch.currentBankBalance;

    branch.currentCashBalance += calc.cashFlowChange;
    branch.currentBankBalance += calc.bankFlowChange;
    branch.updatedAt = timestamp;

    const cashAfter = branch.currentCashBalance;
    const bankAfter = branch.currentBankBalance;

    // 6. Create mutation entries for Cash & Bank
    if (calc.cashFlowChange !== 0) {
      const mutCash: MutationData = {
        id: `mut-cash-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        branchId: branch.id,
        branchName: branch.name,
        userId: user.id,
        userName: user.name,
        accountType: AccountType.CASH,
        mutationType: MutationType.TRANSACTION,
        flowDirection: calc.cashFlowChange > 0 ? FlowDirection.IN : FlowDirection.OUT,
        amount: Math.abs(calc.cashFlowChange),
        balanceBefore: cashBefore,
        balanceAfter: cashAfter,
        referenceId: txId,
        description: `Transaksi ${category.name} (${transactionNo}) - Kas Fisik`,
        createdAt: timestamp,
      };
      store.mutations.unshift(mutCash);
    }

    if (calc.bankFlowChange !== 0) {
      const mutBank: MutationData = {
        id: `mut-bank-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        branchId: branch.id,
        branchName: branch.name,
        userId: user.id,
        userName: user.name,
        accountType: AccountType.BANK,
        mutationType: MutationType.TRANSACTION,
        flowDirection: calc.bankFlowChange > 0 ? FlowDirection.IN : FlowDirection.OUT,
        amount: Math.abs(calc.bankFlowChange),
        balanceBefore: bankBefore,
        balanceAfter: bankAfter,
        referenceId: txId,
        description: `Transaksi ${category.name} (${transactionNo}) - Saldo Rekening/EDC`,
        createdAt: timestamp,
      };
      store.mutations.unshift(mutBank);
    }

    // 7. Save transaction
    const newTx: TransactionData = {
      id: txId,
      transactionNo,
      branchId: branch.id,
      branchName: branch.name,
      userId: user.id,
      cashierName: user.name,
      categoryId: category.id,
      categoryCode: category.code,
      categoryName: category.name,
      customerName: input.customerName || null,
      nominal: calc.nominal,
      customerAdmin: calc.customerAdmin,
      bankFee: calc.bankFee,
      netProfit: calc.netProfit,
      cashReceived: calc.cashReceived,
      cashGiven: calc.cashGiven,
      bankReceived: calc.bankReceived,
      bankDeducted: calc.bankDeducted,
      paymentMethod: input.paymentMethod || "TUNAI",
      notes: input.notes || null,
      status: TransactionStatus.COMPLETED,
      reversalReason: null,
      reversedAt: null,
      reversedBy: null,
      idempotencyKey: input.idempotencyKey || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    store.transactions.unshift(newTx);
    saveStore(store);

    await this.logAudit({
      userId: user.id,
      userName: user.name,
      branchId: branch.id,
      action: "CREATE_TRANSACTION",
      resource: "TRANSACTION",
      details: `Transaksi ${transactionNo}: ${category.name} Rp${calc.nominal.toLocaleString("id-ID")}, Laba: Rp${calc.netProfit.toLocaleString("id-ID")}`,
    });

    return newTx;
  }

  // === REVERSAL / KOREKSI TRANSAKSI ===
  static async reverseTransaction(input: {
    transactionId: string;
    reversalReason: string;
    userId: string;
  }): Promise<TransactionData> {
    const store = loadStore();
    const tx = store.transactions.find((t) => t.id === input.transactionId || t.transactionNo === input.transactionId);
    if (!tx) throw new Error("Transaksi tidak ditemukan.");

    if (tx.status === TransactionStatus.REVERSED) {
      throw new Error("Transaksi ini sudah pernah dibatalkan / dikoreksi sebelumnya.");
    }

    const branch = store.branches.find((b) => b.id === tx.branchId);
    if (!branch) throw new Error("Cabang tidak valid.");

    const user = store.users.find((u) => u.id === input.userId);
    const userName = user ? user.name : "System";

    const timestamp = new Date().toISOString();

    // Reversal balance movement: exact reverse of original movement
    // Original cash flow was: cashReceived - cashGiven
    const originalCashFlow = tx.cashReceived - tx.cashGiven;
    const originalBankFlow = tx.bankReceived - tx.bankDeducted;

    const reverseCashFlow = -originalCashFlow;
    const reverseBankFlow = -originalBankFlow;

    const cashBefore = branch.currentCashBalance;
    const bankBefore = branch.currentBankBalance;

    branch.currentCashBalance += reverseCashFlow;
    branch.currentBankBalance += reverseBankFlow;
    branch.updatedAt = timestamp;

    const cashAfter = branch.currentCashBalance;
    const bankAfter = branch.currentBankBalance;

    // Mutasi Koreksi Kas
    if (reverseCashFlow !== 0) {
      store.mutations.unshift({
        id: `mut-rev-cash-${Date.now()}`,
        branchId: branch.id,
        branchName: branch.name,
        userId: input.userId,
        userName,
        accountType: AccountType.CASH,
        mutationType: MutationType.TRANSACTION_REVERSAL,
        flowDirection: reverseCashFlow > 0 ? FlowDirection.IN : FlowDirection.OUT,
        amount: Math.abs(reverseCashFlow),
        balanceBefore: cashBefore,
        balanceAfter: cashAfter,
        referenceId: tx.id,
        description: `Koreksi / Reversal Transaksi ${tx.transactionNo} - Kas Fisik (Alasan: ${input.reversalReason})`,
        createdAt: timestamp,
      });
    }

    // Mutasi Koreksi Bank
    if (reverseBankFlow !== 0) {
      store.mutations.unshift({
        id: `mut-rev-bank-${Date.now()}`,
        branchId: branch.id,
        branchName: branch.name,
        userId: input.userId,
        userName,
        accountType: AccountType.BANK,
        mutationType: MutationType.TRANSACTION_REVERSAL,
        flowDirection: reverseBankFlow > 0 ? FlowDirection.IN : FlowDirection.OUT,
        amount: Math.abs(reverseBankFlow),
        balanceBefore: bankBefore,
        balanceAfter: bankAfter,
        referenceId: tx.id,
        description: `Koreksi / Reversal Transaksi ${tx.transactionNo} - Saldo Bank (Alasan: ${input.reversalReason})`,
        createdAt: timestamp,
      });
    }

    // Update status transaksi
    tx.status = TransactionStatus.REVERSED;
    tx.reversalReason = input.reversalReason;
    tx.reversedAt = timestamp;
    tx.reversedBy = userName;
    tx.updatedAt = timestamp;

    saveStore(store);

    await this.logAudit({
      userId: input.userId,
      userName,
      branchId: branch.id,
      action: "REVERSE_TRANSACTION",
      resource: "TRANSACTION",
      details: `Reversal Transaksi ${tx.transactionNo}. Alasan: ${input.reversalReason}`,
    });

    return tx;
  }

  // === BALANCE MANAGEMENT (SALDO CABANG) ===
  static async adjustBalance(input: {
    branchId: string;
    userId: string;
    accountType: AccountType;
    mutationType: MutationType;
    amount: number;
    reason: string;
    targetBranchId?: string; // Untuk transfer antar cabang
  }): Promise<{ success: boolean; message: string }> {
    const store = loadStore();
    const branch = store.branches.find((b) => b.id === input.branchId);
    if (!branch) throw new Error("Cabang sumber tidak ditemukan.");

    const user = store.users.find((u) => u.id === input.userId);
    const userName = user ? user.name : "Owner";
    const timestamp = new Date().toISOString();
    const amount = Number(input.amount);

    if (amount <= 0) throw new Error("Nominal harus lebih besar dari 0.");

    if (input.mutationType === MutationType.CAPITAL_INJECTION) {
      // Penambahan modal
      const before = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;
      if (input.accountType === AccountType.CASH) {
        branch.currentCashBalance += amount;
      } else {
        branch.currentBankBalance += amount;
      }
      const after = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;

      store.mutations.unshift({
        id: `mut-inject-${Date.now()}`,
        branchId: branch.id,
        branchName: branch.name,
        userId: input.userId,
        userName,
        accountType: input.accountType,
        mutationType: MutationType.CAPITAL_INJECTION,
        flowDirection: FlowDirection.IN,
        amount,
        balanceBefore: before,
        balanceAfter: after,
        referenceId: null,
        description: `Penambahan Modal (${input.accountType === AccountType.CASH ? "Kas Fisik" : "Saldo Bank"}): ${input.reason}`,
        createdAt: timestamp,
      });
    } else if (input.mutationType === MutationType.CAPITAL_WITHDRAWAL) {
      // Penarikan modal oleh owner
      const before = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;
      if (before < amount) {
        throw new Error("Saldo tidak mencukupi untuk penarikan modal.");
      }
      if (input.accountType === AccountType.CASH) {
        branch.currentCashBalance -= amount;
      } else {
        branch.currentBankBalance -= amount;
      }
      const after = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;

      store.mutations.unshift({
        id: `mut-withdraw-${Date.now()}`,
        branchId: branch.id,
        branchName: branch.name,
        userId: input.userId,
        userName,
        accountType: input.accountType,
        mutationType: MutationType.CAPITAL_WITHDRAWAL,
        flowDirection: FlowDirection.OUT,
        amount,
        balanceBefore: before,
        balanceAfter: after,
        referenceId: null,
        description: `Penarikan Modal (${input.accountType === AccountType.CASH ? "Kas Fisik" : "Saldo Bank"}): ${input.reason}`,
        createdAt: timestamp,
      });
    } else if (input.mutationType === MutationType.INTER_BRANCH_TRANSFER) {
      // Transfer dana antar cabang
      if (!input.targetBranchId) throw new Error("Cabang tujuan harus dipilih.");
      const targetBranch = store.branches.find((b) => b.id === input.targetBranchId);
      if (!targetBranch) throw new Error("Cabang tujuan tidak ditemukan.");
      if (targetBranch.id === branch.id) throw new Error("Cabang sumber dan tujuan tidak boleh sama.");

      const sourceBefore = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;
      if (sourceBefore < amount) {
        throw new Error(`Saldo ${branch.name} tidak mencukupi untuk transfer ke ${targetBranch.name}.`);
      }

      // Potong cabang sumber
      if (input.accountType === AccountType.CASH) {
        branch.currentCashBalance -= amount;
      } else {
        branch.currentBankBalance -= amount;
      }
      const sourceAfter = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;

      // Tambah cabang tujuan
      const targetBefore = input.accountType === AccountType.CASH ? targetBranch.currentCashBalance : targetBranch.currentBankBalance;
      if (input.accountType === AccountType.CASH) {
        targetBranch.currentCashBalance += amount;
      } else {
        targetBranch.currentBankBalance += amount;
      }
      const targetAfter = input.accountType === AccountType.CASH ? targetBranch.currentCashBalance : targetBranch.currentBankBalance;

      // Catat mutasi keluar di cabang sumber
      store.mutations.unshift({
        id: `mut-ibt-out-${Date.now()}`,
        branchId: branch.id,
        branchName: branch.name,
        userId: input.userId,
        userName,
        accountType: input.accountType,
        mutationType: MutationType.INTER_BRANCH_TRANSFER,
        flowDirection: FlowDirection.OUT,
        amount,
        balanceBefore: sourceBefore,
        balanceAfter: sourceAfter,
        referenceId: targetBranch.id,
        description: `Transfer saldo ke ${targetBranch.name} (${input.accountType}): ${input.reason}`,
        createdAt: timestamp,
      });

      // Catat mutasi masuk di cabang tujuan
      store.mutations.unshift({
        id: `mut-ibt-in-${Date.now()}`,
        branchId: targetBranch.id,
        branchName: targetBranch.name,
        userId: input.userId,
        userName,
        accountType: input.accountType,
        mutationType: MutationType.INTER_BRANCH_TRANSFER,
        flowDirection: FlowDirection.IN,
        amount,
        balanceBefore: targetBefore,
        balanceAfter: targetAfter,
        referenceId: branch.id,
        description: `Terima transfer saldo dari ${branch.name} (${input.accountType}): ${input.reason}`,
        createdAt: timestamp,
      });
    } else if (input.mutationType === MutationType.ADJUSTMENT || input.mutationType === MutationType.INITIAL_BALANCE) {
      // Penyesuaian saldo (misal stock opname / opname kas fisik)
      const before = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;
      const diff = amount - before;

      if (input.accountType === AccountType.CASH) {
        branch.currentCashBalance = amount;
      } else {
        branch.currentBankBalance = amount;
      }

      store.mutations.unshift({
        id: `mut-adj-${Date.now()}`,
        branchId: branch.id,
        branchName: branch.name,
        userId: input.userId,
        userName,
        accountType: input.accountType,
        mutationType: input.mutationType,
        flowDirection: diff >= 0 ? FlowDirection.IN : FlowDirection.OUT,
        amount: Math.abs(diff),
        balanceBefore: before,
        balanceAfter: amount,
        referenceId: null,
        description: `Penyesuaian Saldo (${input.accountType}): Set menjadi Rp${amount.toLocaleString("id-ID")}. Alasan: ${input.reason}`,
        createdAt: timestamp,
      });
    }

    branch.updatedAt = timestamp;
    saveStore(store);

    await this.logAudit({
      userId: input.userId,
      userName,
      branchId: branch.id,
      action: "ADJUST_BALANCE",
      resource: "BRANCH_BALANCE",
      details: `${input.mutationType} pada ${branch.name} sebesar Rp${amount.toLocaleString("id-ID")}. Alasan: ${input.reason}`,
    });

    return { success: true, message: "Saldo berhasil diperbarui dan mutasi tercatat." };
  }

  // === MUTATIONS ===
  static async getMutations(branchId?: string, limit: number = 50): Promise<MutationData[]> {
    const store = loadStore();
    let list = [...store.mutations];
    if (branchId && branchId !== "ALL") {
      list = list.filter((m) => m.branchId === branchId);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, limit);
  }

  // === AUDIT LOGS ===
  static async logAudit(data: {
    userId: string | null;
    userName: string | null;
    branchId: string | null;
    action: string;
    resource: string;
    details: string;
    ipAddress?: string;
  }): Promise<void> {
    const store = loadStore();
    const log: AuditLogData = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: data.userId,
      userName: data.userName,
      branchId: data.branchId,
      action: data.action,
      resource: data.resource,
      details: data.details,
      ipAddress: data.ipAddress || "127.0.0.1",
      createdAt: new Date().toISOString(),
    };
    store.auditLogs.unshift(log);
    saveStore(store);
  }

  static async getAuditLogs(limit: number = 100): Promise<AuditLogData[]> {
    const store = loadStore();
    return store.auditLogs.slice(0, limit);
  }

  // === DASHBOARD STATS AGGREGATION ===
  static async getDashboardStats(branchId?: string) {
    const store = loadStore();
    const targetBranches =
      branchId && branchId !== "ALL"
        ? store.branches.filter((b) => b.id === branchId)
        : store.branches;

    const totalCashBalance = targetBranches.reduce((acc, b) => acc + b.currentCashBalance, 0);
    const totalBankBalance = targetBranches.reduce((acc, b) => acc + b.currentBankBalance, 0);
    const totalBalance = totalCashBalance + totalBankBalance;

    // Filter transactions
    const txList =
      branchId && branchId !== "ALL"
        ? store.transactions.filter((t) => t.branchId === branchId)
        : store.transactions;

    const activeTx = txList.filter((t) => t.status === TransactionStatus.COMPLETED);

    // Today filter
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const todayTx = activeTx.filter((t) => new Date(t.createdAt).getTime() >= todayStart);
    const monthTx = activeTx.filter((t) => new Date(t.createdAt).getTime() >= monthStart);

    const todayCount = todayTx.length;
    const todayVolume = todayTx.reduce((acc, t) => acc + t.nominal, 0);
    const todayCustomerAdmin = todayTx.reduce((acc, t) => acc + t.customerAdmin, 0);
    const todayBankFee = todayTx.reduce((acc, t) => acc + t.bankFee, 0);
    const todayNetProfit = todayTx.reduce((acc, t) => acc + t.netProfit, 0);

    const todayMoneyIn = todayTx.reduce((acc, t) => acc + t.cashReceived + t.bankReceived, 0);
    const todayMoneyOut = todayTx.reduce((acc, t) => acc + t.cashGiven + t.bankDeducted, 0);

    const monthNetProfit = monthTx.reduce((acc, t) => acc + t.netProfit, 0);
    const monthVolume = monthTx.reduce((acc, t) => acc + t.nominal, 0);

    // Branch breakdown for Owner comparison
    const branchBreakdown = store.branches.map((b) => {
      const bTx = activeTx.filter((t) => t.branchId === b.id);
      const bProfit = bTx.reduce((acc, t) => acc + t.netProfit, 0);
      return {
        id: b.id,
        name: b.name,
        code: b.code,
        cashBalance: b.currentCashBalance,
        bankBalance: b.currentBankBalance,
        totalBalance: b.currentCashBalance + b.currentBankBalance,
        txCount: bTx.length,
        totalProfit: bProfit,
      };
    });

    // 7-day profit trend
    const last7Days: { date: string; profit: number; transactions: number; volume: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dStart = d.getTime();
      const dEnd = dStart + 24 * 60 * 60 * 1000;
      const dayTx = activeTx.filter((t) => {
        const time = new Date(t.createdAt).getTime();
        return time >= dStart && time < dEnd;
      });

      const dayProfit = dayTx.reduce((acc, t) => acc + t.netProfit, 0);
      const dayVolume = dayTx.reduce((acc, t) => acc + t.nominal, 0);
      const label = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

      last7Days.push({
        date: label,
        profit: dayProfit,
        transactions: dayTx.length,
        volume: dayVolume,
      });
    }

    return {
      branches: targetBranches,
      branchBreakdown,
      totalCashBalance,
      totalBankBalance,
      totalBalance,
      todayCount,
      todayVolume,
      todayCustomerAdmin,
      todayBankFee,
      todayNetProfit,
      todayMoneyIn,
      todayMoneyOut,
      monthNetProfit,
      monthVolume,
      last7Days,
    };
  }
}

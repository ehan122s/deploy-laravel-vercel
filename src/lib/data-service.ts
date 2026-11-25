import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "./db";
import { calculateTransactionFinancials } from "./calculations";
import { Role, TransactionStatus, AccountType, MutationType, FlowDirection, Prisma } from "@prisma/client";

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

function getInitialSeedData(): StoreSchema {
  // Pre-hashed passwords:
  // owner123 -> $2a$10$ZXoyItgv3nckooY4PRTvxeWCb3.5vlcqDKmreN7S/H5bxfgZCpjDi
  // kasir123 -> $2a$10$5nnqfXUt1PyBiyfGMHME4u5uzFdDKxyyvja7oc6VZmmNIPdrOnZvG
  const ownerHash = "$2a$10$ZXoyItgv3nckooY4PRTvxeWCb3.5vlcqDKmreN7S/H5bxfgZCpjDi";
  const kasirHash = "$2a$10$5nnqfXUt1PyBiyfGMHME4u5uzFdDKxyyvja7oc6VZmmNIPdrOnZvG";

  const now = new Date().toISOString();

  const branch1: BranchData = {
    id: "branch-01",
    code: "CABANG-01",
    name: "Hani BRILink",
    address: "Cabang 1 - Hani BRILink",
    phone: "081234567801",
    isActive: true,
    initialCashBalance: 10000000,
    initialBankBalance: 25000000,
    currentCashBalance: 10000000,
    currentBankBalance: 25000000,
    createdAt: now,
    updatedAt: now,
  };

  const branch2: BranchData = {
    id: "branch-02",
    code: "CABANG-02",
    name: "Rahmat Berkah",
    address: "Cabang 2 - Rahmat Berkah",
    phone: "081234567802",
    isActive: true,
    initialCashBalance: 10000000,
    initialBankBalance: 20000000,
    currentCashBalance: 10000000,
    currentBankBalance: 20000000,
    createdAt: now,
    updatedAt: now,
  };

  const users: UserData[] = [
    {
      id: "user-owner",
      username: "owner",
      passwordHash: ownerHash,
      name: "Owner (Hani BRILink & Rahmat Berkah)",
      role: Role.OWNER,
      isActive: true,
      branchId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-kasir1",
      username: "kasir1",
      passwordHash: kasirHash,
      name: "Kasir Hani BRILink",
      role: Role.CASHIER,
      isActive: true,
      branchId: "branch-01",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-kasir2",
      username: "kasir2",
      passwordHash: kasirHash,
      name: "Kasir Rahmat Berkah",
      role: Role.CASHIER,
      isActive: true,
      branchId: "branch-02",
      createdAt: now,
      updatedAt: now,
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

  const mutations: MutationData[] = [
    {
      id: "mut-init-1-cash",
      branchId: branch1.id,
      branchName: branch1.name,
      userId: "user-owner",
      userName: "Owner (Hani BRILink & Rahmat Berkah)",
      accountType: AccountType.CASH,
      mutationType: MutationType.INITIAL_BALANCE,
      flowDirection: FlowDirection.IN,
      amount: 10000000,
      balanceBefore: 0,
      balanceAfter: 10000000,
      referenceId: null,
      description: "Penetapan Saldo Awal Kas Fisik Hani BRILink oleh Owner",
      createdAt: now,
    },
    {
      id: "mut-init-1-bank",
      branchId: branch1.id,
      branchName: branch1.name,
      userId: "user-owner",
      userName: "Owner (Hani BRILink & Rahmat Berkah)",
      accountType: AccountType.BANK,
      mutationType: MutationType.INITIAL_BALANCE,
      flowDirection: FlowDirection.IN,
      amount: 25000000,
      balanceBefore: 0,
      balanceAfter: 25000000,
      referenceId: null,
      description: "Penetapan Saldo Awal Rekening Bank/EDC Hani BRILink oleh Owner",
      createdAt: now,
    },
    {
      id: "mut-init-2-cash",
      branchId: branch2.id,
      branchName: branch2.name,
      userId: "user-owner",
      userName: "Owner (Hani BRILink & Rahmat Berkah)",
      accountType: AccountType.CASH,
      mutationType: MutationType.INITIAL_BALANCE,
      flowDirection: FlowDirection.IN,
      amount: 10000000,
      balanceBefore: 0,
      balanceAfter: 10000000,
      referenceId: null,
      description: "Penetapan Saldo Awal Kas Fisik Rahmat Berkah oleh Owner",
      createdAt: now,
    },
    {
      id: "mut-init-2-bank",
      branchId: branch2.id,
      branchName: branch2.name,
      userId: "user-owner",
      userName: "Owner (Hani BRILink & Rahmat Berkah)",
      accountType: AccountType.BANK,
      mutationType: MutationType.INITIAL_BALANCE,
      flowDirection: FlowDirection.IN,
      amount: 20000000,
      balanceBefore: 0,
      balanceAfter: 20000000,
      referenceId: null,
      description: "Penetapan Saldo Awal Rekening Bank/EDC Rahmat Berkah oleh Owner",
      createdAt: now,
    },
  ];

  const auditLogs: AuditLogData[] = [
    {
      id: "log-init-1",
      userId: "user-owner",
      userName: "Owner (Hani BRILink & Rahmat Berkah)",
      branchId: null,
      action: "INIT_SYSTEM",
      resource: "SYSTEM",
      details: "Sistem BRILink Management System diinisialisasi untuk Hani BRILink dan Rahmat Berkah.",
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
    console.error("Error reading fallback store, initializing fresh store:", err);
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
    console.warn("Notice: Storage written to memory cache:", err);
  }
}

// === PRISMA MAPPERS ===
function mapBranch(b: Prisma.BranchGetPayload<Record<string, never>>): BranchData {
  return {
    id: b.id,
    code: b.code,
    name: b.name,
    address: b.address,
    phone: b.phone,
    isActive: b.isActive,
    initialCashBalance: Number(b.initialCashBalance),
    initialBankBalance: Number(b.initialBankBalance),
    currentCashBalance: Number(b.currentCashBalance),
    currentBankBalance: Number(b.currentBankBalance),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

function mapUser(u: Prisma.UserGetPayload<Record<string, never>>): UserData {
  return {
    id: u.id,
    username: u.username,
    passwordHash: u.passwordHash,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    branchId: u.branchId,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

function mapCategory(c: Prisma.TransactionCategoryGetPayload<Record<string, never>>): CategoryData {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    description: c.description,
    cashFlow: c.cashFlow,
    bankFlow: c.bankFlow,
    defaultCustomerAdmin: Number(c.defaultCustomerAdmin),
    defaultBankFee: Number(c.defaultBankFee),
    isActive: c.isActive,
  };
}

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: { branch: true; user: true; category: true };
}>;

function mapTransaction(t: TransactionWithRelations, userMap?: Map<string, string>): TransactionData {
  return {
    id: t.id,
    transactionNo: t.transactionNo,
    branchId: t.branchId,
    branchName: t.branch.name,
    userId: t.userId,
    cashierName: t.user.name,
    categoryId: t.categoryId,
    categoryCode: t.category.code,
    categoryName: t.category.name,
    customerName: t.customerName,
    nominal: Number(t.nominal),
    customerAdmin: Number(t.customerAdmin),
    bankFee: Number(t.bankFee),
    netProfit: Number(t.netProfit),
    cashReceived: Number(t.cashReceived),
    cashGiven: Number(t.cashGiven),
    bankReceived: Number(t.bankReceived),
    bankDeducted: Number(t.bankDeducted),
    paymentMethod: t.paymentMethod || "TUNAI",
    notes: t.notes,
    status: t.status,
    reversalReason: t.reversalReason,
    reversedAt: t.reversedAt ? t.reversedAt.toISOString() : null,
    reversedBy: t.reversedByUserId ? userMap?.get(t.reversedByUserId) || t.reversedByUserId : null,
    idempotencyKey: t.idempotencyKey,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

type MutationWithRelations = Prisma.BalanceMutationGetPayload<{
  include: { branch: true; user: true };
}>;

function mapMutation(m: MutationWithRelations): MutationData {
  const numericAmount = Number(m.amount);
  return {
    id: m.id,
    branchId: m.branchId,
    branchName: m.branch.name,
    userId: m.userId,
    userName: m.user.name,
    accountType: m.accountType,
    mutationType: m.mutationType,
    flowDirection: numericAmount >= 0 ? FlowDirection.IN : FlowDirection.OUT,
    amount: Math.abs(numericAmount),
    balanceBefore: Number(m.balanceBefore),
    balanceAfter: Number(m.balanceAfter),
    referenceId: m.transactionId,
    description: m.reason,
    createdAt: m.timestamp.toISOString(),
  };
}

type AuditWithUser = Prisma.AuditLogGetPayload<{
  include: { user: true };
}>;

function mapAuditLog(a: AuditWithUser): AuditLogData {
  return {
    id: a.id,
    userId: a.userId,
    userName: a.user?.name || "System",
    branchId: a.branchId,
    action: a.action,
    resource: a.entity,
    details: a.newValue || a.action,
    ipAddress: a.ipAddress,
    createdAt: a.timestamp.toISOString(),
  };
}

// === DATABASE CONNECTION & AUTO-SEED GUARD ===
let lastDbVerifiedAt = 0;
let seedVerifiedInProcess = false;

async function ensureDatabaseSeeded(): Promise<void> {
  if (seedVerifiedInProcess) return;
  const branchCount = await prisma.branch.count();
  if (branchCount === 0) {
    const initial = getInitialSeedData();
    await prisma.$transaction(async (tx) => {
      for (const b of initial.branches) {
        await tx.branch.upsert({
          where: { code: b.code },
          update: {},
          create: {
            id: b.id,
            code: b.code,
            name: b.name,
            address: b.address,
            phone: b.phone,
            isActive: b.isActive,
            initialCashBalance: b.initialCashBalance,
            initialBankBalance: b.initialBankBalance,
            currentCashBalance: b.currentCashBalance,
            currentBankBalance: b.currentBankBalance,
          },
        });
      }

      for (const u of initial.users) {
        await tx.user.upsert({
          where: { username: u.username },
          update: {},
          create: {
            id: u.id,
            username: u.username,
            passwordHash: u.passwordHash,
            name: u.name,
            role: u.role,
            isActive: u.isActive,
            branchId: u.branchId,
          },
        });
      }

      for (const c of initial.categories) {
        await tx.transactionCategory.upsert({
          where: { code: c.code },
          update: {},
          create: {
            id: c.id,
            code: c.code,
            name: c.name,
            description: c.description,
            cashFlow: c.cashFlow,
            bankFlow: c.bankFlow,
            defaultCustomerAdmin: c.defaultCustomerAdmin,
            defaultBankFee: c.defaultBankFee,
            isActive: c.isActive,
          },
        });
      }

      for (const m of initial.mutations) {
        await tx.balanceMutation.create({
          data: {
            branchId: m.branchId,
            userId: m.userId,
            mutationType: m.mutationType,
            accountType: m.accountType,
            amount: m.amount,
            balanceBefore: m.balanceBefore,
            balanceAfter: m.balanceAfter,
            reason: m.description,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: "user-owner",
          branchId: "branch-01",
          action: "INITIALIZE_SYSTEM",
          entity: "Branch",
          entityId: "branch-01",
          newValue: "Sistem BRILink diinisialisasi otomatis dengan cabang Hani BRILink dan Rahmat Berkah",
        },
      });
    });
  }
  seedVerifiedInProcess = true;
}

async function checkPrisma(): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return false;
  if (process.env.VERCEL && (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1"))) {
    return false;
  }

  const now = Date.now();
  if (now - lastDbVerifiedAt < 30_000) {
    return true;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    await ensureDatabaseSeeded();
    lastDbVerifiedAt = now;
    return true;
  } catch (err) {
    console.warn("Database check failed, using fallback store:", err);
    lastDbVerifiedAt = 0;
    return false;
  }
}

async function resolveUserInTx(tx: Prisma.TransactionClient, identifier: string) {
  const normalized = identifier.replace(/^user-/, "");
  return tx.user.findFirst({
    where: {
      OR: [
        { id: identifier },
        { username: { equals: identifier, mode: "insensitive" } },
        { username: { equals: normalized, mode: "insensitive" } },
      ],
    },
  });
}

function buildUserSearchPredicate(identifier: string) {
  const lower = identifier.toLowerCase();
  const stripped = identifier.replace(/^user-/, "").toLowerCase();
  return (u: UserData) =>
    u.id === identifier ||
    u.username.toLowerCase() === lower ||
    u.username.toLowerCase() === stripped;
}

export class DataService {
  // === CONNECTION STATUS ===
  static async isDatabaseConnected(): Promise<boolean> {
    return checkPrisma();
  }

  // === BRANCHES ===
  static async getBranches(): Promise<BranchData[]> {
    if (await checkPrisma()) {
      const list = await prisma.branch.findMany({ orderBy: { code: "asc" } });
      return list.map(mapBranch);
    }
    return loadStore().branches;
  }

  static async getBranchById(id: string): Promise<BranchData | null> {
    if (await checkPrisma()) {
      const b = await prisma.branch.findFirst({
        where: { OR: [{ id }, { code: id }] },
      });
      return b ? mapBranch(b) : null;
    }
    return loadStore().branches.find((b) => b.id === id || b.code === id) || null;
  }

  // === USERS & AUTH ===
  static async getUsers(): Promise<UserData[]> {
    if (await checkPrisma()) {
      const list = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
      return list.map(mapUser);
    }
    return loadStore().users;
  }

  static async getUserByUsername(username: string): Promise<UserData | null> {
    if (await checkPrisma()) {
      const u = await prisma.user.findFirst({
        where: { username: { equals: username, mode: "insensitive" } },
      });
      return u ? mapUser(u) : null;
    }
    return loadStore().users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  static async getUserById(id: string): Promise<UserData | null> {
    if (await checkPrisma()) {
      const u = await prisma.user.findUnique({ where: { id } });
      return u ? mapUser(u) : null;
    }
    return loadStore().users.find((u) => u.id === id) || null;
  }

  static async createCashier(data: {
    username: string;
    passwordHash: string;
    name: string;
    branchId: string;
  }): Promise<UserData> {
    if (await checkPrisma()) {
      const existing = await prisma.user.findFirst({
        where: { username: { equals: data.username, mode: "insensitive" } },
      });
      if (existing) {
        throw new Error(`Username ${data.username} sudah digunakan.`);
      }

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: data.username,
            passwordHash: data.passwordHash,
            name: data.name,
            role: Role.CASHIER,
            isActive: true,
            branchId: data.branchId,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            branchId: data.branchId,
            action: "CREATE_CASHIER",
            entity: "USER",
            entityId: user.id,
            newValue: `Membuat akun kasir baru: ${data.name} (${data.username}) untuk cabang ${data.branchId}`,
          },
        });

        return user;
      });

      return mapUser(created);
    }

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
    if (await checkPrisma()) {
      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({ where: { id } });
        if (!existing) throw new Error("Pengguna tidak ditemukan.");

        const user = await tx.user.update({
          where: { id },
          data: { isActive },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            branchId: user.branchId,
            action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
            entity: "USER",
            entityId: user.id,
            newValue: `Mengubah status user ${user.username} menjadi ${isActive ? "Aktif" : "Nonaktif"}`,
          },
        });

        return user;
      });

      return mapUser(updated);
    }

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
    if (await checkPrisma()) {
      const list = await prisma.transactionCategory.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return list.map(mapCategory);
    }
    return loadStore().categories.filter((c) => c.isActive);
  }

  static async getCategoryByCode(code: string): Promise<CategoryData | null> {
    if (await checkPrisma()) {
      const c = await prisma.transactionCategory.findFirst({
        where: { OR: [{ code }, { id: code }] },
      });
      return c ? mapCategory(c) : null;
    }
    return loadStore().categories.find((c) => c.code === code || c.id === code) || null;
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
    if (await checkPrisma()) {
      const where: Prisma.TransactionWhereInput = {};
      if (params?.branchId && params.branchId !== "ALL") {
        where.branchId = params.branchId;
      }
      if (params?.categoryCode && params.categoryCode !== "ALL") {
        where.category = { code: params.categoryCode };
      }
      if (params?.userId) {
        where.userId = params.userId;
      }
      if (params?.startDate || params?.endDate) {
        where.createdAt = {};
        if (params.startDate) where.createdAt.gte = new Date(params.startDate);
        if (params.endDate) where.createdAt.lte = new Date(params.endDate);
      }

      const [rows, users] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: { branch: true, user: true, category: true },
          orderBy: { createdAt: "desc" },
          take: params?.limit && params.limit > 0 ? params.limit : undefined,
        }),
        prisma.user.findMany({ select: { id: true, name: true } }),
      ]);

      const userMap = new Map(users.map((u) => [u.id, u.name]));
      return rows.map((row) => mapTransaction(row, userMap));
    }

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
    if (await checkPrisma()) {
      const row = await prisma.transaction.findFirst({
        where: { OR: [{ id }, { transactionNo: id }] },
        include: { branch: true, user: true, category: true },
      });
      if (!row) return null;
      return mapTransaction(row);
    }
    return loadStore().transactions.find((t) => t.id === id || t.transactionNo === id) || null;
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
    if (await checkPrisma()) {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Idempotency check
        if (input.idempotencyKey) {
          const existing = await tx.transaction.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            include: { branch: true, user: true, category: true },
          });
          if (existing) return existing;
        }

        const branch = await tx.branch.findFirst({
          where: { OR: [{ id: input.branchId }, { code: input.branchId }] },
        });
        if (!branch) throw new Error("Cabang tidak valid.");

        const user = await resolveUserInTx(tx, input.userId);
        if (!user) throw new Error("Kasir tidak ditemukan.");

        const category = await tx.transactionCategory.findFirst({
          where: { OR: [{ code: input.categoryCode }, { id: input.categoryCode }] },
        });
        if (!category) throw new Error("Kategori transaksi tidak ditemukan.");

        // 2. Calculate financials
        const calc = calculateTransactionFinancials({
          categoryCode: category.code,
          nominal: input.nominal,
          customerAdmin: input.customerAdmin,
          bankFee: input.bankFee,
        });

        if (!calc.balanceCheckPassed) {
          throw new Error("Gagal validasi neraca: Selisih saldo kas dan bank tidak seimbang dengan keuntungan bersih.");
        }

        const cashBefore = Number(branch.currentCashBalance);
        const bankBefore = Number(branch.currentBankBalance);
        const cashAfter = cashBefore + calc.cashFlowChange;
        const bankAfter = bankBefore + calc.bankFlowChange;

        // 3. Check sufficient funds
        if (calc.cashFlowChange < 0 && cashAfter < 0) {
          throw new Error(
            `Saldo Kas Fisik cabang tidak mencukupi (Tersedia: Rp${cashBefore.toLocaleString("id-ID")}, Dibutuhkan: Rp${Math.abs(calc.cashFlowChange).toLocaleString("id-ID")}).`
          );
        }
        if (calc.bankFlowChange < 0 && bankAfter < 0) {
          throw new Error(
            `Saldo Rekening Bank/EDC cabang tidak mencukupi (Tersedia: Rp${bankBefore.toLocaleString("id-ID")}, Dibutuhkan: Rp${Math.abs(calc.bankFlowChange).toLocaleString("id-ID")}).`
          );
        }

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const transactionNo = `TRX-${dateStr}-${randomSuffix}`;

        // 4. Update branch balances atomically
        await tx.branch.update({
          where: { id: branch.id },
          data: {
            currentCashBalance: cashAfter,
            currentBankBalance: bankAfter,
          },
        });

        // 5. Create transaction record
        const createdTx = await tx.transaction.create({
          data: {
            transactionNo,
            branchId: branch.id,
            userId: user.id,
            categoryId: category.id,
            customerName: input.customerName || null,
            paymentMethod: input.paymentMethod || "TUNAI",
            notes: input.notes || null,
            nominal: calc.nominal,
            customerAdmin: calc.customerAdmin,
            bankFee: calc.bankFee,
            netProfit: calc.netProfit,
            cashReceived: calc.cashReceived,
            cashGiven: calc.cashGiven,
            bankReceived: calc.bankReceived,
            bankDeducted: calc.bankDeducted,
            status: TransactionStatus.COMPLETED,
            idempotencyKey: input.idempotencyKey || undefined,
          },
          include: { branch: true, user: true, category: true },
        });

        // 6. Create mutation records
        if (calc.cashFlowChange !== 0) {
          await tx.balanceMutation.create({
            data: {
              branchId: branch.id,
              userId: user.id,
              transactionId: createdTx.id,
              mutationType: MutationType.TRANSACTION,
              accountType: AccountType.CASH,
              amount: calc.cashFlowChange,
              balanceBefore: cashBefore,
              balanceAfter: cashAfter,
              reason: `Transaksi ${category.name} (${transactionNo}) - Kas Fisik`,
            },
          });
        }

        if (calc.bankFlowChange !== 0) {
          await tx.balanceMutation.create({
            data: {
              branchId: branch.id,
              userId: user.id,
              transactionId: createdTx.id,
              mutationType: MutationType.TRANSACTION,
              accountType: AccountType.BANK,
              amount: calc.bankFlowChange,
              balanceBefore: bankBefore,
              balanceAfter: bankAfter,
              reason: `Transaksi ${category.name} (${transactionNo}) - Saldo Rekening/EDC`,
            },
          });
        }

        // 7. Create audit log
        await tx.auditLog.create({
          data: {
            userId: user.id,
            branchId: branch.id,
            action: "CREATE_TRANSACTION",
            entity: "TRANSACTION",
            entityId: createdTx.id,
            newValue: `Transaksi ${transactionNo}: ${category.name} Rp${calc.nominal.toLocaleString("id-ID")}, Laba: Rp${calc.netProfit.toLocaleString("id-ID")}`,
          },
        });

        return createdTx;
      });

      return mapTransaction(result);
    }

    // Fallback JSON/memory mode
    const store = loadStore();

    if (input.idempotencyKey) {
      const existing = store.transactions.find((t) => t.idempotencyKey === input.idempotencyKey);
      if (existing) return existing;
    }

    const branch = store.branches.find((b) => b.id === input.branchId || b.code === input.branchId);
    if (!branch) throw new Error("Cabang tidak valid.");

    const user = store.users.find(buildUserSearchPredicate(input.userId));
    if (!user) throw new Error("Kasir tidak ditemukan.");

    const category = store.categories.find((c) => c.code === input.categoryCode || c.id === input.categoryCode);
    if (!category) throw new Error("Kategori transaksi tidak ditemukan.");

    const calc = calculateTransactionFinancials({
      categoryCode: input.categoryCode,
      nominal: input.nominal,
      customerAdmin: input.customerAdmin,
      bankFee: input.bankFee,
    });

    if (!calc.balanceCheckPassed) {
      throw new Error("Gagal validasi neraca: Selisih saldo kas dan bank tidak seimbang dengan keuntungan bersih.");
    }

    if (calc.cashFlowChange < 0 && branch.currentCashBalance + calc.cashFlowChange < 0) {
      throw new Error(
        `Saldo Kas Fisik cabang tidak mencukupi (Tersedia: Rp${branch.currentCashBalance.toLocaleString("id-ID")}, Dibutuhkan: Rp${Math.abs(calc.cashFlowChange).toLocaleString("id-ID")}).`
      );
    }
    if (calc.bankFlowChange < 0 && branch.currentBankBalance + calc.bankFlowChange < 0) {
      throw new Error(
        `Saldo Rekening Bank/EDC cabang tidak mencukupi (Tersedia: Rp${branch.currentBankBalance.toLocaleString("id-ID")}, Dibutuhkan: Rp${Math.abs(calc.bankFlowChange).toLocaleString("id-ID")}).`
      );
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transactionNo = `TRX-${dateStr}-${randomSuffix}`;
    const txId = `tx-${Date.now()}-${randomSuffix}`;
    const timestamp = today.toISOString();

    const cashBefore = branch.currentCashBalance;
    const bankBefore = branch.currentBankBalance;

    branch.currentCashBalance += calc.cashFlowChange;
    branch.currentBankBalance += calc.bankFlowChange;
    branch.updatedAt = timestamp;

    const cashAfter = branch.currentCashBalance;
    const bankAfter = branch.currentBankBalance;

    if (calc.cashFlowChange !== 0) {
      store.mutations.unshift({
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
      });
    }

    if (calc.bankFlowChange !== 0) {
      store.mutations.unshift({
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
      });
    }

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
    if (await checkPrisma()) {
      const updated = await prisma.$transaction(async (tx) => {
        const existingTx = await tx.transaction.findFirst({
          where: { OR: [{ id: input.transactionId }, { transactionNo: input.transactionId }] },
          include: { branch: true, user: true, category: true },
        });
        if (!existingTx) throw new Error("Transaksi tidak ditemukan.");
        if (existingTx.status === TransactionStatus.REVERSED) {
          throw new Error("Transaksi ini sudah pernah dibatalkan / dikoreksi sebelumnya.");
        }

        const actingUser = await resolveUserInTx(tx, input.userId);
        const actingUserId = actingUser?.id || existingTx.userId;

        const originalCashFlow = Number(existingTx.cashReceived) - Number(existingTx.cashGiven);
        const originalBankFlow = Number(existingTx.bankReceived) - Number(existingTx.bankDeducted);

        const reverseCashFlow = -originalCashFlow;
        const reverseBankFlow = -originalBankFlow;

        const cashBefore = Number(existingTx.branch.currentCashBalance);
        const bankBefore = Number(existingTx.branch.currentBankBalance);
        const cashAfter = cashBefore + reverseCashFlow;
        const bankAfter = bankBefore + reverseBankFlow;

        await tx.branch.update({
          where: { id: existingTx.branchId },
          data: {
            currentCashBalance: cashAfter,
            currentBankBalance: bankAfter,
          },
        });

        if (reverseCashFlow !== 0) {
          await tx.balanceMutation.create({
            data: {
              branchId: existingTx.branchId,
              userId: actingUserId,
              transactionId: existingTx.id,
              mutationType: MutationType.TRANSACTION_REVERSAL,
              accountType: AccountType.CASH,
              amount: reverseCashFlow,
              balanceBefore: cashBefore,
              balanceAfter: cashAfter,
              reason: `Koreksi / Reversal Transaksi ${existingTx.transactionNo} - Kas Fisik (Alasan: ${input.reversalReason})`,
            },
          });
        }

        if (reverseBankFlow !== 0) {
          await tx.balanceMutation.create({
            data: {
              branchId: existingTx.branchId,
              userId: actingUserId,
              transactionId: existingTx.id,
              mutationType: MutationType.TRANSACTION_REVERSAL,
              accountType: AccountType.BANK,
              amount: reverseBankFlow,
              balanceBefore: bankBefore,
              balanceAfter: bankAfter,
              reason: `Koreksi / Reversal Transaksi ${existingTx.transactionNo} - Saldo Bank (Alasan: ${input.reversalReason})`,
            },
          });
        }

        const reversed = await tx.transaction.update({
          where: { id: existingTx.id },
          data: {
            status: TransactionStatus.REVERSED,
            reversalReason: input.reversalReason,
            reversedAt: new Date(),
            reversedByUserId: actingUserId,
          },
          include: { branch: true, user: true, category: true },
        });

        await tx.auditLog.create({
          data: {
            userId: actingUserId,
            branchId: existingTx.branchId,
            action: "REVERSE_TRANSACTION",
            entity: "TRANSACTION",
            entityId: existingTx.id,
            newValue: `Reversal Transaksi ${existingTx.transactionNo}. Alasan: ${input.reversalReason}`,
          },
        });

        return { reversed, actingUserName: actingUser?.name || "Owner" };
      });

      const userMap = updated.reversed.reversedByUserId
        ? new Map([[updated.reversed.reversedByUserId, updated.actingUserName]])
        : undefined;
      return mapTransaction(updated.reversed, userMap);
    }

    // Fallback mode
    const store = loadStore();
    const tx = store.transactions.find((t) => t.id === input.transactionId || t.transactionNo === input.transactionId);
    if (!tx) throw new Error("Transaksi tidak ditemukan.");

    if (tx.status === TransactionStatus.REVERSED) {
      throw new Error("Transaksi ini sudah pernah dibatalkan / dikoreksi sebelumnya.");
    }

    const branch = store.branches.find((b) => b.id === tx.branchId);
    if (!branch) throw new Error("Cabang tidak valid.");

    const user = store.users.find(buildUserSearchPredicate(input.userId));
    const userName = user ? user.name : "System";
    const timestamp = new Date().toISOString();

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
    targetBranchId?: string;
  }): Promise<{ success: boolean; message: string }> {
    const amount = Number(input.amount);
    if (amount <= 0) throw new Error("Nominal harus lebih besar dari 0.");

    if (await checkPrisma()) {
      await prisma.$transaction(async (tx) => {
        const branch = await tx.branch.findFirst({
          where: { OR: [{ id: input.branchId }, { code: input.branchId }] },
        });
        if (!branch) throw new Error("Cabang sumber tidak ditemukan.");

        const user = await resolveUserInTx(tx, input.userId);
        if (!user) throw new Error("Pengguna tidak ditemukan.");

        const isCash = input.accountType === AccountType.CASH;
        const currentCash = Number(branch.currentCashBalance);
        const currentBank = Number(branch.currentBankBalance);

        if (input.mutationType === MutationType.CAPITAL_INJECTION) {
          const before = isCash ? currentCash : currentBank;
          const after = before + amount;

          await tx.branch.update({
            where: { id: branch.id },
            data: isCash ? { currentCashBalance: after } : { currentBankBalance: after },
          });

          await tx.balanceMutation.create({
            data: {
              branchId: branch.id,
              userId: user.id,
              mutationType: MutationType.CAPITAL_INJECTION,
              accountType: input.accountType,
              amount,
              balanceBefore: before,
              balanceAfter: after,
              reason: `Penambahan Modal (${isCash ? "Kas Fisik" : "Saldo Bank"}): ${input.reason}`,
            },
          });
        } else if (input.mutationType === MutationType.CAPITAL_WITHDRAWAL) {
          const before = isCash ? currentCash : currentBank;
          if (before < amount) {
            throw new Error("Saldo tidak mencukupi untuk penarikan modal.");
          }
          const after = before - amount;

          await tx.branch.update({
            where: { id: branch.id },
            data: isCash ? { currentCashBalance: after } : { currentBankBalance: after },
          });

          await tx.balanceMutation.create({
            data: {
              branchId: branch.id,
              userId: user.id,
              mutationType: MutationType.CAPITAL_WITHDRAWAL,
              accountType: input.accountType,
              amount: -amount,
              balanceBefore: before,
              balanceAfter: after,
              reason: `Penarikan Modal (${isCash ? "Kas Fisik" : "Saldo Bank"}): ${input.reason}`,
            },
          });
        } else if (input.mutationType === MutationType.INTER_BRANCH_TRANSFER) {
          if (!input.targetBranchId) throw new Error("Cabang tujuan harus dipilih.");
          const targetBranch = await tx.branch.findFirst({
            where: { OR: [{ id: input.targetBranchId }, { code: input.targetBranchId }] },
          });
          if (!targetBranch) throw new Error("Cabang tujuan tidak ditemukan.");
          if (targetBranch.id === branch.id) throw new Error("Cabang sumber dan tujuan tidak boleh sama.");

          const sourceBefore = isCash ? currentCash : currentBank;
          if (sourceBefore < amount) {
            throw new Error(`Saldo ${branch.name} tidak mencukupi untuk transfer ke ${targetBranch.name}.`);
          }
          const sourceAfter = sourceBefore - amount;

          const targetBefore = isCash
            ? Number(targetBranch.currentCashBalance)
            : Number(targetBranch.currentBankBalance);
          const targetAfter = targetBefore + amount;

          await tx.branch.update({
            where: { id: branch.id },
            data: isCash ? { currentCashBalance: sourceAfter } : { currentBankBalance: sourceAfter },
          });

          await tx.branch.update({
            where: { id: targetBranch.id },
            data: isCash ? { currentCashBalance: targetAfter } : { currentBankBalance: targetAfter },
          });

          await tx.balanceMutation.create({
            data: {
              branchId: branch.id,
              userId: user.id,
              mutationType: MutationType.INTER_BRANCH_TRANSFER,
              accountType: input.accountType,
              amount: -amount,
              balanceBefore: sourceBefore,
              balanceAfter: sourceAfter,
              reason: `Transfer saldo ke ${targetBranch.name} (${input.accountType}): ${input.reason}`,
            },
          });

          await tx.balanceMutation.create({
            data: {
              branchId: targetBranch.id,
              userId: user.id,
              mutationType: MutationType.INTER_BRANCH_TRANSFER,
              accountType: input.accountType,
              amount,
              balanceBefore: targetBefore,
              balanceAfter: targetAfter,
              reason: `Terima transfer saldo dari ${branch.name} (${input.accountType}): ${input.reason}`,
            },
          });
        } else if (
          input.mutationType === MutationType.ADJUSTMENT ||
          input.mutationType === MutationType.INITIAL_BALANCE
        ) {
          const before = isCash ? currentCash : currentBank;
          const diff = amount - before;

          const updatePayload: Prisma.BranchUpdateInput = isCash
            ? {
                currentCashBalance: amount,
                ...(input.mutationType === MutationType.INITIAL_BALANCE ? { initialCashBalance: amount } : {}),
              }
            : {
                currentBankBalance: amount,
                ...(input.mutationType === MutationType.INITIAL_BALANCE ? { initialBankBalance: amount } : {}),
              };

          await tx.branch.update({
            where: { id: branch.id },
            data: updatePayload,
          });

          await tx.balanceMutation.create({
            data: {
              branchId: branch.id,
              userId: user.id,
              mutationType: input.mutationType,
              accountType: input.accountType,
              amount: diff,
              balanceBefore: before,
              balanceAfter: amount,
              reason: `Penyesuaian Saldo (${input.accountType}): Set menjadi Rp${amount.toLocaleString("id-ID")}. Alasan: ${input.reason}`,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            branchId: branch.id,
            action: "ADJUST_BALANCE",
            entity: "BRANCH_BALANCE",
            entityId: branch.id,
            newValue: `${input.mutationType} pada ${branch.name} sebesar Rp${amount.toLocaleString("id-ID")}. Alasan: ${input.reason}`,
          },
        });
      });

      return { success: true, message: "Saldo berhasil diperbarui dan mutasi tercatat ke database." };
    }

    // Fallback mode
    const store = loadStore();
    const branch = store.branches.find((b) => b.id === input.branchId || b.code === input.branchId);
    if (!branch) throw new Error("Cabang sumber tidak ditemukan.");

    const user = store.users.find(buildUserSearchPredicate(input.userId));
    const userName = user ? user.name : "Owner";
    const timestamp = new Date().toISOString();

    if (input.mutationType === MutationType.CAPITAL_INJECTION) {
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
      if (!input.targetBranchId) throw new Error("Cabang tujuan harus dipilih.");
      const targetBranch = store.branches.find((b) => b.id === input.targetBranchId);
      if (!targetBranch) throw new Error("Cabang tujuan tidak ditemukan.");
      if (targetBranch.id === branch.id) throw new Error("Cabang sumber dan tujuan tidak boleh sama.");

      const sourceBefore = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;
      if (sourceBefore < amount) {
        throw new Error(`Saldo ${branch.name} tidak mencukupi untuk transfer ke ${targetBranch.name}.`);
      }

      if (input.accountType === AccountType.CASH) {
        branch.currentCashBalance -= amount;
      } else {
        branch.currentBankBalance -= amount;
      }
      const sourceAfter = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;

      const targetBefore = input.accountType === AccountType.CASH ? targetBranch.currentCashBalance : targetBranch.currentBankBalance;
      if (input.accountType === AccountType.CASH) {
        targetBranch.currentCashBalance += amount;
      } else {
        targetBranch.currentBankBalance += amount;
      }
      const targetAfter = input.accountType === AccountType.CASH ? targetBranch.currentCashBalance : targetBranch.currentBankBalance;

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
      const before = input.accountType === AccountType.CASH ? branch.currentCashBalance : branch.currentBankBalance;
      const diff = amount - before;

      if (input.accountType === AccountType.CASH) {
        branch.currentCashBalance = amount;
        if (input.mutationType === MutationType.INITIAL_BALANCE) branch.initialCashBalance = amount;
      } else {
        branch.currentBankBalance = amount;
        if (input.mutationType === MutationType.INITIAL_BALANCE) branch.initialBankBalance = amount;
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
    if (await checkPrisma()) {
      const rows = await prisma.balanceMutation.findMany({
        where: branchId && branchId !== "ALL" ? { branchId } : undefined,
        include: { branch: true, user: true },
        orderBy: { timestamp: "desc" },
        take: limit,
      });
      return rows.map(mapMutation);
    }

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
    if (await checkPrisma()) {
      let validUserId: string | undefined;
      if (data.userId) {
        const matched = await prisma.user.findFirst({
          where: {
            OR: [
              { id: data.userId },
              { username: { equals: data.userId.replace(/^user-/, ""), mode: "insensitive" } },
            ],
          },
          select: { id: true },
        });
        validUserId = matched?.id;
      }

      await prisma.auditLog.create({
        data: {
          userId: validUserId,
          branchId: data.branchId || undefined,
          action: data.action,
          entity: data.resource,
          newValue: data.details,
          ipAddress: data.ipAddress || "127.0.0.1",
        },
      });
      return;
    }

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
    if (await checkPrisma()) {
      const rows = await prisma.auditLog.findMany({
        include: { user: true },
        orderBy: { timestamp: "desc" },
        take: limit,
      });
      return rows.map(mapAuditLog);
    }

    return loadStore().auditLogs.slice(0, limit);
  }

  // === DASHBOARD STATS AGGREGATION ===
  static async getDashboardStats(branchId?: string) {
    const [allBranches, allTransactions] = await Promise.all([
      this.getBranches(),
      this.getTransactions(),
    ]);

    const targetBranches =
      branchId && branchId !== "ALL"
        ? allBranches.filter((b) => b.id === branchId)
        : allBranches;

    const totalCashBalance = targetBranches.reduce((acc, b) => acc + b.currentCashBalance, 0);
    const totalBankBalance = targetBranches.reduce((acc, b) => acc + b.currentBankBalance, 0);
    const totalBalance = totalCashBalance + totalBankBalance;

    const txList =
      branchId && branchId !== "ALL"
        ? allTransactions.filter((t) => t.branchId === branchId)
        : allTransactions;

    const activeTx = txList.filter((t) => t.status === TransactionStatus.COMPLETED);

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

    const allCompletedTx = allTransactions.filter((t) => t.status === TransactionStatus.COMPLETED);
    const branchBreakdown = allBranches.map((b) => {
      const bTx = allCompletedTx.filter((t) => t.branchId === b.id);
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

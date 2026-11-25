import { Role } from "@prisma/client";

export interface AIUserContext {
  userId: string;
  username: string;
  name: string;
  role: Role;
  branchId: string | null;
  branchName: string | null;
  branchCode: string | null;
}

export interface AIReportBranchItem {
  branchId: string;
  branchCode: string;
  branchName: string;
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
  transactionCount: number;
  nominalTotal: number;
  moneyIn: number;
  moneyOut: number;
  customerAdminTotal: number;
  bankFeeTotal: number;
  netProfitTotal: number;
}

export interface AIReportPayload {
  kind: "report";
  title: string;
  branchScope: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  summary: {
    transactionCount: number;
    reversedCount: number;
    pendingCount: number;
    totalNominal: number;
    totalMoneyIn: number;
    totalMoneyOut: number;
    totalCustomerAdmin: number;
    totalBankFee: number;
    totalNetProfit: number;
    endingCashBalance: number;
    endingBankBalance: number;
    endingTotalBalance: number;
  };
  comparisonWithPrevious: {
    previousPeriodLabel: string;
    previousNetProfit: number;
    previousTransactionCount: number;
    profitDelta: number;
    profitGrowthPercent: number | null;
  };
  branches: AIReportBranchItem[];
  transactions: {
    transactionNo: string;
    createdAt: string;
    branchName: string;
    cashierName: string;
    categoryName: string;
    customerName: string;
    nominal: number;
    customerAdmin: number;
    bankFee: number;
    netProfit: number;
    status: string;
  }[];
}

export interface AITransactionDraftPayload {
  kind: "transaction_draft";
  categoryCode: string;
  categoryName: string;
  branchId: string;
  branchName: string;
  nominal: number;
  customerAdmin: number;
  bankFee: number;
  netProfit: number;
  cashFlowChange: number;
  bankFlowChange: number;
  customerName?: string;
  paymentMethod?: string;
  notes?: string;
  sufficientBalance: boolean;
  insufficiencyReason?: string;
  formUrl: string;
}

export interface AIAlertItem {
  id: string;
  branchId: string | null;
  branchName?: string | null;
  transactionId: string | null;
  alertType: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | string;
  title: string;
  description: string;
  isRead: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AIAlertsPayload {
  kind: "alerts";
  scannedAt: string;
  totalAlerts: number;
  alerts: AIAlertItem[];
}

export type AIStructuredPayload =
  | AIReportPayload
  | AITransactionDraftPayload
  | AIAlertsPayload;

export interface AIMessageItem {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  toolName?: string | null;
  structuredData?: AIStructuredPayload | null;
  tokensUsed: number;
  createdAt: string;
}

export interface AIConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  lastMessage?: string;
}

export interface AIChatResponse {
  conversationId: string;
  userMessage: AIMessageItem;
  assistantMessage: AIMessageItem;
  providerUsed: string;
  modelUsed: string;
  fallbackUsed: boolean;
}

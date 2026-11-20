/**
 * BRILink Financial Calculation Engine
 * 
 * Aturan Mutasi Keuangan:
 * 1. TRANSFER_OUT (Transfer ke sesama BRI / Antarbank / E-Wallet / Top Up / Pembelian Token):
 *    - Customer menyerahkan uang tunai fisik + admin customer
 *    - Saldo Kas Fisik (CASH) bertambah: +(Nominal + Admin Customer)
 *    - Rekening Bank Agen (BANK) didebet: -(Nominal + Potongan Bank)
 *    - Keuntungan Bersih = Admin Customer - Potongan Bank
 *    - Selisih Total (CASH + BANK) = +Keuntungan Bersih
 * 
 * 2. TARIK_TUNAI (Tarik Tunai via kartu / transfer nasabah):
 *    - Nasabah transfer / kartu didebet ke rekening agen: +(Nominal)
 *    - Kasir menyerahkan uang tunai fisik: -(Nominal - Admin Customer) jika admin dipotong langsung,
 *      atau Kasir serahkan -(Nominal) dan nasabah bayar tunai Admin Customer +(Admin Customer).
 *    - Potongan Bank didebet dari rekening agen: -(Potongan Bank)
 *    - Keuntungan Bersih = Admin Customer - Potongan Bank
 * 
 * 3. SETOR_TUNAI:
 *    - Nasabah bawa uang tunai: Kas Fisik bertambah +(Nominal + Admin Customer)
 *    - Agen kirim saldo rekening ke nasabah: Rekening berkurang -(Nominal + Potongan Bank)
 *    - Keuntungan Bersih = Admin Customer - Potongan Bank
 */

export interface TransactionCalculationInput {
  categoryCode: string;
  nominal: number;
  customerAdmin: number;
  bankFee: number;
}

export interface TransactionCalculationResult {
  nominal: number;
  customerAdmin: number;
  bankFee: number;
  netProfit: number;
  
  // Pergerakan Kas Fisik di Laci Cabang
  cashFlowChange: number; // + bertambah, - berkurang
  cashReceived: number;
  cashGiven: number;
  
  // Pergerakan Saldo Rekening / Kuota Mesin EDC
  bankFlowChange: number; // + bertambah, - berkurang
  bankReceived: number;
  bankDeducted: number;
  
  // Validasi Total Neraca: deltaCash + deltaBank harus sama persis dengan netProfit
  balanceCheckPassed: boolean;
}

export function calculateTransactionFinancials(
  input: TransactionCalculationInput
): TransactionCalculationResult {
  const nominal = Number(input.nominal) || 0;
  const customerAdmin = Number(input.customerAdmin) || 0;
  const bankFee = Number(input.bankFee) || 0;

  // Rumus Keuntungan Bersih BRILink
  const netProfit = customerAdmin - bankFee;

  let cashReceived = 0;
  let cashGiven = 0;
  let bankReceived = 0;
  let bankDeducted = 0;

  const code = input.categoryCode.toUpperCase();

  if (code.includes("TARIK_TUNAI") || code.includes("TARIK")) {
    // Skenario Tarik Tunai:
    // Rekening Agen bertambah sebesar nominal yang ditarik customer via EDC/Transfer
    bankReceived = nominal;
    // Bank memotong biaya transaksi (bila ada)
    bankDeducted = bankFee;
    
    // Kasir memberikan uang tunai fisik ke nasabah (Nominal)
    // dan nasabah membayar admin tunai (atau dipotong dari uang yang diserahkan)
    // Standar Agen: Nasabah menerima uang bersih (Nominal - Admin), atau nasabah bayar admin terpisah.
    // Kas keluar = Nominal. Kas masuk = Admin Customer.
    cashGiven = nominal;
    cashReceived = customerAdmin;
  } else {
    // Skenario Transfer Keluar / Setor Tunai / Bayar Tagihan / Beli Pulsa / Top Up:
    // Nasabah menyerahkan Uang Tunai Fisik = (Nominal + Admin Customer)
    cashReceived = nominal + customerAdmin;
    cashGiven = 0;

    // Rekening Agen berkurang = (Nominal + Potongan Bank)
    bankReceived = 0;
    bankDeducted = nominal + bankFee;
  }

  const cashFlowChange = cashReceived - cashGiven;
  const bankFlowChange = bankReceived - bankDeducted;

  // Neraca Pembukuan: Selisih uang kas + saldo bank HARUS persis sama dengan laba bersih!
  // Bukti: (CashIn - CashOut) + (BankIn - BankOut) = NetProfit
  const totalDelta = cashFlowChange + bankFlowChange;
  const balanceCheckPassed = Math.abs(totalDelta - netProfit) < 0.001;

  return {
    nominal,
    customerAdmin,
    bankFee,
    netProfit,
    cashFlowChange,
    cashReceived,
    cashGiven,
    bankFlowChange,
    bankReceived,
    bankDeducted,
    balanceCheckPassed,
  };
}

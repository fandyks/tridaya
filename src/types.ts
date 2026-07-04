export interface Transaction {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori: string;
  nominal: number;
  created_by: string;
  created_at: string;
}

export interface Pemasukan {
  id: string;
  tanggal: string;
  luasan: number;
  pendapatan_kotor: number;
  gaji_operator: number;
  gaji_helper: number;
  lainnya: number;
  pendapatan_bersih: number;
  keterangan: string;
  nominal: number;
  created_by: string;
  created_at: string;
}

export interface CashTransfer {
  id: string;
  tanggal: string;
  jenis: "Deposit" | "Penarikan";
  keterangan: string;
  nominal: number;
  created_by: string;
  created_at: string;
}

export interface Category {
  id: string;
  nama: string;
  tipe: "pemasukan" | "pengeluaran";
  warna: string;
}

export interface DashboardSummary {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
}

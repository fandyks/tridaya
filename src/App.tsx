import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { md5 } from "js-md5";
import { apiService } from "./services/api";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  Settings,
  Plus,
  Edit2,
  Trash2,
  ArrowLeftRight,
  Check,
  AlertCircle,
  Calendar,
  Layers,
  FileSpreadsheet,
  Database,
  X,
  FileText,
  Menu,
  ChevronLeft,
  ChevronRight,
  Info,
  Terminal,
  Clock,
  ExternalLink,
  ChevronDown,
  User,
  Shield,
  Layers3,
  Share2,
  Copy,
  Eye,
  Globe,
  LogOut
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Transaction, CashTransfer, Category, Pemasukan } from "./types";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "CAT-01", nama: "Gaji & Pendapatan", tipe: "pemasukan", warna: "emerald" },
  { id: "CAT-02", nama: "Penjualan Produk", tipe: "pemasukan", warna: "teal" },
  { id: "CAT-03", nama: "Investasi Masuk", tipe: "pemasukan", warna: "indigo" },
  { id: "CAT-04", nama: "Operasional", tipe: "pengeluaran", warna: "amber" },
  { id: "CAT-05", nama: "Service", tipe: "pengeluaran", warna: "blue" },
  { id: "CAT-06", nama: "Sparepart", tipe: "pengeluaran", warna: "purple" },
  { id: "CAT-07", nama: "Lainnya", tipe: "pengeluaran", warna: "slate" },
];

export default function App() {
  // Authentication & session state
  const [user, setUser] = useState<{ id: string; username: string; nama: string; role: string } | null>(() => {
    const saved = localStorage.getItem("tridaya_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sheetConnection, setSheetConnection] = useState<"connecting" | "connected" | "disconnected">("connecting");

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ message: string; type: "success" | "error" | "info"; isOpen: boolean }>({
    message: "",
    type: "info",
    isOpen: false,
  });

  const showSnackbar = (message: string, type: "success" | "error" | "info" = "info") => {
    setSnackbar({ message, type, isOpen: true });
    setTimeout(() => {
      setSnackbar(prev => ({ ...prev, isOpen: false }));
    }, 4000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const expectedUsername = (import.meta.env.VITE_ADMIN_USERNAME || "admin").trim().toLowerCase();
      const expectedPassword = (import.meta.env.VITE_ADMIN_PASSWORD || "fandyk").trim();

      const enteredUsername = loginUsername.trim().toLowerCase();
      const enteredPassword = loginPassword.trim();

      if (enteredUsername === expectedUsername && enteredPassword === expectedPassword) {
        const loggedInUser = {
          id: "admin",
          username: "admin",
          nama: "Admin Tridaya",
          role: "admin"
        };
        setUser(loggedInUser);
        localStorage.setItem("tridaya_user", JSON.stringify(loggedInUser));
        showSnackbar(`Selamat datang, Admin Tridaya!`, "success");
        // Trigger load data from Sheets
        loadDataFromSheets();
        loadShareTokensHistory();
      } else {
        setLoginError("Username atau password salah.");
        showSnackbar("Gagal masuk. Username atau password salah.", "error");
      }
    } catch (err: any) {
      setLoginError(`Gagal masuk: ${err.message}`);
      showSnackbar(`Koneksi gagal: ${err.message}`, "error");
    } finally {
      setLoginLoading(false);
    }
  };

  // Navigation & UI Layout states
  const [activeTab, setActiveTab] = useState<"ikhtisar" | "pemasukan" | "pengeluaran" | "mutasi" | "settings" | "share">("ikhtisar");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Share & Investor states
  const [isInvestorMode, setIsInvestorMode] = useState<boolean>(false);
  const [investorToken, setInvestorToken] = useState<string | null>(null);
  const [investorLoading, setInvestorLoading] = useState<boolean>(false);
  const [investorError, setInvestorError] = useState<string | null>(null);

  // Share Admin tab states
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [shareTokensHistory, setShareTokensHistory] = useState<any[]>([]);
  const [isGeneratingToken, setIsGeneratingToken] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Sync log & Status states
  const [syncLogs, setSyncLogs] = useState<{ id: string; time: string; type: "info" | "success" | "error"; text: string }[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState<string>("Sistem diinisialisasi dalam Tema Gelap.");

  // Data states (fallback to LocalStorage if sheets notice / empty)
  const [pemasukanList, setPemasukanList] = useState<Pemasukan[]>(() => {
    const saved = localStorage.getItem("tridaya_pemasukan");
    return saved ? JSON.parse(saved) : [];
  });

  const [pengeluaranList, setPengeluaranList] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("tridaya_pengeluaran");
    return saved ? JSON.parse(saved) : [];
  });

  const [mutasiList, setMutasiList] = useState<CashTransfer[]>(() => {
    const saved = localStorage.getItem("tridaya_mutasi");
    return saved ? JSON.parse(saved) : [];
  });

  const [categoriesList] = useState<Category[]>(DEFAULT_CATEGORIES);

  // Modals management
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<"pemasukan" | "pengeluaran" | "mutasi">("pemasukan");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Custom Confirmation Dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: "pemasukan" | "pengeluaran" | "mutasi";
    id: string;
  } | null>(null);

  // Form states
  const [formTanggal, setFormTanggal] = useState<string>("");
  const [formKategori, setFormKategori] = useState<string>("");
  const [formKeterangan, setFormKeterangan] = useState<string>("");
  const [formJumlah, setFormJumlah] = useState<number>(0);
  const [formDari, setFormDari] = useState<string>("");
  const [formKe, setFormKe] = useState<string>("");
  const [formJenis, setFormJenis] = useState<"Deposit" | "Penarikan">("Deposit");

  // Form states specifically for Pemasukan
  const [formLuasan, setFormLuasan] = useState<number>(0);
  const [formPendapatanKotor, setFormPendapatanKotor] = useState<number>(0);
  const [formGajiOperator, setFormGajiOperator] = useState<number>(0);
  const [formGajiHelper, setFormGajiHelper] = useState<number>(0);
  const [formLainnya, setFormLainnya] = useState<number>(0);

  // Robust helper to normalize any date string into standard YYYY-MM-DD
  const normalizeDate = (rawVal: any): string => {
    if (rawVal === undefined || rawVal === null) {
      return new Date().toISOString().split("T")[0];
    }
    
    let dateStr = "";
    if (typeof rawVal === "object") {
      if (rawVal.value !== undefined) {
        dateStr = String(rawVal.value);
      } else if (rawVal.formattedValue !== undefined) {
        dateStr = String(rawVal.formattedValue);
      } else {
        dateStr = String(rawVal);
      }
    } else {
      dateStr = String(rawVal);
    }

    const trimmed = dateStr.trim();
    if (!trimmed || trimmed === "[object Object]") {
      return new Date().toISOString().split("T")[0];
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const firstPart = trimmed.split(/[T ]/)[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(firstPart)) {
      return firstPart;
    }
    const separator = trimmed.includes("/") ? "/" : trimmed.includes("-") ? "-" : "";
    if (separator) {
      const parts = trimmed.split(separator);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        if (parts[2].length === 4) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
        if (parts[2].length === 2) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = "20" + parts[2];
          return `${year}-${month}-${day}`;
        }
      }
    }
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {}
    return new Date().toISOString().split("T")[0];
  };

  // Helper to parse any object safely as a Pemasukan structure
  const parsePemasukanItem = (item: any): Pemasukan => {
    const getVal = (keys: string[], defaultVal: any = "") => {
      for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) return item[key];
        const normalizedKey = key.toLowerCase().replace(/[\s_]+/g, "");
        for (const itemKey of Object.keys(item)) {
          if (itemKey.toLowerCase().replace(/[\s_]+/g, "") === normalizedKey) {
            return item[itemKey];
          }
        }
      }
      return defaultVal;
    };

    const id = String(getVal(["id", "Id", "ID"], `TX-${Math.floor(1000 + Math.random() * 9000)}`));
    const tanggal = normalizeDate(String(getVal(["tanggal", "Tanggal", "date"], "")));
    const luasan = Number(getVal(["luasan", "Luasan"], 0));
    const pendapatan_kotor = Number(getVal(["pendapatan_kotor", "pendapatanKotor", "Pendapatan_kotor", "Pendapatan Kotor"], 0));
    const gaji_operator = Number(getVal(["gaji_operator", "gajiOperator", "Gaji_operator", "Gaji Operator"], 0));
    const gaji_helper = Number(getVal(["gaji_helper", "gajiHelper", "Gaji_helper", "Gaji Helper"], 0));
    const lainnya = Number(getVal(["lainnya", "Lainnya"], 0));
    
    // Automatically calculate pendapatan_bersih
    const pendapatan_bersih = pendapatan_kotor - (gaji_operator + gaji_helper + lainnya);

    const keterangan = String(getVal(["keterangan", "Keterangan", "keterangan_tambahan"], ""));
    const nominal = Number(getVal(["nominal", "Nominal"], pendapatan_bersih));
    const created_by = String(getVal(["created_by", "createdBy", "Created_by", "Created By"], "admin"));
    const created_at = String(getVal(["created_at", "createdAt", "Created_at", "Created At"], new Date().toISOString()));

    return {
      id,
      tanggal,
      luasan,
      pendapatan_kotor,
      gaji_operator,
      gaji_helper,
      lainnya,
      pendapatan_bersih,
      keterangan,
      nominal,
      created_by,
      created_at
    };
  };

  // Helper to parse any object safely as a CashTransfer structure
  const parseMutasiItem = (item: any): CashTransfer => {
    const getVal = (keys: string[], defaultVal: any = "") => {
      for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) return item[key];
        const normalizedKey = key.toLowerCase().replace(/[\s_]+/g, "");
        for (const itemKey of Object.keys(item)) {
          if (itemKey.toLowerCase().replace(/[\s_]+/g, "") === normalizedKey) {
            return item[itemKey];
          }
        }
      }
      return defaultVal;
    };

    const id = String(getVal(["id", "Id", "ID"], `MT-${Math.floor(1000 + Math.random() * 9000)}`));
    const tanggal = normalizeDate(String(getVal(["tanggal", "Tanggal", "date"], "")));
    const jenisRaw = String(getVal(["jenis", "Jenis", "tipe", "Tipe"], "Deposit"));
    const jenis: "Deposit" | "Penarikan" = (jenisRaw.toLowerCase() === "penarikan") ? "Penarikan" : "Deposit";
    const keterangan = String(getVal(["keterangan", "Keterangan"], ""));
    const nominal = Number(getVal(["nominal", "Nominal", "jumlah", "Jumlah"], 0));
    const created_by = String(getVal(["created_by", "createdBy", "Created_by", "Created By"], "admin"));
    const created_at = String(getVal(["created_at", "createdAt", "Created_at", "Created At"], new Date().toISOString()));

    return {
      id,
      tanggal,
      jenis,
      keterangan,
      nominal,
      created_by,
      created_at
    };
  };

  // Helper to parse any object safely as a Pengeluaran (Transaction) structure
  const parsePengeluaranItem = (item: any): Transaction => {
    const getVal = (keys: string[], defaultVal: any = "") => {
      for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) return item[key];
        const normalizedKey = key.toLowerCase().replace(/[\s_]+/g, "");
        for (const itemKey of Object.keys(item)) {
          if (itemKey.toLowerCase().replace(/[\s_]+/g, "") === normalizedKey) {
            return item[itemKey];
          }
        }
      }
      return defaultVal;
    };

    const id = String(getVal(["id", "Id", "ID"], `TX-${Math.floor(2000 + Math.random() * 9000)}`));
    const tanggal = normalizeDate(String(getVal(["tanggal", "Tanggal", "date"], "")));
    const kategori = String(getVal(["kategori", "Kategori"], "Lainnya"));
    const keterangan = String(getVal(["keterangan", "Keterangan"], ""));
    const nominal = Number(getVal(["nominal", "Nominal", "jumlah", "Jumlah"], 0));
    const created_by = String(getVal(["created_by", "createdBy", "Created_by", "Created By"], "admin"));
    const created_at = String(getVal(["created_at", "createdAt", "Created_at", "Created At"], new Date().toISOString()));

    return {
      id,
      tanggal,
      kategori,
      keterangan,
      nominal,
      created_by,
      created_at
    };
  };

  // Logger helper
  const addLog = (text: string, type: "info" | "success" | "error" = "info") => {
    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
    setSyncLogs(prev => [{ id: Math.random().toString(), time, type, text }, ...prev].slice(0, 40));
  };

  // Sync to local storage as fallback/cache
  useEffect(() => {
    localStorage.setItem("tridaya_pemasukan", JSON.stringify(pemasukanList));
  }, [pemasukanList]);

  useEffect(() => {
    localStorage.setItem("tridaya_pengeluaran", JSON.stringify(pengeluaranList));
  }, [pengeluaranList]);

  useEffect(() => {
    localStorage.setItem("tridaya_mutasi", JSON.stringify(mutasiList));
  }, [mutasiList]);

  // Load and sync sheet data on mount & refresh
  const loadDataFromSheets = async () => {
    setSyncStatus("syncing");
    addLog("Menghubungkan ke Google Sheets...", "info");
    setConnectionMessage("Memuat data dari Google Sheets...");

    let hasErrors = false;

    // 1. Fetch dashboard status
    try {
      const data = await apiService.getDashboard();
      if (data.status === "success") {
        addLog("Koneksi dasbor Google Sheets berhasil.", "success");
      } else {
        addLog(`Informasi dasbor: ${data.message || "Buku kas kosong"}`, "info");
      }
    } catch (err: any) {
      addLog(`Dasbor API luring: ${err.message}`, "error");
      showSnackbar(`Gagal memuat status dasbor: ${err.message}`, "error");
      hasErrors = true;
    }

    // 2. Fetch Pemasukan sheet
    try {
      const data = await apiService.getPemasukan();
      if (Array.isArray(data)) {
        const parsedList = data.map((item: any) => parsePemasukanItem(item));
        setPemasukanList(parsedList);
        addLog(`Berhasil memuat ${data.length} baris data Pemasukan.`, "success");
      }
    } catch (err: any) {
      addLog(`API Pemasukan offline: ${err.message}. Memuat cadangan lokal.`, "info");
      showSnackbar(`Pemasukan: ${err.message}`, "error");
    }

    // 3. Fetch Pengeluaran sheet
    try {
      const data = await apiService.getPengeluaran();
      if (Array.isArray(data)) {
        const parsedList = data.map((item: any) => parsePengeluaranItem(item));
        setPengeluaranList(parsedList);
        addLog(`Berhasil memuat ${data.length} baris data Pengeluaran.`, "success");
      }
    } catch (err: any) {
      addLog(`API Pengeluaran offline: ${err.message}. Memuat cadangan lokal.`, "info");
      showSnackbar(`Pengeluaran: ${err.message}`, "error");
    }

    // 4. Fetch MutasiKas sheet
    try {
      const data = await apiService.getMutasiKas();
      if (Array.isArray(data)) {
        const parsedList = data.map((item: any) => parseMutasiItem(item));
        setMutasiList(parsedList);
        addLog(`Berhasil memuat ${data.length} baris data MutasiKas.`, "success");
      }
    } catch (err: any) {
      addLog(`API MutasiKas offline: ${err.message}. Memuat cadangan lokal.`, "info");
      showSnackbar(`Mutasi Kas: ${err.message}`, "error");
    }

    if (hasErrors) {
      setSyncStatus("error");
      setConnectionMessage("Sinkronisasi gagal atau berjalan dalam mode luring.");
    } else {
      setSyncStatus("success");
      setConnectionMessage("Google Sheets berhasil terhubung secara langsung!");
    }
  };

  const loadShareTokensHistory = async () => {
    try {
      const data = await apiService.getShareTokens();
      if (Array.isArray(data)) {
        // Filter out headers or invalid empty rows
        const cleaned = data.filter((row: any) => row.id && row.token);
        // Sort by created_at descending
        const sorted = [...cleaned].sort((a: any, b: any) => {
          return (b.created_at || "").localeCompare(a.created_at || "");
        });
        setShareTokensHistory(sorted);
        // Find if there is an active one
        const active = cleaned.find((row: any) => (row.expires_at === "Aktif" || row.expired_at === "Aktif"));
        if (active) {
          setGeneratedToken(active.token);
        }
      }
    } catch (err: any) {
      addLog(`API ShareTokens luring atau terputus: ${err.message}`, "info");
      console.warn("Gagal memuat riwayat share tokens:", err.message);
    }
  };

  const handleGenerateShareToken = async () => {
    setIsGeneratingToken(true);
    setCopiedSuccess(false);
    addLog("Memulai proses pembuatan token share investor baru...", "info");
    try {
      const data = await apiService.generateShareToken();
      if (data.status === "success" && data.token) {
        setGeneratedToken(data.token);
        addLog(`Tautan investor baru berhasil dibuat: token ${data.token}`, "success");
        showSnackbar(`Sukses membuat link share investor baru!`, "success");
        // Reload history
        loadShareTokensHistory();
      } else {
        addLog(`Gagal membuat tautan share: ${data.message || "Unknown error"}`, "error");
        showSnackbar(`Gagal membuat link: ${data.message}`, "error");
      }
    } catch (err: any) {
      addLog(`Kesalahan koneksi saat membuat token share: ${err.message}`, "error");
      showSnackbar(`Kesalahan koneksi: ${err.message}`, "error");
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedToken) return;
    const shareUrl = `${window.location.origin}/share?token=${generatedToken}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 3000);
      })
      .catch(err => {
        console.warn("Gagal menyalin link:", err);
      });
  };

  useEffect(() => {
    // Check connection to Google Sheets
    setSheetConnection("connecting");
    apiService.getDashboard()
      .then(res => {
        if (res && res.status === "success") {
          setSheetConnection("connected");
        } else {
          setSheetConnection("disconnected");
        }
      })
      .catch(() => {
        setSheetConnection("disconnected");
      });

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const isSharePath = window.location.pathname === "/share" || !!token;

    if (isSharePath && token) {
      setIsInvestorMode(true);
      setInvestorToken(token);
      setInvestorLoading(true);
      
      apiService.getInvestorDashboard(token)
        .then(data => {
          if (data.status === "success" && data.valid) {
            // Parse data lists
            const pms = Array.isArray(data.data.pemasukan) 
              ? data.data.pemasukan.map((item: any) => parsePemasukanItem(item))
              : [];
            const pgl = Array.isArray(data.data.pengeluaran)
              ? data.data.pengeluaran.map((item: any) => parsePengeluaranItem(item))
              : [];
            const mts = Array.isArray(data.data.mutasi)
              ? data.data.mutasi.map((item: any) => parseMutasiItem(item))
              : [];
            
            setPemasukanList(pms);
            setPengeluaranList(pgl);
            setMutasiList(mts);
            setInvestorLoading(false);
          } else {
            setInvestorError(data.message || "Link tidak valid atau telah kedaluwarsa.");
            setInvestorLoading(false);
          }
        })
        .catch(err => {
          setInvestorError("Gagal terhubung ke server verifikasi.");
          setInvestorLoading(false);
        });
    } else if (isSharePath && !token) {
      setIsInvestorMode(true);
      setInvestorError("Link tidak valid atau telah kedaluwarsa.");
    } else {
      addLog("Aplikasi diinisialisasi dalam Tema Gelap.", "info");
      // Check if user is logged in
      const savedUser = localStorage.getItem("tridaya_user");
      if (savedUser) {
        loadDataFromSheets();
        loadShareTokensHistory();
      }
    }
  }, []);

  // Calculations for dashboard
  const totalPemasukan = pemasukanList.reduce((acc, curr) => acc + (curr.pendapatan_bersih || 0), 0);
  const totalPengeluaran = pengeluaranList.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  const totalKas = mutasiList.reduce((acc, curr) => acc + (curr.jenis === "Deposit" ? (curr.nominal || 0) : -(curr.nominal || 0)), 0);
  const totalSaldo = totalKas + totalPemasukan - totalPengeluaran;
  const totalLuasan = pemasukanList.reduce((acc, curr) => acc + (Number(curr.luasan) || 0), 0);

  // Formatting utils
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(num);
  };

  // Reset Form state
  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormTanggal(today);
    setFormKategori(categoriesList.filter(c => c.tipe === modalType)[0]?.nama || "Lainnya");
    setFormKeterangan("");
    setFormJumlah(0);
    setFormDari("Kas Tunai");
    setFormKe("Bank Mandiri");
    setFormJenis("Deposit");
    setFormLuasan(0);
    setFormPendapatanKotor(0);
    setFormGajiOperator(0);
    setFormGajiHelper(0);
    setFormLainnya(0);
    setEditingItem(null);
    setModalError(null);
  };

  // Trigger modal for editing
  const handleOpenEdit = (type: "pemasukan" | "pengeluaran" | "mutasi", item: any) => {
    setModalType(type);
    setEditingItem(item);
    setFormTanggal(normalizeDate(item.tanggal));
    setFormKeterangan(item.keterangan);
    setModalError(null);
    if (type === "pemasukan") {
      const parsedItem = parsePemasukanItem(item);
      setFormLuasan(parsedItem.luasan);
      setFormPendapatanKotor(parsedItem.pendapatan_kotor);
      setFormGajiOperator(parsedItem.gaji_operator);
      setFormGajiHelper(parsedItem.gaji_helper);
      setFormLainnya(parsedItem.lainnya);
      setFormJumlah(parsedItem.pendapatan_bersih);
    } else if (type === "mutasi") {
      const parsedItem = parseMutasiItem(item);
      setFormJumlah(parsedItem.nominal);
      setFormJenis(parsedItem.jenis);
    } else {
      const parsedItem = parsePengeluaranItem(item);
      setFormJumlah(parsedItem.nominal);
      setFormKategori(parsedItem.kategori);
    }
    setIsModalOpen(true);
  };

  // Trigger modal for adding
  const handleOpenAdd = (type: "pemasukan" | "pengeluaran" | "mutasi") => {
    setModalType(type);
    setModalError(null);
    setIsModalOpen(true);
    // Needs delay so states match correctly before reset
    setTimeout(() => {
      const today = new Date().toISOString().split("T")[0];
      setFormTanggal(today);
      setFormKategori(categoriesList.filter(c => c.tipe === type)[0]?.nama || "Lainnya");
      setFormKeterangan("");
      setFormJumlah(0);
      setFormDari("Kas Tunai");
      setFormKe("Bank Mandiri");
      setFormJenis("Deposit");
      setFormLuasan(0);
      setFormPendapatanKotor(0);
      setFormGajiOperator(0);
      setFormGajiHelper(0);
      setFormLainnya(0);
      setEditingItem(null);
    }, 10);
  };

  // Form handling
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modalType === "pemasukan") {
      if (formPendapatanKotor <= 0) {
        setModalError("Pendapatan kotor harus lebih dari 0.");
        return;
      }
    } else {
      if (formJumlah <= 0) {
        setModalError("Jumlah transaksi harus lebih dari 0.");
        return;
      }
    }
    setModalError(null);

    if (modalType === "pemasukan") {
      const net = formPendapatanKotor - (formGajiOperator + formGajiHelper + formLainnya);
      const payloadData: Pemasukan = {
        id: editingItem ? editingItem.id : `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        tanggal: formTanggal,
        luasan: formLuasan,
        pendapatan_kotor: formPendapatanKotor,
        gaji_operator: formGajiOperator,
        gaji_helper: formGajiHelper,
        lainnya: formLainnya,
        pendapatan_bersih: net,
        keterangan: formKeterangan,
        nominal: net,
        created_by: editingItem?.created_by || user?.username || "admin",
        created_at: editingItem?.created_at || new Date().toISOString()
      };

      if (editingItem) {
        setPemasukanList(pemasukanList.map(item => item.id === editingItem.id ? payloadData : item));
        addLog(`Mengubah pemasukan ID ${editingItem.id}...`, "info");
        apiService.updatePemasukan(editingItem.id, payloadData)
          .then(() => {
            addLog(`[Synced] Sukses mengubah pemasukan ID ${editingItem.id}`, "success");
            showSnackbar("Berhasil mengubah pemasukan!", "success");
          })
          .catch(err => {
            addLog(`[Sync Gagal] Gagal menyimpan perubahan pemasukan: ${err.message}`, "error");
            showSnackbar(`Gagal menyimpan perubahan: ${err.message}`, "error");
          });
      } else {
        setPemasukanList([...pemasukanList, payloadData]);
        addLog(`Menambah pemasukan baru...`, "info");
        apiService.createPemasukan(payloadData)
          .then(() => {
            addLog(`[Synced] Sukses menambahkan pemasukan baru ID ${payloadData.id}`, "success");
            showSnackbar("Berhasil menambahkan pemasukan baru!", "success");
          })
          .catch(err => {
            addLog(`[Sync Gagal] Gagal menyimpan pemasukan baru: ${err.message}`, "error");
            showSnackbar(`Gagal menyimpan pemasukan baru: ${err.message}`, "error");
          });
      }
    } else if (modalType === "pengeluaran") {
      if (editingItem) {
        const parsed = parsePengeluaranItem(editingItem);
        const updated: Transaction = {
          id: parsed.id,
          tanggal: formTanggal,
          kategori: formKategori,
          keterangan: formKeterangan,
          nominal: formJumlah,
          created_by: parsed.created_by || user?.username || "admin",
          created_at: parsed.created_at || new Date().toISOString()
        };
        setPengeluaranList(pengeluaranList.map(item => item.id === parsed.id ? updated : item));
        addLog(`Mengubah pengeluaran ID ${parsed.id}...`, "info");
        apiService.updatePengeluaran(parsed.id, updated)
          .then(() => {
            addLog(`[Synced] Sukses mengubah pengeluaran ID ${parsed.id}`, "success");
            showSnackbar("Berhasil mengubah pengeluaran!", "success");
          })
          .catch(err => {
            addLog(`[Sync Gagal] Gagal menyimpan perubahan pengeluaran: ${err.message}`, "error");
            showSnackbar(`Gagal menyimpan perubahan: ${err.message}`, "error");
          });
      } else {
        const newId = `TX-${Math.floor(2000 + Math.random() * 9000)}`;
        const newItem: Transaction = {
          id: newId,
          tanggal: formTanggal,
          kategori: formKategori,
          keterangan: formKeterangan,
          nominal: formJumlah,
          created_by: user?.username || "admin",
          created_at: new Date().toISOString()
        };
        setPengeluaranList([...pengeluaranList, newItem]);
        addLog(`Menambah pengeluaran baru...`, "info");
        apiService.createPengeluaran(newItem)
          .then(() => {
            addLog(`[Synced] Sukses menambahkan pengeluaran baru ID ${newId}`, "success");
            showSnackbar("Berhasil menambahkan pengeluaran baru!", "success");
          })
          .catch(err => {
            addLog(`[Sync Gagal] Gagal menyimpan pengeluaran baru: ${err.message}`, "error");
            showSnackbar(`Gagal menyimpan pengeluaran baru: ${err.message}`, "error");
          });
      }
    } else {
      if (editingItem) {
        const parsed = parseMutasiItem(editingItem);
        const updated: CashTransfer = {
          ...parsed,
          tanggal: formTanggal,
          jenis: formJenis,
          keterangan: formKeterangan,
          nominal: formJumlah,
        };
        setMutasiList(mutasiList.map(item => item.id === editingItem.id ? updated : item));
        addLog(`Mengubah mutasi kas ID ${editingItem.id}...`, "info");
        apiService.updateMutasiKas(editingItem.id, updated)
          .then(() => {
            addLog(`[Synced] Sukses mengubah mutasi kas ID ${editingItem.id}`, "success");
            showSnackbar("Berhasil mengubah mutasi kas!", "success");
          })
          .catch(err => {
            addLog(`[Sync Gagal] Gagal menyimpan perubahan mutasi kas: ${err.message}`, "error");
            showSnackbar(`Gagal menyimpan perubahan: ${err.message}`, "error");
          });
      } else {
        const newId = `MT-${Math.floor(3000 + Math.random() * 9000)}`;
        const newItem: CashTransfer = {
          id: newId,
          tanggal: formTanggal,
          jenis: formJenis,
          keterangan: formKeterangan,
          nominal: formJumlah,
          created_by: user?.username || "admin",
          created_at: new Date().toISOString(),
        };
        setMutasiList([...mutasiList, newItem]);
        addLog(`Menambah mutasi kas baru...`, "info");
        apiService.createMutasiKas(newItem)
          .then(() => {
            addLog(`[Synced] Sukses menambahkan mutasi kas baru ID ${newId}`, "success");
            showSnackbar("Berhasil menambahkan mutasi kas baru!", "success");
          })
          .catch(err => {
            addLog(`[Sync Gagal] Gagal menyimpan mutasi kas baru: ${err.message}`, "error");
            showSnackbar(`Gagal menyimpan mutasi kas baru: ${err.message}`, "error");
          });
      }
    }

    setIsModalOpen(false);
  };

  // Delete transaction
  const handleDelete = (type: "pemasukan" | "pengeluaran" | "mutasi", id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type,
      id
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmation) return;
    const { type, id } = deleteConfirmation;

    if (type === "pemasukan") {
      setPemasukanList(pemasukanList.filter(item => item.id !== id));
      addLog(`Menghapus pemasukan ID ${id}...`, "info");
      apiService.deletePemasukan(id)
        .then(() => {
          addLog(`[Synced] Sukses menghapus pemasukan ID ${id}`, "success");
          showSnackbar("Berhasil menghapus pemasukan!", "success");
        })
        .catch(err => {
          addLog(`[Sync Gagal] Gagal menghapus pemasukan: ${err.message}`, "error");
          showSnackbar(`Gagal menghapus pemasukan: ${err.message}`, "error");
        });
    } else if (type === "pengeluaran") {
      setPengeluaranList(pengeluaranList.filter(item => item.id !== id));
      addLog(`Menghapus pengeluaran ID ${id}...`, "info");
      apiService.deletePengeluaran(id)
        .then(() => {
          addLog(`[Synced] Sukses menghapus pengeluaran ID ${id}`, "success");
          showSnackbar("Berhasil menghapus pengeluaran!", "success");
        })
        .catch(err => {
          addLog(`[Sync Gagal] Gagal menghapus pengeluaran: ${err.message}`, "error");
          showSnackbar(`Gagal menghapus pengeluaran: ${err.message}`, "error");
        });
    } else {
      setMutasiList(mutasiList.filter(item => item.id !== id));
      addLog(`Menghapus mutasi kas ID ${id}...`, "info");
      apiService.deleteMutasiKas(id)
        .then(() => {
          addLog(`[Synced] Sukses menghapus mutasi kas ID ${id}`, "success");
          showSnackbar("Berhasil menghapus mutasi kas!", "success");
        })
        .catch(err => {
          addLog(`[Sync Gagal] Gagal menghapus mutasi kas: ${err.message}`, "error");
          showSnackbar(`Gagal menghapus mutasi kas: ${err.message}`, "error");
        });
    }

    setDeleteConfirmation(null);
  };

  // Recharts analytic transformers
  const getChartData = () => {
    const datesMap: { [key: string]: { tanggal: string; pemasukan: number; pengeluaran: number; luasan: number } } = {};

    pemasukanList.forEach(item => {
      if (!datesMap[item.tanggal]) {
        datesMap[item.tanggal] = { tanggal: item.tanggal, pemasukan: 0, pengeluaran: 0, luasan: 0 };
      }
      datesMap[item.tanggal].pemasukan += item.pendapatan_bersih || 0;
      datesMap[item.tanggal].luasan += Number(item.luasan) || 0;
    });

    pengeluaranList.forEach(item => {
      const parsed = parsePengeluaranItem(item);
      if (!datesMap[parsed.tanggal]) {
        datesMap[parsed.tanggal] = { tanggal: parsed.tanggal, pemasukan: 0, pengeluaran: 0, luasan: 0 };
      }
      datesMap[parsed.tanggal].pengeluaran += parsed.nominal || 0;
    });

    return Object.values(datesMap).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  };

  const getCategoryBreakdown = (type: "pemasukan" | "pengeluaran") => {
    const dataList = type === "pemasukan" ? pemasukanList : pengeluaranList;
    const catMap: { [key: string]: number } = {};

    dataList.forEach(item => {
      if (type === "pemasukan") {
        const pItem = item as Pemasukan;
        catMap["Pendapatan Bersih"] = (catMap["Pendapatan Bersih"] || 0) + (pItem.pendapatan_bersih || 0);
      } else {
        const tItem = parsePengeluaranItem(item);
        catMap[tItem.kategori] = (catMap[tItem.kategori] || 0) + (tItem.nominal || 0);
      }
    });

    return Object.keys(catMap).map(key => ({
      name: key,
      value: catMap[key]
    }));
  };

  const currentCategoryBreakdown = getCategoryBreakdown("pengeluaran");

  // Style helper for categories
  const getCategoryColor = (categoryName: string) => {
    const found = categoriesList.find(c => c.nama === categoryName);
    if (!found) return "slate";
    return found.warna;
  };

  const getCategoryBadgeClass = (categoryName: string) => {
    const color = getCategoryColor(categoryName);
    switch (color) {
      case "emerald": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "teal": return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
      case "indigo": return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case "amber": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "rose": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "purple": return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "orange": return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      case "blue": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      default: return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
    }
  };

  const getPieColor = (index: number) => {
    const colors = ["#f43f5e", "#f59e0b", "#a855f7", "#ec4899", "#3b82f6", "#64748b", "#10b981", "#14b8a6"];
    return colors[index % colors.length];
  };

  // Render Investor Mode if active
  if (isInvestorMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 antialiased selection:bg-indigo-500/30 selection:text-white">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-2xl text-white shadow-xl shadow-indigo-600/10 shrink-0">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-black block">Portal Investor Tridaya</span>
                <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">Dasbor Kinerja Keuangan</h1>
                <p className="text-xs text-slate-500 mt-0.5 font-semibold">Tautan berbagi aman yang diverifikasi langsung dengan Google Sheets.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/50" />
                <span>Koneksi Aman Terverifikasi</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-800/80 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span className="font-mono">Live UTC: {new Date().toISOString().split("T")[0]}</span>
              </div>
            </div>
          </div>

          {investorLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-bold text-slate-400">Memverifikasi token & memuat data real-time...</p>
            </div>
          ) : investorError ? (
            <div className="bg-rose-500/5 border border-rose-500/15 p-12 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 shadow-2xl">
              <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-rose-400">Akses Ditolak</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  {investorError}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Silakan hubungi administrator keuangan Tridaya untuk meminta tautan baru yang valid.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Statistics Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Saldo */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition duration-200">
                  <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 text-indigo-500/5 group-hover:scale-110 transition duration-200">
                    <Wallet className="h-32 w-32" />
                  </div>
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block">Total Saldo</span>
                    <h3 className={`text-2xl font-black font-mono tracking-tight ${totalSaldo >= 0 ? "text-slate-100" : "text-rose-500"}`}>{formatIDR(totalSaldo)}</h3>
                    <p className="text-[9px] text-slate-400 font-semibold leading-tight">Kas ({formatIDR(totalKas)}) + Pendapatan Bersih ({formatIDR(totalPemasukan)}) - Pengeluaran ({formatIDR(totalPengeluaran)})</p>
                  </div>
                  <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 relative z-10">
                    <Wallet className="h-5.5 w-5.5" />
                  </div>
                </div>

                {/* Total Luasan */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition duration-200">
                  <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 text-indigo-500/5 group-hover:scale-110 transition duration-200">
                    <Layers3 className="h-32 w-32" />
                  </div>
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Total Luasan</span>
                    <h3 className="text-2xl font-black font-mono text-indigo-400 tracking-tight">{totalLuasan.toLocaleString("id-ID")} bahu</h3>
                    <p className="text-[11px] text-slate-400 font-semibold">Total pengerjaan lahan aktif</p>
                  </div>
                  <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 relative z-10">
                    <Layers3 className="h-5.5 w-5.5" />
                  </div>
                </div>

                {/* Total Expense */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition duration-200">
                  <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 text-rose-500/5 group-hover:scale-110 transition duration-200">
                    <TrendingDown className="h-32 w-32" />
                  </div>
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Total Pengeluaran</span>
                    <h3 className="text-2xl font-black font-mono text-rose-400 tracking-tight">{formatIDR(totalPengeluaran)}</h3>
                    <p className="text-[11px] text-slate-400 font-semibold">{pengeluaranList.length} transaksi pengeluaran</p>
                  </div>
                  <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 relative z-10">
                    <TrendingDown className="h-5.5 w-5.5" />
                  </div>
                </div>

                {/* Pendapatan Bersih */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition duration-200">
                  <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 text-emerald-500/5 group-hover:scale-110 transition duration-200">
                    <TrendingUp className="h-32 w-32" />
                  </div>
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Pendapatan Bersih</span>
                    <h3 className="text-2xl font-black font-mono text-emerald-400 tracking-tight">{formatIDR(totalPemasukan)}</h3>
                    <p className="text-[11px] text-slate-400 font-semibold">{pemasukanList.length} transaksi pemasukan</p>
                  </div>
                  <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 relative z-10">
                    <TrendingUp className="h-5.5 w-5.5" />
                  </div>
                </div>
              </div>

              {/* Analytical Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Trend line */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 lg:col-span-2 space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Tren Aliran Kas Harian</h4>
                    <p className="text-[11px] text-slate-500">Visualisasi pemasukan and pengeluaran harian</p>
                  </div>
                  <div className="h-72 w-full text-xs">
                    {getChartData().length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-500">
                        Tidak ada catatan transaksi untuk ditampilkan.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPms" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorPgl" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="tanggal" stroke="#64748b" tickFormatter={(v) => v.split("-").slice(1).join("/")} />
                          <YAxis stroke="#64748b" />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                          <Legend />
                          <Area type="monotone" dataKey="pemasukan" name="Pemasukan" stroke="#10b981" fillOpacity={1} fill="url(#colorPms)" strokeWidth={2.5} />
                          <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#f43f5e" fillOpacity={1} fill="url(#colorPgl)" strokeWidth={2.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Right: Category breakdowns */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Breakdown Pengeluaran</h4>
                    <p className="text-[11px] text-slate-500">Berdasarkan klasifikasi kategori</p>
                  </div>
                  <div className="h-72 w-full flex flex-col justify-between">
                    {currentCategoryBreakdown.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                        Tidak ada klasifikasi pengeluaran.
                      </div>
                    ) : (
                      <>
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={currentCategoryBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {currentCategoryBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={getPieColor(index)} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatIDR(Number(value))} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Legend list */}
                        <div className="overflow-y-auto max-h-24 pr-1 space-y-1.5 scrollbar-none">
                          {currentCategoryBreakdown.map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getPieColor(index) }} />
                                <span className="truncate max-w-[120px]">{entry.name}</span>
                              </div>
                              <span className="font-mono text-slate-200">{formatIDR(entry.value)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Rincian semua transaksi sorted by date */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black uppercase text-slate-300 tracking-wider">Rincian Riwayat Transaksi</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Semua catatan pemasukan, pengeluaran, dan mutasi terurut berdasarkan tanggal.</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/40 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-4">Tanggal</th>
                        <th className="p-4">ID Transaksi</th>
                        <th className="p-4">Jenis</th>
                        <th className="p-4">Keterangan / Detil</th>
                        <th className="p-4 text-right">Nominal (IDR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-semibold text-xs text-slate-300">
                      {[
                        ...pemasukanList.map(item => ({
                          id: item.id,
                          tanggal: item.tanggal,
                          keterangan: item.keterangan || "Pendapatan Bersih Lahan",
                          nominal: item.pendapatan_bersih,
                          tipe: "pemasukan",
                          detail: `${item.luasan} bahu (Pendapatan Kotor: ${formatIDR(item.pendapatan_kotor)})`
                        })),
                        ...pengeluaranList.map(item => {
                          const parsed = parsePengeluaranItem(item);
                          return {
                            id: parsed.id,
                            tanggal: parsed.tanggal,
                            keterangan: parsed.keterangan,
                            nominal: parsed.nominal,
                            tipe: "pengeluaran",
                            detail: `Kategori: ${parsed.kategori}`
                          };
                        }),
                        ...mutasiList.map(item => {
                          const parsed = parseMutasiItem(item);
                          return {
                            id: parsed.id,
                            tanggal: parsed.tanggal,
                            keterangan: parsed.keterangan,
                            nominal: parsed.nominal,
                            tipe: "mutasi",
                            detail: `Mutasi: ${parsed.jenis}`
                          };
                        })
                      ]
                        .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                        .map((tx, idx) => (
                          <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-900/30 transition">
                            <td className="p-4 font-mono text-[11px] text-indigo-400 whitespace-nowrap">{tx.tanggal}</td>
                            <td className="p-4 font-mono text-[10px] text-slate-400">{tx.id}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  tx.tipe === "pemasukan"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : tx.tipe === "pengeluaran"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }`}
                              >
                                {tx.tipe === "pemasukan" ? "Pemasukan" : tx.tipe === "pengeluaran" ? "Pengeluaran" : "Mutasi"}
                              </span>
                            </td>
                            <td className="p-4 max-w-xs sm:max-w-md">
                              <p className="font-bold text-slate-200 truncate">{tx.keterangan}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-semibold truncate">{tx.detail}</p>
                            </td>
                            <td className={`p-4 text-right font-mono font-black text-xs ${
                              tx.tipe === "pemasukan"
                                ? "text-emerald-400"
                                : tx.tipe === "pengeluaran"
                                ? "text-rose-400"
                                : "text-blue-400"
                            }`}>
                              {tx.tipe === "pemasukan" ? "+" : tx.tipe === "pengeluaran" ? "-" : ""}
                              {formatIDR(tx.nominal)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user && !isInvestorMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center p-4 antialiased selection:bg-indigo-500/30 selection:text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Ambient light glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
          
          <div className="relative z-10 text-center space-y-6">
            {/* Sheet Connection Status Indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800/80 rounded-full text-[9px] font-extrabold tracking-wider uppercase text-slate-400 select-none mx-auto">
              {sheetConnection === "connecting" && (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                  <span className="text-amber-400 font-mono tracking-normal">Sheet: Menghubungkan...</span>
                </>
              )}
              {sheetConnection === "connected" && (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 font-mono tracking-normal text-[8.5px]">Sheet: Connected</span>
                </>
              )}
              {sheetConnection === "disconnected" && (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </span>
                  <span className="text-rose-400 font-mono tracking-normal text-[8.5px]">Sheet: Disconnected</span>
                </>
              )}
            </div>

            <div className="block">
              <div className="inline-flex p-3 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-2xl text-white shadow-xl shadow-indigo-600/25">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Tridaya Ledger</h2>
              <p className="text-xs text-slate-400 mt-1">Sistem Laporan Keuangan Combine Harvester</p>
            </div>

            {loginError && (
              <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs py-3 px-4 rounded-xl flex items-center gap-2.5 text-left">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Username</label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition duration-200"
                  placeholder="Masukkan username"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition duration-200"
                  placeholder="Masukkan password"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition font-bold text-xs uppercase tracking-wider rounded-xl text-white shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Login Masuk"
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row antialiased">
      {/* 1. MOBILE RESPONSIVE TOP NAV BAR */}
      <div className="md:hidden w-full bg-slate-900 border-b border-slate-800 px-4 py-3.5 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-lg text-white shadow-lg">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight">Tridaya</h1>
            <p className="text-[10px] text-indigo-400 font-medium">Buku Keuangan Combine Harvester</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh/Sync button */}
          <button
            onClick={loadDataFromSheets}
            disabled={syncStatus === "syncing"}
            className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition active:scale-95 disabled:opacity-50"
            title="SINKRONISASI"
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin text-indigo-400" : ""}`} />
          </button>
          
          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* MOBILE DRAWERS */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 bottom-0 left-0 w-72 bg-slate-900 border-r border-slate-800 p-6 z-50 md:hidden flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-md font-extrabold tracking-tight">Tridaya</h2>
                      <p className="text-[10px] text-indigo-400 font-semibold">Live Report Sync</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Status Indicator */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === "success" ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : syncStatus === "syncing" ? "bg-amber-500 animate-pulse" : "bg-rose-500 animate-pulse"}`} />
                  <span className="text-[11px] font-semibold text-slate-300 truncate">
                    {syncStatus === "success" ? "Google Sheets Terkoneksi" : syncStatus === "syncing" ? "Menghubungkan..." : "Luring / Cadangan Lokal"}
                  </span>
                </div>

                {/* Navigation Menu */}
                <nav className="space-y-1.5">
                  {[
                    { id: "ikhtisar", label: "Ikhtisar Dasbor", icon: Layers },
                    { id: "pemasukan", label: "Catatan Pemasukan", icon: TrendingUp },
                    { id: "pengeluaran", label: "Catatan Pengeluaran", icon: TrendingDown },
                    { id: "mutasi", label: "Mutasi Kas & Bank", icon: ArrowLeftRight },
                    { id: "settings", label: "Integrasi & Konsol", icon: Settings },
                    { id: "share", label: "Share Akses Investor", icon: Share2 },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition duration-200 ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                        }`}
                      >
                        <TabIcon className="h-4.5 w-4.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Active User profile & Logout */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-2.5 mt-auto">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-200 truncate leading-tight">{user?.nama}</p>
                    <p className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest mt-0.5">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("tridaya_user");
                    setUser(null);
                    showSnackbar("Anda telah berhasil keluar.", "info");
                  }}
                  className="w-full py-2 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. DESKTOP PERMANENT SIDEBAR */}
      <motion.div
        animate={{ width: sidebarCollapsed ? "5.5rem" : "18rem" }}
        transition={{ type: "spring", damping: 20, stiffness: 180 }}
        className="hidden md:flex flex-col justify-between bg-slate-900 border-r border-slate-800/80 min-h-screen shrink-0 relative overflow-hidden"
      >
        <div className="p-6 space-y-8 flex flex-col h-full">
          {/* Brand header */}
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-600/20">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold tracking-tight">Tridaya Ledger</h2>
                    <p className="text-[10px] text-indigo-400 font-semibold">Live Google Sheets Sync</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {sidebarCollapsed && (
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg mx-auto">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            )}
          </div>

          {/* Sync status widget (only if expanded) */}
          {!sidebarCollapsed && (
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${syncStatus === "success" ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : syncStatus === "syncing" ? "bg-amber-500 animate-pulse" : "bg-rose-500 animate-pulse"}`} />
                <span className="text-[11px] font-bold text-slate-300">
                  {syncStatus === "success" ? "Connected to Google Sheet" : syncStatus === "syncing" ? "Syncing..." : "Offline Fallback Mode"}
                </span>
              </div>
              <button
                onClick={loadDataFromSheets}
                disabled={syncStatus === "syncing"}
                className="w-full bg-slate-800 hover:bg-slate-700/80 active:scale-95 disabled:opacity-50 text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer text-indigo-400"
              >
                <RefreshCw className={`h-3 w-3 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                Segarkan Spreadsheet
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {[
              { id: "ikhtisar", label: "Ikhtisar Dasbor", icon: Layers },
              { id: "pemasukan", label: "Catatan Pemasukan", icon: TrendingUp },
              { id: "pengeluaran", label: "Catatan Pengeluaran", icon: TrendingDown },
              { id: "mutasi", label: "Mutasi Kas & Bank", icon: ArrowLeftRight },
              { id: "settings", label: "Integrasi & Konsol", icon: Settings },
              { id: "share", label: "Share Akses Investor", icon: Share2 },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : ""} gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition duration-150 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                  title={tab.label}
                >
                  <TabIcon className="h-4.5 w-4.5 shrink-0" />
                  {!sidebarCollapsed && <span>{tab.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* User profile & Logout */}
          <div className="mt-auto pt-4 border-t border-slate-800/80">
            {sidebarCollapsed ? (
              <button
                onClick={() => {
                  localStorage.removeItem("tridaya_user");
                  setUser(null);
                  showSnackbar("Anda telah berhasil keluar.", "info");
                }}
                className="mx-auto p-3 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer flex items-center justify-center"
                title="Keluar"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            ) : (
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-200 truncate leading-tight">{user?.nama}</p>
                    <p className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest mt-0.5">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("tridaya_user");
                    setUser(null);
                    showSnackbar("Anda telah berhasil keluar.", "info");
                  }}
                  className="w-full py-2 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Trigger control */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute right-0 bottom-6 bg-slate-800 border-y border-l border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white p-1.5 rounded-l-lg transition focus:outline-none"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </motion.div>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Dynamic workspace title with clock */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-extrabold">Aplikasi Pembukuan Tridaya</span>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              {activeTab === "ikhtisar" && "Ikhtisar Dasbor Keuangan"}
              {activeTab === "pemasukan" && "Kelola Catatan Pemasukan"}
              {activeTab === "pengeluaran" && "Kelola Catatan Pengeluaran"}
              {activeTab === "mutasi" && "Rekonsiliasi Mutasi Kas"}
              {activeTab === "settings" && "Konsol Pengaturan & Integrasi"}
              {activeTab === "share" && "Kelola Share Akses Investor"}
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800/80 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span className="font-mono">Live UTC: {new Date().toISOString().split("T")[0]}</span>
          </div>
        </div>

        {/* Dynamic Alerts / Status messages */}
        {syncStatus === "error" && (
          <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-start gap-3.5 text-xs font-semibold">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <div>
              <p className="font-extrabold">Mode Cadangan Luring Aktif</p>
              <p className="text-rose-400/80 font-normal mt-1">Kami tidak dapat terhubung langsung ke Google Sheets (Web App URL tidak merespons). Aplikasi akan menyimpan perubahan Anda secara lokal dan bersiap menyinkronkannya begitu koneksi pulih.</p>
            </div>
          </div>
        )}

        {/* Tab content renders */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            {/* A. DASHBOARD VIEW TAB */}
            {activeTab === "ikhtisar" && (
              <div className="space-y-8">
                {/* Statistics Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Saldo */}
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition duration-200">
                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 text-indigo-500/5 group-hover:scale-110 transition duration-200">
                      <Wallet className="h-32 w-32" />
                    </div>
                    <div className="space-y-1.5 relative z-10">
                      <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block">Total Saldo</span>
                      <h3 className={`text-2xl font-black font-mono tracking-tight ${totalSaldo >= 0 ? "text-slate-100" : "text-rose-500"}`}>{formatIDR(totalSaldo)}</h3>
                      <p className="text-[9px] text-slate-400 font-semibold leading-tight">Kas ({formatIDR(totalKas)}) + Pendapatan Bersih ({formatIDR(totalPemasukan)}) - Pengeluaran ({formatIDR(totalPengeluaran)})</p>
                    </div>
                    <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 relative z-10">
                      <Wallet className="h-5.5 w-5.5" />
                    </div>
                  </div>

                  {/* Total Luasan */}
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition duration-200">
                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 text-indigo-500/5 group-hover:scale-110 transition duration-200">
                      <Layers3 className="h-32 w-32" />
                    </div>
                    <div className="space-y-1.5 relative z-10">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Total Luasan</span>
                      <h3 className="text-2xl font-black font-mono text-indigo-400 tracking-tight">{totalLuasan.toLocaleString("id-ID")} bahu</h3>
                      <p className="text-[11px] text-slate-400 font-semibold">Total pengerjaan lahan aktif</p>
                    </div>
                    <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 relative z-10">
                      <Layers3 className="h-5.5 w-5.5" />
                    </div>
                  </div>

                  {/* Total Pengeluaran */}
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition duration-200">
                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 text-rose-500/5 group-hover:scale-110 transition duration-200">
                      <TrendingDown className="h-32 w-32" />
                    </div>
                    <div className="space-y-1.5 relative z-10">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Total Pengeluaran</span>
                      <h3 className="text-2xl font-black font-mono text-rose-400 tracking-tight">{formatIDR(totalPengeluaran)}</h3>
                      <p className="text-[11px] text-slate-400 font-semibold">{pengeluaranList.length} transaksi pengeluaran</p>
                    </div>
                    <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 relative z-10">
                      <TrendingDown className="h-5.5 w-5.5" />
                    </div>
                  </div>

                  {/* Pendapatan Bersih */}
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-700 transition duration-200">
                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 text-emerald-500/5 group-hover:scale-110 transition duration-200">
                      <TrendingUp className="h-32 w-32" />
                    </div>
                    <div className="space-y-1.5 relative z-10">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Pendapatan Bersih</span>
                      <h3 className="text-2xl font-black font-mono text-emerald-400 tracking-tight">{formatIDR(totalPemasukan)}</h3>
                      <p className="text-[11px] text-slate-400 font-semibold">{pemasukanList.length} transaksi pemasukan</p>
                    </div>
                    <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 relative z-10">
                      <TrendingUp className="h-5.5 w-5.5" />
                    </div>
                  </div>
                </div>

                {/* Analytical Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Trend line */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 lg:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Tren Aliran Kas Harian</h4>
                      <p className="text-[11px] text-slate-500">Visualisasi pemasukan dan pengeluaran harian</p>
                    </div>
                    <div className="h-72 w-full text-xs">
                      {getChartData().length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500">
                          Tidak ada catatan transaksi untuk ditampilkan.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorPms" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorPgl" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="tanggal" stroke="#64748b" tickFormatter={(v) => v.split("-").slice(1).join("/")} />
                            <YAxis stroke="#64748b" />
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                            <Legend />
                            <Area type="monotone" dataKey="pemasukan" name="Pemasukan" stroke="#10b981" fillOpacity={1} fill="url(#colorPms)" strokeWidth={2.5} />
                            <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#f43f5e" fillOpacity={1} fill="url(#colorPgl)" strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Right: Category breakdowns */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Breakdown Pengeluaran</h4>
                      <p className="text-[11px] text-slate-500">Berdasarkan klasifikasi kategori</p>
                    </div>
                    <div className="h-72 w-full flex flex-col justify-between">
                      {currentCategoryBreakdown.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                          Tidak ada klasifikasi pengeluaran.
                        </div>
                      ) : (
                        <>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={currentCategoryBreakdown}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={75}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {currentCategoryBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getPieColor(index)} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatIDR(Number(value))} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          {/* Legend list */}
                          <div className="overflow-y-auto max-h-24 pr-1 space-y-1.5 scrollbar-none">
                            {currentCategoryBreakdown.map((entry, index) => (
                              <div key={entry.name} className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getPieColor(index) }} />
                                  <span className="truncate max-w-[120px]">{entry.name}</span>
                                </div>
                                <span className="font-mono text-slate-200">{formatIDR(entry.value)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Daily Area Chart (Tren Luasan Harian) */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider">Tren Luasan Harian</h4>
                    <p className="text-[11px] text-slate-500">Visualisasi total luasan lahan yang dikerjakan per hari (bahu)</p>
                  </div>
                  <div className="h-64 w-full text-xs">
                    {getChartData().length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-500">
                        Tidak ada catatan pemasukan untuk menampilkan grafik luasan.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="tanggal" stroke="#64748b" tickFormatter={(v) => v.split("-").slice(1).join("/")} />
                          <YAxis stroke="#64748b" />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} formatter={(value) => [`${Number(value).toLocaleString("id-ID")} bahu`, "Total Luasan"]} />
                          <Legend />
                          <Bar dataKey="luasan" name="Total Luasan (Bahu)" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Integration Status Console */}
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-indigo-400" />
                      <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">Aktivitas Sinkronisasi Google Sheets</h4>
                    </div>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold uppercase border border-indigo-500/20 px-2 py-0.5 rounded-md">Realtime</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto space-y-2">
                    {syncLogs.length === 0 ? (
                      <div className="text-slate-600 italic">Konsol log kosong. Mulai lakukan perubahan data untuk melihat riwayat sinkronisasi.</div>
                    ) : (
                      syncLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-2.5">
                          <span className="text-slate-500">[{log.time}]</span>
                          <span className={log.type === "success" ? "text-emerald-400" : log.type === "error" ? "text-rose-400 font-bold" : "text-slate-300"}>
                            {log.text}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* B. PEMASUKAN TAB */}
            {activeTab === "pemasukan" && (
              <div className="space-y-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <button
                    onClick={() => handleOpenAdd("pemasukan")}
                    className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-bold px-4 py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 text-white flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Pemasukan
                  </button>
                </div>

                {/* Table list */}
                <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                          <th className="py-4 px-3">ID</th>
                          <th className="py-4 px-3">Tanggal</th>
                          <th className="py-4 px-3 text-right">Luasan</th>
                          <th className="py-4 px-3 text-right">Pend. Kotor</th>
                          <th className="py-4 px-3 text-right text-rose-400">Gaji Operator</th>
                          <th className="py-4 px-3 text-right text-rose-400">Gaji Helper</th>
                          <th className="py-4 px-3 text-right text-rose-400">Lainnya</th>
                          <th className="py-4 px-3 text-right text-emerald-400 bg-emerald-500/10">Pend. Bersih</th>
                          <th className="py-4 px-3">Keterangan</th>
                          <th className="py-4 px-3">Dibuat Oleh</th>
                          <th className="py-4 px-3 text-center">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                        {pemasukanList.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="py-10 text-center text-slate-500 font-semibold">
                              Tidak ada catatan pemasukan yang ditemukan.
                            </td>
                          </tr>
                        ) : (
                          pemasukanList.map((item) => {
                            const parsed = parsePemasukanItem(item);
                            return (
                              <tr key={parsed.id} className="hover:bg-slate-800/20 transition">
                                <td className="py-3.5 px-3 font-mono font-bold text-indigo-400 whitespace-nowrap">{parsed.id}</td>
                                <td className="py-3.5 px-3 whitespace-nowrap">{parsed.tanggal}</td>
                                <td className="py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap">{parsed.luasan.toLocaleString("id-ID")} bahu</td>
                                <td className="py-3.5 px-3 text-right font-mono text-slate-300 whitespace-nowrap">{formatIDR(parsed.pendapatan_kotor)}</td>
                                <td className="py-3.5 px-3 text-right font-mono text-rose-300 whitespace-nowrap">-{formatIDR(parsed.gaji_operator)}</td>
                                <td className="py-3.5 px-3 text-right font-mono text-rose-300 whitespace-nowrap">-{formatIDR(parsed.gaji_helper)}</td>
                                <td className="py-3.5 px-3 text-right font-mono text-rose-300 whitespace-nowrap">-{formatIDR(parsed.lainnya)}</td>
                                <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-400 bg-emerald-500/5 whitespace-nowrap">{formatIDR(parsed.pendapatan_bersih)}</td>
                                <td className="py-3.5 px-3 font-semibold text-slate-200 max-w-[150px] truncate" title={parsed.keterangan}>{parsed.keterangan || "-"}</td>
                                <td className="py-3.5 px-3 text-slate-400 font-medium whitespace-nowrap">
                                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50 block text-center max-w-[80px]">
                                    {parsed.created_by}
                                  </span>
                                  <span className="text-[9px] text-slate-500 block mt-0.5">
                                    {parsed.created_at ? new Date(parsed.created_at).toLocaleDateString("id-ID") : "-"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenEdit("pemasukan", parsed)}
                                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                                      title="Edit"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete("pemasukan", parsed.id)}
                                      className="p-1.5 hover:bg-rose-950 rounded-lg text-slate-400 hover:text-rose-400 transition"
                                      title="Hapus"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* C. PENGELUARAN TAB */}
            {activeTab === "pengeluaran" && (
              <div className="space-y-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <button
                    onClick={() => handleOpenAdd("pengeluaran")}
                    className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-bold px-4 py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 text-white flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Pengeluaran
                  </button>
                </div>

                {/* Table list */}
                <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                          <th className="py-4 px-5">ID</th>
                          <th className="py-4 px-5">Tanggal</th>
                          <th className="py-4 px-5">Kategori</th>
                          <th className="py-4 px-5">Keterangan</th>
                          <th className="py-4 px-5 text-right">Nominal</th>
                          <th className="py-4 px-5">Dibuat Oleh</th>
                          <th className="py-4 px-5 text-center">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                        {pengeluaranList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-500 font-semibold">
                              Tidak ada catatan pengeluaran yang ditemukan.
                            </td>
                          </tr>
                        ) : (
                          pengeluaranList.map((item) => {
                            const parsed = parsePengeluaranItem(item);
                            return (
                              <tr key={parsed.id} className="hover:bg-slate-800/20 transition">
                                <td className="py-3.5 px-5 font-mono font-bold text-indigo-400">{parsed.id}</td>
                                <td className="py-3.5 px-5 whitespace-nowrap">{parsed.tanggal}</td>
                                <td className="py-3.5 px-5">
                                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full ${getCategoryBadgeClass(parsed.kategori)}`}>
                                    {parsed.kategori}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 font-semibold text-slate-200">{parsed.keterangan || "-"}</td>
                                <td className="py-3.5 px-5 text-right font-mono font-black text-rose-400">{formatIDR(parsed.nominal)}</td>
                                <td className="py-3.5 px-5 text-slate-400 font-medium whitespace-nowrap">
                                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50 block text-center max-w-[80px]">
                                    {parsed.created_by}
                                  </span>
                                  <span className="text-[9px] text-slate-500 block mt-0.5">
                                    {parsed.created_at ? new Date(parsed.created_at).toLocaleDateString("id-ID") : "-"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleOpenEdit("pengeluaran", parsed)}
                                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                                      title="Edit"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete("pengeluaran", parsed.id)}
                                      className="p-1.5 hover:bg-rose-950 rounded-lg text-slate-400 hover:text-rose-400 transition"
                                      title="Hapus"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* D. MUTASI KAS TAB */}
            {activeTab === "mutasi" && (
              <div className="space-y-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <button
                    onClick={() => handleOpenAdd("mutasi")}
                    className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-bold px-4 py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 text-white flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Mutasi Kas
                  </button>
                </div>

                {/* Table list */}
                <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                          <th className="py-4 px-5">ID</th>
                          <th className="py-4 px-5">Tanggal</th>
                          <th className="py-4 px-5">Jenis</th>
                          <th className="py-4 px-5">Keterangan</th>
                          <th className="py-4 px-5 text-right">Nominal</th>
                          <th className="py-4 px-5">Dibuat Oleh</th>
                          <th className="py-4 px-5 text-center">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                        {mutasiList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-500 font-semibold">
                              Tidak ada catatan mutasi kas yang ditemukan.
                            </td>
                          </tr>
                        ) : (
                          mutasiList.map((item) => {
                            const parsed = parseMutasiItem(item);
                            return (
                              <tr key={parsed.id} className="hover:bg-slate-800/20 transition">
                                <td className="py-3.5 px-5 font-mono font-bold text-indigo-400">{parsed.id}</td>
                                <td className="py-3.5 px-5 whitespace-nowrap">{parsed.tanggal}</td>
                                <td className="py-3.5 px-5">
                                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full ${parsed.jenis === "Deposit" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                                    {parsed.jenis}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 font-semibold text-slate-200">{parsed.keterangan || "-"}</td>
                                <td className="py-3.5 px-5 text-right font-mono font-black text-blue-400">{formatIDR(parsed.nominal)}</td>
                                <td className="py-3.5 px-5 text-slate-400 font-medium whitespace-nowrap">
                                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50 block text-center max-w-[80px]">
                                    {parsed.created_by}
                                  </span>
                                  <span className="text-[9px] text-slate-500 block mt-0.5">
                                    {parsed.created_at ? new Date(parsed.created_at).toLocaleDateString("id-ID") : "-"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleOpenEdit("mutasi", parsed)}
                                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                                      title="Edit"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete("mutasi", parsed.id)}
                                      className="p-1.5 hover:bg-rose-950 rounded-lg text-slate-400 hover:text-rose-400 transition"
                                      title="Hapus"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* E. INTEGRATION & CONFIG TAB */}
            {activeTab === "settings" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Google Sheet details */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-300 tracking-wider">Pengaturan Spreadsheet & API</h3>
                    <p className="text-xs text-slate-500 mt-1">Konfigurasi sinkronisasi langsung dengan Google Sheets Web App</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">URL Apps Script / Web App URL</label>
                      <div className="relative">
                        <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          readOnly
                          value="https://script.google.com/macros/s/AKfycbxBtoDOgKJYlO2IMV928Q0nhxVzzYN1eqvHKcfxP-4f3QyqwhaVWgTQy_ZkrclPalT50g/exec"
                          className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] rounded-xl focus:outline-none focus:border-slate-700 font-semibold"
                        />
                      </div>
                      <p className="text-[11px] text-indigo-400/80 flex items-center gap-1.5 font-semibold mt-1">
                        <Shield className="h-3.5 w-3.5" />
                        Aplikasi secara otomatis memproksikan koneksi ini melalui backend (/api/*) untuk mencegah CORS.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Username Otentikasi</span>
                        <p className="text-xs font-mono font-bold text-slate-200">admin</p>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Password Otentikasi</span>
                        <p className="text-xs font-mono font-bold text-slate-200">123 (Proxy payload)</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={loadDataFromSheets}
                        disabled={syncStatus === "syncing"}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-600/20 text-white flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                        Segarkan Semua Kategori
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Architecture card */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-300 tracking-wider">Status Lembar Kerja</h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">Integrasi lembar data</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { sheet: "Pemasukan", desc: "Catatan Pendapatan", status: syncStatus === "success" ? "active" : "offline" },
                      { sheet: "Pengeluaran", desc: "Catatan Pembayaran", status: syncStatus === "success" ? "active" : "offline" },
                      { sheet: "MutasiKas", desc: "Mutasi Kas & Bank", status: syncStatus === "success" ? "active" : "offline" },
                    ].map((sh) => (
                      <div key={sh.sheet} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-slate-200">{sh.sheet}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{sh.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${sh.status === "active" ? "bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse" : "bg-amber-400"}`} />
                          <span className="text-[10px] font-extrabold uppercase text-slate-400">{sh.status === "active" ? "Terkoneksi" : "Luring"}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-400 leading-relaxed font-semibold">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <p>Sistem ini mentransfer setiap aksi penambahan, pengubahan, dan penghapusan secara instan ke server proxy Google Sheet Anda. Jika spreadsheet kosong, data tersimpan aman di database lokal.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* F. SHARE VIEW TAB */}
            {activeTab === "share" && (
              <div className="space-y-6">
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                        <Globe className="h-4.5 w-4.5 text-indigo-400" />
                        Tautan Investor Khusus
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold">
                        Buat link dasbor interaktif real-time yang dapat dibagikan kepada investor luar tanpa perlu kredensial login admin.
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateShareToken}
                      disabled={isGeneratingToken}
                      className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-xs font-bold py-3 px-5 rounded-xl transition shadow-lg shadow-indigo-600/20 text-white flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className={`h-4 w-4 ${isGeneratingToken ? "animate-spin" : ""}`} />
                      Generate Link Baru
                    </button>
                  </div>

                  {generatedToken ? (
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                          Tautan Investor Aktif Saat Ini
                        </span>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/share?token=${generatedToken}`}
                            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs rounded-xl focus:outline-none font-bold"
                          />
                          <button
                            onClick={handleCopyLink}
                            className={`px-5 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                              copiedSuccess
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            }`}
                          >
                            {copiedSuccess ? (
                              <>
                                <Check className="h-4 w-4 text-white" />
                                Tersalin!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                Salin Link
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                        * Catatan: Ketika Anda menekan <span className="text-indigo-400">Generate Link Baru</span>, semua tautan lama di atas akan otomatis dinonaktifkan di Google Sheets, sehingga tidak dapat diakses lagi oleh investor lama.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center space-y-3">
                      <Share2 className="h-8 w-8 text-slate-600 mx-auto" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-300">Belum Ada Tautan Aktif</p>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                          Silakan klik tombol "Generate Link Baru" di atas untuk membuat tautan investor pertama Anda.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tokens History Sheet */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 space-y-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-300 tracking-wider">
                      Riwayat Token Akses (ShareTokens)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      Daftar token keamanan investor yang tercatat di Google Spreadsheet.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/50">
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ID Row</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Token</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Dibuat Pada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium text-xs">
                        {shareTokensHistory.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-500 font-semibold">
                              Tidak ada riwayat token ditemukan.
                            </td>
                          </tr>
                        ) : (
                          shareTokensHistory.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-900/30 transition">
                              <td className="p-4 font-mono text-[10px] text-slate-400">{item.id}</td>
                              <td className="p-4 font-mono text-slate-200 font-bold">{item.token}</td>
                              <td className="p-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                    item.expires_at === "Aktif"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                      : "bg-slate-800 text-slate-400 border border-slate-700/50"
                                  }`}
                                >
                                  {item.expires_at === "Aktif" ? "Aktif" : "Nonaktif"}
                                </span>
                              </td>
                              <td className="p-4 text-slate-400 font-mono text-[10px]">
                                {item.created_at ? new Date(item.created_at).toLocaleString("id-ID") : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 4. MODAL FOR ADD/EDIT DIALOG */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.28 }}
              className="bg-slate-900 border border-slate-800 shadow-2xl w-full max-w-md rounded-2xl overflow-hidden text-slate-100"
            >
              {/* Modal Header */}
              <div className="bg-slate-950 border-b border-slate-800 px-6 py-4.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {editingItem ? "Ubah" : "Tambah"} {modalType === "pemasukan" ? "Pemasukan" : modalType === "pengeluaran" ? "Pengeluaran" : "Mutasi Kas"}
                  </span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {modalError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-500" />
                    <span>{modalError}</span>
                  </div>
                )}
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tanggal Transaksi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="date"
                      required
                      value={formTanggal}
                      onChange={(e) => setFormTanggal(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200 transition font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Category Selection / Mutasi fields */}
                {modalType === "pemasukan" ? (
                  <div className="space-y-3.5 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                    <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider block">Rincian Pendapatan Luasan</span>
                    
                    {/* Luasan & Pendapatan Kotor */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Luasan (Bahu)</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={formLuasan === 0 ? "" : formLuasan}
                          onChange={(e) => setFormLuasan(Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-200 transition font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Pend. Kotor (Rp)</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={formPendapatanKotor === 0 ? "" : formPendapatanKotor}
                          onChange={(e) => setFormPendapatanKotor(Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-200 transition font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Gaji Operator & Helper */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Gaji Operator (Rp)</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={formGajiOperator === 0 ? "" : formGajiOperator}
                          onChange={(e) => setFormGajiOperator(Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-200 transition font-mono font-bold text-rose-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Gaji Helper (Rp)</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={formGajiHelper === 0 ? "" : formGajiHelper}
                          onChange={(e) => setFormGajiHelper(Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-200 transition font-mono font-bold text-rose-300"
                        />
                      </div>
                    </div>

                    {/* Lainnya */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Potongan Lainnya (Rp)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={formLainnya === 0 ? "" : formLainnya}
                        onChange={(e) => setFormLainnya(Number(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-200 transition font-mono font-bold text-rose-300"
                      />
                    </div>

                    {/* Pendapatan Bersih (Dynamic calculation) */}
                    <div className="bg-slate-950/80 p-3 rounded-lg border border-indigo-950 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Pendapatan Bersih (Net)</span>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Kotor - (Operator + Helper + Lainnya)</span>
                      </div>
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        {formatIDR(formPendapatanKotor - (formGajiOperator + formGajiHelper + formLainnya))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Category Selection / Mutasi fields */}
                    {modalType !== "mutasi" ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kategori</label>
                        <select
                          value={formKategori}
                          onChange={(e) => setFormKategori(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200 transition font-bold"
                        >
                          {categoriesList
                            .filter(c => c.tipe === modalType)
                            .map(cat => (
                              <option key={cat.id} value={cat.nama}>{cat.nama}</option>
                            ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Jenis Mutasi</label>
                        <select
                          value={formJenis}
                          onChange={(e) => setFormJenis(e.target.value as "Deposit" | "Penarikan")}
                          className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200 transition font-bold"
                        >
                          <option value="Deposit">Deposit (Setor/Masuk)</option>
                          <option value="Penarikan">Penarikan (Keluar)</option>
                        </select>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Jumlah Nominal (IDR)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={formJumlah === 0 ? "" : formJumlah}
                        onChange={(e) => setFormJumlah(Number(e.target.value))}
                        placeholder="Masukkan nilai nominal..."
                        className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200 transition font-mono font-bold"
                      />
                    </div>
                  </>
                )}

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Keterangan / Deskripsi</label>
                  <textarea
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    placeholder="Tulis deskripsi ringkas transaksi..."
                    className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200 transition h-20 resize-none font-bold"
                  />
                </div>

                {/* Action footer */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700/80 active:scale-95 text-xs font-bold py-3 rounded-xl transition text-slate-300 cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-bold py-3 rounded-xl transition text-white shadow-lg shadow-indigo-600/10 cursor-pointer text-center"
                  >
                    Simpan Catatan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. CUSTOM MODAL FOR DELETE CONFIRMATION */}
      <AnimatePresence>
        {deleteConfirmation?.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.2 }}
              className="bg-slate-900 border border-slate-800 shadow-2xl w-full max-w-sm rounded-2xl overflow-hidden text-slate-100"
            >
              {/* Modal Header */}
              <div className="bg-slate-950 border-b border-slate-800 px-6 py-4.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Konfirmasi Hapus
                  </span>
                </div>
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <p className="text-xs font-medium text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin menghapus catatan transaksi <span className="font-mono font-black text-rose-400">{deleteConfirmation.id}</span> dari sheet <span className="font-extrabold text-indigo-400">{deleteConfirmation.type === "pemasukan" ? "Pemasukan" : deleteConfirmation.type === "pengeluaran" ? "Pengeluaran" : "MutasiKas"}</span>? Tindakan ini tidak dapat dibatalkan.
                </p>

                {/* Action footer */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmation(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700/80 active:scale-95 text-xs font-bold py-2.5 rounded-xl transition text-slate-300 cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 active:scale-95 text-xs font-bold py-2.5 rounded-xl transition text-white shadow-lg shadow-rose-600/10 cursor-pointer text-center"
                  >
                    Hapus Data
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

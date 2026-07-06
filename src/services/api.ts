import { Pemasukan, Transaction, CashTransfer } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "https://script.google.com/macros/s/AKfycbxBtoDOgKJYlO2IMV928Q0nhxVzzYN1eqvHKcfxP-4f3QyqwhaVWgTQy_ZkrclPalT50g/exec";
// const BASE_URL = "https://script.google.com/macros/s/AKfycbxBtoDOgKJYlO2IMV9zYN1eqvHKcfxP-4f3QyqwhaVWgTQy_ZkrclPalT50g/exec";

// Simple helper to perform GET requests
async function getRequest(action: string, extraParams: Record<string, string> = {}) {
  const queryParams = new URLSearchParams({ action, ...extraParams }).toString();
  const url = `${BASE_URL}?${queryParams}`;
  const response = await fetch(url, {
    method: "GET",
    mode: "cors"
  });
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }
  return response.json();
}

// Simple helper to perform POST requests without triggering OPTIONS preflight (avoiding CORS issues)
async function postRequest(action: string, payload: any = {}) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    mode: "cors",
    headers: {
      // Use text/plain to bypass OPTIONS preflight CORS issue
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action,
      ...payload
    })
  });
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }
  return response.json();
}

const formatToSheetDate = (dateVal: any): string => {
  if (!dateVal) return "";
  const dateStr = String(dateVal).trim();
  
  // Parse YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return `${month}/${day}/${year} 07:00:00`;
  }
  
  // Fallback using Date parser formatted in Asia/Jakarta timezone
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "numeric",
        day: "numeric"
      });
      return `${formatter.format(d)} 07:00:00`;
    }
  } catch (e) {}

  return dateStr;
};

const formatPayloadDates = <T extends { tanggal?: string }>(data: T): T => {
  if (!data) return data;
  const formatted = { ...data };
  if (formatted.tanggal) {
    formatted.tanggal = formatToSheetDate(formatted.tanggal);
  }
  return formatted;
};

export const apiService = {
  // GET Requests
  getDashboard: async () => {
    return getRequest("getDashboard");
  },
  
  getPemasukan: async (): Promise<Pemasukan[]> => {
    const res = await getRequest("getPemasukan");
    if (res.status === "success") {
      return res.data || [];
    }
    throw new Error(res.message || "Failed to fetch Pemasukan");
  },
  
  getPengeluaran: async (): Promise<Transaction[]> => {
    const res = await getRequest("getPengeluaran");
    if (res.status === "success") {
      return res.data || [];
    }
    throw new Error(res.message || "Failed to fetch Pengeluaran");
  },
  
  getMutasiKas: async (): Promise<CashTransfer[]> => {
    const res = await getRequest("getMutasiKas");
    if (res.status === "success") {
      return res.data || [];
    }
    throw new Error(res.message || "Failed to fetch MutasiKas");
  },
  
  getShareTokens: async (): Promise<any[]> => {
    const res = await getRequest("getShareTokens");
    if (res.status === "success") {
      return res.data || [];
    }
    throw new Error(res.message || "Failed to fetch ShareTokens");
  },
  
  getInvestorDashboard: async (token: string) => {
    return getRequest("getInvestorDashboard", { token });
  },

  // POST Requests
  login: async (username: string, password: string) => {
    return postRequest("login", { username, password });
  },

  createPemasukan: async (data: Partial<Pemasukan>) => {
    return postRequest("createPemasukan", { data: formatPayloadDates(data) });
  },

  updatePemasukan: async (id: string, data: Partial<Pemasukan>) => {
    return postRequest("updatePemasukan", { id, data: formatPayloadDates(data) });
  },

  deletePemasukan: async (id: string) => {
    return postRequest("deletePemasukan", { id });
  },

  createPengeluaran: async (data: Partial<Transaction>) => {
    return postRequest("createPengeluaran", { data: formatPayloadDates(data) });
  },

  updatePengeluaran: async (id: string, data: Partial<Transaction>) => {
    return postRequest("updatePengeluaran", { id, data: formatPayloadDates(data) });
  },

  deletePengeluaran: async (id: string) => {
    return postRequest("deletePengeluaran", { id });
  },

  createMutasiKas: async (data: Partial<CashTransfer>) => {
    return postRequest("createMutasiKas", { data: formatPayloadDates(data) });
  },

  updateMutasiKas: async (id: string, data: Partial<CashTransfer>) => {
    return postRequest("updateMutasiKas", { id, data: formatPayloadDates(data) });
  },

  deleteMutasiKas: async (id: string) => {
    return postRequest("deleteMutasiKas", { id });
  },

  generateShareToken: async () => {
    return postRequest("generateShareToken");
  },

  validateShareToken: async (token: string) => {
    return postRequest("validateShareToken", { token });
  }
};

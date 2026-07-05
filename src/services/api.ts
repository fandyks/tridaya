import { Pemasukan, Transaction, CashTransfer } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "https://script.google.com/macros/s/AKfycbxBtoDOgKJYlO2IMV928Q0nhxVzzYN1eqvHKcfxP-4f3QyqwhaVWgTQy_ZkrclPalT50g/exec";

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
    return postRequest("createPemasukan", { data });
  },

  updatePemasukan: async (id: string, data: Partial<Pemasukan>) => {
    return postRequest("updatePemasukan", { id, data });
  },

  deletePemasukan: async (id: string) => {
    return postRequest("deletePemasukan", { id });
  },

  createPengeluaran: async (data: Partial<Transaction>) => {
    return postRequest("createPengeluaran", { data });
  },

  updatePengeluaran: async (id: string, data: Partial<Transaction>) => {
    return postRequest("updatePengeluaran", { id, data });
  },

  deletePengeluaran: async (id: string) => {
    return postRequest("deletePengeluaran", { id });
  },

  createMutasiKas: async (data: Partial<CashTransfer>) => {
    return postRequest("createMutasiKas", { data });
  },

  updateMutasiKas: async (id: string, data: Partial<CashTransfer>) => {
    return postRequest("updateMutasiKas", { id, data });
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

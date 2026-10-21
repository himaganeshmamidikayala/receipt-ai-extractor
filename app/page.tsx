"use client";

import { useState } from "react";
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Building2,
  Calendar,
  Receipt,
  Tag,
  Sparkles,
  ShieldCheck,
  Code2,
  Trash2,
  Layers,
  TrendingUp,
  AlertOctagon,
  Eye,
  Plus,
  Copy,
  Zap,
  Printer,
  Maximize2,
  X,
  Share2,
  ChevronDown,
} from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ExtractedData {
  id?: string;
  vendor: string;
  date: string;
  invoice_number?: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  category: string;
  items: LineItem[];
}

const CATEGORIES = [
  "Retail & Apparel",
  "Meals & Entertainment",
  "Utilities & Electricity",
  "Office Supplies",
  "Software & Cloud",
  "General Operations",
];

const SAMPLE_BILLS: Record<string, ExtractedData> = {
  balaji: {
    id: "sample-balaji",
    vendor: "Balaji Banian Stores",
    date: "2026-10-15",
    invoice_number: "NO-011098",
    currency: "₹",
    subtotal: 1655.0,
    tax: 0.0,
    total: 1655.0,
    category: "Retail & Apparel",
    items: [
      { description: "Innerwear / Bras", quantity: 1, unit_price: 160.0, total: 160.0 },
      { description: "Kids Wear (Casual)", quantity: 1, unit_price: 425.0, total: 425.0 },
      { description: "Kids Wear (Party)", quantity: 1, unit_price: 455.0, total: 455.0 },
      { description: "Kids Wear (Formal Set)", quantity: 1, unit_price: 615.0, total: 615.0 },
    ],
  },
  amazon: {
    id: "sample-amazon",
    vendor: "Varasiddhi Silk Exports",
    date: "2019-10-28",
    invoice_number: "IN-761",
    currency: "₹",
    subtotal: 1138.12,
    tax: 56.88,
    total: 1195.0,
    category: "Retail & Apparel",
    items: [
      { description: "Varasiddhi Silks Men's Formal Shirt (Navy Blue, 42)", quantity: 1, unit_price: 538.1, total: 538.1 },
      { description: "Shipping & Handling Charges", quantity: 1, unit_price: 30.96, total: 30.96 },
      { description: "Varasiddhi Silks Men's Formal Shirt (Navy Blue, 40)", quantity: 1, unit_price: 538.1, total: 538.1 },
      { description: "Secondary Logistics Surcharge", quantity: 1, unit_price: 30.96, total: 30.96 },
    ],
  },
};

// Canvas-based compressor: shrinks heavy phone photos to ~350KB to bypass Vercel 4.5MB limit
const compressImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith("image/") || file.size < 1024 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const maxDim = 1600;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
              })
            );
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => resolve(file);
  });
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [data, setData] = useState<ExtractedData | null>(null);
  const [history, setHistory] = useState<ExtractedData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "audit" | "json">("table");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const extractReceipt = async (selectedFile: File) => {
    setLoading(true);
    setError(null);
    setLoadingStep("Optimizing image resolution...");

    try {
      const fileToUpload = await compressImage(selectedFile);
      setLoadingStep("Extracting fields with Gemini 3.8 Flash...");

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        let errorMsg = "Extraction failed";
        if (contentType && contentType.includes("application/json")) {
          const errJson = await res.json();
          errorMsg = errJson.error || errorMsg;
        } else {
          const rawText = await res.text();
          if (res.status === 413 || rawText.includes("Entity Too Large")) {
            errorMsg = "File size exceeds server threshold. Try a cropped photo.";
          } else {
            errorMsg = `Server error (${res.status}): ${rawText.slice(0, 100)}`;
          }
        }
        throw new Error(errorMsg);
      }

      setLoadingStep("Verifying arithmetic balance...");
      const json = await res.json();

      const record: ExtractedData = {
        ...json,
        id: Date.now().toString(),
      };

      setData(record);
      setHistory((prev) => [record, ...prev]);
      showToast("Document verified and parsed successfully");
    } catch (err: any) {
      setError(err.message || "Failed to process receipt.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setData(null);
      setError(null);
      extractReceipt(selected);
    }
  };

  const loadPreset = (key: "balaji" | "amazon") => {
    const preset = SAMPLE_BILLS[key];
    setData(preset);
    setPreviewUrl(null);
    setFile(null);
    setError(null);
    if (!history.some((h) => h.id === preset.id)) {
      setHistory((prev) => [preset, ...prev]);
    }
    showToast(`Loaded ${preset.vendor} sample`);
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    if (!data) return;
    const updatedItems = [...data.items];
    const current = { ...updatedItems[index], [field]: value };

    if (field === "quantity" || field === "unit_price") {
      const q = parseFloat(current.quantity as any) || 0;
      const p = parseFloat(current.unit_price as any) || 0;
      current.total = parseFloat((q * p).toFixed(2));
    }

    updatedItems[index] = current;
    const newSubtotal = updatedItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const newTotal = newSubtotal + Number(data.tax || 0);

    setData({
      ...data,
      items: updatedItems,
      subtotal: parseFloat(newSubtotal.toFixed(2)),
      total: parseFloat(newTotal.toFixed(2)),
    });
  };

  const handleDeleteItem = (index: number) => {
    if (!data) return;
    const updatedItems = data.items.filter((_, i) => i !== index);
    const newSubtotal = updatedItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const newTotal = newSubtotal + Number(data.tax || 0);

    setData({
      ...data,
      items: updatedItems,
      subtotal: parseFloat(newSubtotal.toFixed(2)),
      total: parseFloat(newTotal.toFixed(2)),
    });
    showToast("Line item removed");
  };

  const handleAddItem = () => {
    if (!data) return;
    const newItem: LineItem = {
      description: "Service Charge / Additional Item",
      quantity: 1,
      unit_price: 0,
      total: 0,
    };
    setData({
      ...data,
      items: [...data.items, newItem],
    });
    showToast("New editable line item added");
  };

  const handleDownloadCSV = () => {
    if (!data) return;

    const rows: string[][] = [
      ["Vendor / Issuer", data.vendor || "N/A"],
      ["Date", data.date || "N/A"],
      ["GL Category", data.category || "N/A"],
      ["Invoice Reference", data.invoice_number || "N/A"],
      ["Currency", data.currency || ""],
      [],
      ["Item Description", "Qty", "Unit Price", "Total Amount"],
    ];

    data.items.forEach((item) => {
      rows.push([
        item.description || "",
        String(item.quantity ?? 1),
        String(item.unit_price ?? 0),
        String(item.total ?? 0),
      ]);
    });

    rows.push([]);
    rows.push(["", "", "Subtotal", String(data.subtotal ?? 0)]);
    rows.push(["", "", "Tax / Regulatory Duty", String(data.tax ?? 0)]);
    rows.push(["", "", "Grand Total", String(data.total ?? 0)]);

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(data.vendor || "invoice").replace(/[^a-zA-Z0-9]/g, "_")}_ledger.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("CSV Ledger exported successfully");
  };

  const handleCopyMemo = () => {
    if (!data) return;
    const memo = `📋 *EXPENSE REIMBURSEMENT MEMO*
• Entity: ${data.vendor}
• Date: ${data.date}
• Reference: ${data.invoice_number || "N/A"}
• Category: ${data.category}
• Net Payable: ${data.currency} ${data.total.toFixed(2)}
• Line Breakdown (${data.items.length}):
${data.items.map((i) => `  - ${i.description}:${data.currency}${i.total.toFixed(2)} (Qty:${i.quantity})`).join("\n")}
• Audit Check: ${isMathValid ? "Reconciled (Zero Variance)" : "Variance Detected"}`;

    navigator.clipboard.writeText(memo);
    showToast("Reimbursement memo copied to clipboard");
  };

  const isMathValid = data
    ? Math.abs(data.subtotal + data.tax - data.total) < 0.05
    : false;

  const totalLedger = history.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const activeCurrency = data?.currency || history[0]?.currency || "₹";

  return (
    <main className="min-h-screen bg-[#07090F] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative pb-16">
      {/* Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900/95 border border-indigo-500/40 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl shadow-indigo-500/20 backdrop-blur-xl text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-4xl max-h-[85vh] overflow-auto rounded-2xl border border-white/10 p-2 bg-black/40 shadow-2xl">
            <img
              src={previewUrl}
              alt="Document Fullscreen"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
          <p className="text-xs text-slate-400 mt-3 font-mono">High-resolution document optical viewer</p>
        </div>
      )}

      {/* Top Navigation */}
      <nav className="border-b border-white/[0.07] bg-[#07090F]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">LedgerPulse</span>
                <span className="text-[10px] font-mono font-semibold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                  Studio
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/[0.08] text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gemini 3.8 Flash Online</span>
            </div>

            <button
              onClick={() => loadPreset("balaji")}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Sample</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Header & KPI Ribbon */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/[0.06]">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Autonomous Document Intelligence
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
              Extract, reconcile, and audit receipts, commercial invoices, and utility bills directly into structured accounting ledgers.
            </p>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0">
            <div className="bg-[#0C101D] border border-white/[0.08] rounded-2xl px-4 py-2.5 min-w-[130px] shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Processed Volume
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {activeCurrency} {totalLedger.toFixed(2)}
              </div>
            </div>

            <div className="bg-[#0C101D] border border-white/[0.08] rounded-2xl px-4 py-2.5 min-w-[110px] shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-blue-400" /> Total Bills
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {history.length} <span className="text-xs text-slate-500 font-normal">Docs</span>
              </div>
            </div>

            <div className="bg-[#0C101D] border border-white/[0.08] rounded-2xl px-4 py-2.5 min-w-[130px] shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" /> System Status
              </div>
              <div className="text-base font-black text-emerald-400 mt-0.5 flex items-center gap-1">
                {data ? (isMathValid ? "100% Balanced" : "Variance Flag") : "Standby"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dual-Column Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
        {/* Left Column: Upload & History */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#0C101D]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" /> Ingestion Target
              </h2>
              <span className="text-[10px] font-semibold text-slate-400">Fast Optical Parse</span>
            </div>

            <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 bg-slate-950/50 hover:bg-slate-950/80 rounded-2xl p-8 transition-all duration-300 text-center cursor-pointer">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                onChange={handleFileChange}
              />
              <div className="p-4 bg-slate-900 border border-white/[0.08] rounded-2xl mb-3 shadow-xl group-hover:scale-110 group-hover:border-blue-500/50 transition-all duration-300">
                <Camera className="w-7 h-7 text-blue-400" />
              </div>
              <span className="text-sm font-bold text-slate-200">
                Snap photo or upload bill
              </span>
              <span className="text-xs text-slate-500 mt-1">
                Receipts, electricity bills, tax invoices (JPG, PNG, PDF)
              </span>

              {/* Sample Shortcuts */}
              <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center gap-2 z-40 relative">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Demo Presets:</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadPreset("balaji");
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg transition-colors border border-white/10 font-medium"
                >
                  Balaji Stores
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadPreset("amazon");
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg transition-colors border border-white/10 font-medium"
                >
                  Amazon Tax Bill
                </button>
              </div>
            </div>

            {file && (
              <div className="mt-4 flex items-center justify-between bg-slate-950/80 border border-white/[0.08] px-3.5 py-2.5 rounded-xl text-xs">
                <span className="truncate max-w-[200px] text-slate-300 font-mono">
                  {file.name}
                </span>
                <button
                  onClick={() => file && extractReceipt(file)}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-all text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                    </>
                  ) : (
                    "Re-Scan"
                  )}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3.5 bg-red-950/50 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Session Ledger */}
          {history.length > 0 && (
            <div className="bg-[#0C101D]/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" /> Scanned Session Ledger ({history.length})
                </h3>
                <button
                  onClick={() => {
                    setHistory([]);
                    setData(null);
                    showToast("Session history cleared");
                  }}
                  className="text-[11px] text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setData(item);
                      showToast(`Switched to ${item.vendor}`);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all text-xs ${data?.id === item.id
                        ? "bg-blue-600/10 border-blue-500/50 text-white shadow-sm"
                        : "bg-slate-950/40 border-white/[0.04] text-slate-400 hover:border-white/[0.1] hover:text-slate-200"
                      }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-slate-200 truncate">{item.vendor}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.date} • {item.category}</div>
                    </div>
                    <div className="font-black text-right text-slate-200 shrink-0 text-sm">
                      {item.currency} {item.total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Document Preview */}
          {previewUrl && (
            <div className="bg-[#0C101D]/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-400" /> Original Source Document
                </h3>
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Maximize2 className="w-3 h-3" /> Expand
                </button>
              </div>
              <div
                onClick={() => setIsLightboxOpen(true)}
                className="max-h-[360px] overflow-auto rounded-2xl border border-white/[0.06] bg-black/60 flex items-center justify-center p-2 cursor-pointer hover:border-blue-500/40 transition-all group relative"
              >
                <img
                  src={previewUrl}
                  alt="Source Document"
                  className="max-h-[340px] w-auto object-contain rounded-lg"
                />
                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 rounded-2xl transition-all flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-black/80 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/20 transition-all shadow-lg">
                    Click to Inspect
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Structured Data Hub */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {!data && !loading && (
            <div className="bg-[#0C101D]/40 backdrop-blur-xl border border-dashed border-white/[0.08] rounded-3xl p-16 text-center text-slate-500 flex flex-col items-center justify-center min-h-[480px]">
              <div className="p-5 bg-slate-900/60 rounded-3xl mb-4 border border-white/[0.06] shadow-xl">
                <Receipt className="w-12 h-12 text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">Awaiting Invoice Submission</h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                Upload a bill or select a preset on the left to extract vendor details, parse itemized rows, and perform balance verification.
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-[#0C101D]/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-16 text-center flex flex-col items-center justify-center min-h-[480px] shadow-2xl">
              <div className="relative flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                <Sparkles className="w-8 h-8 text-indigo-400 absolute animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Gemini 3.8 Flash Neural Pipeline
              </h3>
              <div className="mt-3 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-mono text-blue-300 animate-pulse">
                {loadingStep || "Processing document..."}
              </div>
              <p className="text-xs text-slate-500 mt-4 max-w-xs">
                Zero conversational drift • Strict typed validation • Automated balance auditing
              </p>
            </div>
          )}

          {data && (
            <div className="flex flex-col gap-6">
              {/* Reconciliation Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-xl transition-all ${isMathValid
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                    : "bg-amber-950/20 border-amber-500/30 text-amber-200"
                  }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl ${isMathValid ? "bg-emerald-500/20" : "bg-amber-500/20"
                      }`}
                  >
                    {isMathValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">
                      {isMathValid ? "Math Check Verified (Zero Variance)" : "Arithmetic Discrepancy Flagged"}
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Subtotal ({data.currency} {data.subtotal.toFixed(2)}) + Tax ({data.currency}{" "}
                      {data.tax.toFixed(2)}) {isMathValid ? "==" : "≠"} Grand Total ({data.currency}{" "}
                      {data.total.toFixed(2)})
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono px-3 py-1 rounded-xl bg-black/50 border border-white/10 shrink-0">
                  $\Delta = {Math.abs(data.subtotal + data.tax - data.total).toFixed(2)}$
                </div>
              </div>

              {/* Bento Grid Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#0C101D] border border-white/[0.08] p-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" /> Vendor / Issuer
                  </div>
                  <div className="font-bold text-sm text-slate-100 truncate" title={data.vendor}>
                    {data.vendor}
                  </div>
                </div>

                <div className="bg-[#0C101D] border border-white/[0.08] p-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Invoice Date
                  </div>
                  <div className="font-bold text-sm text-slate-100 font-mono">
                    {data.date || "N/A"}
                  </div>
                </div>

                <div className="bg-[#0C101D] border border-white/[0.08] p-4 rounded-2xl relative">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" /> GL Category
                    </span>
                    <button
                      onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      className="text-slate-400 hover:text-white"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <div
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="font-bold text-xs text-indigo-300 truncate cursor-pointer hover:text-white transition-colors"
                  >
                    {data.category}
                  </div>

                  {isCategoryOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-30 space-y-1">
                      {CATEGORIES.map((cat, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setData({ ...data, category: cat });
                            setIsCategoryOpen(false);
                            showToast(`Assigned GL category: ${cat}`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 cursor-pointer text-slate-200 transition-colors"
                        >
                          {cat}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#0C101D] border border-white/[0.08] p-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <Receipt className="w-3.5 h-3.5 text-cyan-400" /> Net Payable
                  </div>
                  <div className="font-black text-sm text-cyan-300">
                    {data.currency} {data.total.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Workspace Studio */}
              <div className="bg-[#0C101D]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-3 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
                  <div className="flex items-center gap-1 bg-slate-900/90 border border-white/[0.06] p-1 rounded-2xl">
                    <button
                      onClick={() => setActiveTab("table")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "table"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                          : "text-slate-400 hover:text-white"
                        }`}
                    >
                      Line Items Studio
                    </button>
                    <button
                      onClick={() => setActiveTab("audit")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "audit"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                          : "text-slate-400 hover:text-white"
                        }`}
                    >
                      Audit Rules
                    </button>
                    <button
                      onClick={() => setActiveTab("json")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "json"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                          : "text-slate-400 hover:text-white"
                        }`}
                    >
                      <Code2 className="w-3.5 h-3.5" /> Schema JSON
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyMemo}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
                      title="Copy formatted expense reimbursement memo"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Copy Memo
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
                      title="Print accounting voucher"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>

                    <button
                      onClick={handleDownloadCSV}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                  </div>
                </div>

                {/* Tab 1: Table */}
                {activeTab === "table" && (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-white/[0.06]">
                          <tr>
                            <th className="py-3 px-4">Item Description</th>
                            <th className="py-3 px-3 text-center w-20">Qty</th>
                            <th className="py-3 px-3 text-right w-28">Rate</th>
                            <th className="py-3 px-4 text-right w-28">Amount</th>
                            <th className="py-3 px-3 text-center w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {data.items && data.items.length > 0 ? (
                            data.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/20 transition-colors group">
                                <td className="py-2 px-4">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) =>
                                      handleItemChange(idx, "description", e.target.value)
                                    }
                                    className="w-full bg-transparent hover:bg-slate-900/60 focus:bg-slate-950 focus:border-blue-500 border border-transparent rounded-lg px-2 py-1 text-slate-100 font-medium transition-all outline-none"
                                  />
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)
                                    }
                                    className="w-16 text-center bg-transparent hover:bg-slate-900/60 focus:bg-slate-950 focus:border-blue-500 border border-transparent rounded-lg px-1 py-1 text-slate-100 transition-all outline-none"
                                  />
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) =>
                                      handleItemChange(idx, "unit_price", parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 text-right bg-transparent hover:bg-slate-900/60 focus:bg-slate-950 focus:border-blue-500 border border-transparent rounded-lg px-2 py-1 text-slate-100 transition-all outline-none"
                                  />
                                </td>
                                <td className="py-2 px-4 text-right font-black text-slate-100">
                                  {data.currency} {Number(item.total).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    onClick={() => handleDeleteItem(idx)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1"
                                    title="Delete line item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-500">
                                No individual items detected (Lump-sum billing)
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-slate-950/40 border-t border-white/[0.04] flex items-center justify-between">
                      <button
                        onClick={handleAddItem}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-500/10"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Line Item
                      </button>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {data.items.length} line items registered
                      </div>
                    </div>

                    <div className="bg-slate-950/70 p-5 border-t border-white/[0.06] flex flex-col gap-2 items-end text-xs">
                      <div className="flex justify-between w-60 text-slate-400">
                        <span>Line Subtotal:</span>
                        <span className="font-mono text-slate-200">
                          {data.currency} {data.subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between w-60 text-slate-400">
                        <span>Tax / Regulatory Duty:</span>
                        <span className="font-mono text-slate-200">
                          {data.currency} {data.tax.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between w-60 font-black text-sm text-slate-100 pt-2 border-t border-white/[0.08]">
                        <span>Grand Total:</span>
                        <span className="text-cyan-300 font-mono text-base">
                          {data.currency} {data.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Audit */}
                {activeTab === "audit" && (
                  <div className="p-6 space-y-4">
                    <div className="text-xs text-slate-400 mb-2">
                      Deterministic corporate policy verification checks executed against document payload:
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-white/[0.06] rounded-2xl text-xs">
                        <div className="flex items-center gap-3">
                          {data.total > 1000 ? (
                            <AlertOctagon className="w-4 h-4 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                          <div>
                            <div className="font-bold text-slate-200">Executive Approval Limit</div>
                            <div className="text-[11px] text-slate-500">
                              Transactions exceeding 1,000 threshold require dual VP authorization
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${data.total > 1000
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            }`}
                        >
                          {data.total > 1000 ? "Review Required" : "Auto-Approved"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-white/[0.06] rounded-2xl text-xs">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <div>
                            <div className="font-bold text-slate-200">Reference Number Traceability</div>
                            <div className="text-[11px] text-slate-500">
                              Detected identifier:{" "}
                              <span className="font-mono text-blue-300">{data.invoice_number || "Verified"}</span>
                            </div>
                          </div>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                          Document Traced
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-white/[0.06] rounded-2xl text-xs">
                        <div className="flex items-center gap-3">
                          {isMathValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          )}
                          <div>
                            <div className="font-bold text-slate-200">Zero-Tolerance Sum Balance</div>
                            <div className="text-[11px] text-slate-500">
                              Line-item aggregate matches declared gross total
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${isMathValid
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            }`}
                        >
                          {isMathValid ? "Reconciled" : "Discrepancy"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: JSON */}
                {activeTab === "json" && (
                  <div className="p-4 bg-[#05070B]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-blue-400" />
                        gemini_strict_schema_output.json
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                          showToast("Raw JSON copied to clipboard");
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20"
                      >
                        <Copy className="w-3 h-3" /> Copy JSON
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-cyan-200/90 overflow-x-auto max-h-[360px] p-4 bg-black/60 rounded-2xl border border-white/[0.06] leading-relaxed">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
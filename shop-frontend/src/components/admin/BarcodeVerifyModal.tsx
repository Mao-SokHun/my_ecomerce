'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scan,
  Camera,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  CreditCard,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { orderApi } from '@/lib/api';
import { Order } from '@/types';
import { formatPrice, formatKhrPrice, getOrderStatusColor, getPaymentStatusColor } from '@/lib/utils';
import { printThermalReceipt } from '@/components/admin/ThermalReceiptPrinter';
import toast from 'react-hot-toast';

interface BarcodeVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'km' | 'en' | 'zh';
  initialCode?: string;
}

export function BarcodeVerifyModal({
  isOpen,
  onClose,
  language = 'km',
  initialCode = '',
}: BarcodeVerifyModalProps) {
  const isKhmer = language === 'km';
  const [scanMode, setScanMode] = useState<'CAMERA' | 'MANUAL'>('MANUAL');
  const [inputCode, setInputCode] = useState(initialCode);
  const [isSearching, setIsSearching] = useState(false);
  const [matchedOrder, setMatchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Play audio chime for scan verification
  const playScanChime = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = success ? 880 : 330;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (success ? 0.25 : 0.4));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.25 : 0.4));
    } catch {
      // Ignore
    }
  };

  // Perform Order Verification Search
  const handleVerify = useCallback(async (codeToVerify?: string) => {
    const raw = (codeToVerify || inputCode || '').trim();
    if (!raw) {
      toast.error(isKhmer ? 'សូមបញ្ចូល ឬស្កេនលេខកូដវិក្កយបត្រ' : 'Please scan or enter a receipt code');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSearchError(null);
    setMatchedOrder(null);

    // Clean up code (extract ORD-... if scanned URL)
    let cleanCode = raw;
    const match = raw.match(/ORD-[A-Z0-9_-]+/i);
    if (match) {
      cleanCode = match[0].toUpperCase();
    }

    try {
      const res = await orderApi.adminGetAll({ search: cleanCode });
      const foundList: Order[] = res.data?.data || [];
      
      const exact = foundList.find(
        (o) => o.orderNumber?.toUpperCase() === cleanCode.toUpperCase() || o.id === cleanCode
      ) || foundList[0];

      if (exact) {
        setMatchedOrder(exact);
        playScanChime(true);
        toast.success(
          isKhmer
            ? `✅ បានផ្ទៀងផ្ទាត់វិក្កយបត្រ: ${exact.orderNumber}`
            : `✅ Verified receipt: ${exact.orderNumber}`
        );
      } else {
        setSearchError(
          isKhmer
            ? `❌ មិនមានវិក្កយបត្រ "${cleanCode}" ក្នុងប្រព័ន្ធឡើយ (Invalid / Unrecognized Receipt)`
            : `❌ Receipt "${cleanCode}" not found in system`
        );
        playScanChime(false);
      }
    } catch {
      setSearchError(
        isKhmer
          ? '❌ បរាជ័យក្នុងការតភ្ជាប់ទៅកាន់ប្រព័ន្ធផ្ទៀងផ្ទាត់'
          : 'Failed to connect to verification server'
      );
      playScanChime(false);
    } finally {
      setIsSearching(false);
    }
  }, [inputCode, isKhmer]);

  // Handle Camera Scanning with ZXing
  useEffect(() => {
    if (!isOpen || scanMode !== 'CAMERA') {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      setCameraActive(false);
      return;
    }

    let isMounted = true;
    const reader = new BrowserMultiFormatReader();
    codeReaderRef.current = reader;
    setCameraError(null);

    reader
      .decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
        if (result && isMounted) {
          const text = result.getText();
          if (text) {
            setInputCode(text);
            setScanMode('MANUAL');
            reader.reset();
            setCameraActive(false);
            void handleVerify(text);
          }
        }
        if (err && !(err.name === 'NotFoundException')) {
          // Continuous scanning error (normal while seeking)
        }
      })
      .then(() => {
        if (isMounted) setCameraActive(true);
      })
      .catch((err) => {
        if (isMounted) {
          setCameraError(
            isKhmer
              ? '⚠️ មិនអាចបើកកាមេរ៉ាបានទេ សូមអនុញ្ញាត Camera Permission ឬប្រើប្រាស់កាំភ្លើងស្កេន Barcode ជំនួសវិញ'
              : 'Unable to access camera. Please allow camera permissions or enter manually.'
          );
          setCameraActive(false);
        }
      });

    return () => {
      isMounted = false;
      reader.reset();
    };
  }, [isOpen, scanMode, handleVerify, isKhmer]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen && scanMode === 'MANUAL') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
    if (isOpen && initialCode) {
      setInputCode(initialCode);
      void handleVerify(initialCode);
    }
  }, [isOpen, scanMode, initialCode, handleVerify]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-surface-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-surface-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: isKhmer ? "'Kantumruy Pro', 'Inter', sans-serif" : undefined }}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-surface-800 flex items-center justify-between bg-gradient-to-r from-primary-500/10 via-indigo-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-primary-500/25 shrink-0">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isKhmer ? 'ផ្ទៀងផ្ទាត់វិក្កយបត្រ & ស្កេន Barcode' : 'Receipt Barcode & QR Verifier'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40">
                  POS Live Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isKhmer ? 'ស្កេន Barcode/QR លើវិក្កយបត្រ ដើម្បីពិនិត្យ និងដោះស្រាយបញ្ហាភ្លាមៗ' : 'Scan thermal receipt barcode or QR to verify authentic order'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-surface-800 hover:bg-slate-200 dark:hover:bg-surface-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs & Input Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-surface-800 bg-slate-50/50 dark:bg-surface-850/50 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScanMode('MANUAL')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                scanMode === 'MANUAL'
                  ? 'bg-white dark:bg-surface-800 text-primary-600 dark:text-primary-400 shadow-xs border border-slate-200/80 dark:border-surface-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-800'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'កាំភ្លើងស្កេន ឬវាយកូដ (Scanner Gun / Manual)' : 'Barcode Gun / Manual'}</span>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('CAMERA')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                scanMode === 'CAMERA'
                  ? 'bg-white dark:bg-surface-800 text-primary-600 dark:text-primary-400 shadow-xs border border-slate-200/80 dark:border-surface-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'កាមេរ៉ាទូរស័ព្ទ/កុំព្យូទ័រ (Live Camera Scan)' : 'Live Camera Scanner'}</span>
            </button>
          </div>

          {/* Scanner Gun Input Form */}
          {scanMode === 'MANUAL' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleVerify();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder={isKhmer ? 'ស្កេន ឬវាយលេខកូដវិក្កយបត្រ (ឧ. ORD-MTZHRA9T-D89D17)...' : 'Scan barcode or type receipt code...'}
                  className="w-full h-11 pl-10 pr-3 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 font-mono text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
                {inputCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputCode('');
                      setMatchedOrder(null);
                      setHasSearched(false);
                      setSearchError(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSearching || !inputCode.trim()}
                className="h-11 px-5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md shadow-primary-500/25 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{isKhmer ? 'ផ្ទៀងផ្ទាត់' : 'Verify'}</span>
              </button>
            </form>
          ) : (
            /* Live Camera Stream View */
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-56 flex items-center justify-center border border-slate-800">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />

              {/* Laser Target Scan Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-primary-500 rounded-2xl relative shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary-400 -mt-1 -ml-1 rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary-400 -mt-1 -mr-1 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary-400 -mb-1 -ml-1 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary-400 -mb-1 -mr-1 rounded-br" />
                  <div className="w-full h-0.5 bg-rose-500 absolute top-1/2 -translate-y-1/2 shadow-[0_0_8px_#f43f5e] animate-pulse" />
                </div>
              </div>

              <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-[11px] font-semibold text-white border border-white/10">
                  {isKhmer ? '📷 សូមតម្រង់កាមេរ៉ាទៅលើ Barcode ឬ QR Code' : 'Align camera with receipt barcode or QR'}
                </span>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-xs text-amber-200 max-w-sm mb-3">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setScanMode('MANUAL')}
                    className="px-4 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold"
                  >
                    {isKhmer ? 'ប្តូរមកវាយលេខកូដវិញ' : 'Switch to Manual Input'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verification Result Area */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* 1. Verified Authentic Order View */}
          {matchedOrder ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Authentic Verified Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                      {isKhmer ? 'វិក្កយបត្រត្រឹមត្រូវស្របច្បាប់ (100% Authentic Order Found)' : '100% Verified Authentic Order'}
                    </h4>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                      {matchedOrder.orderNumber} • {new Date(matchedOrder.createdAt).toLocaleString(isKhmer ? 'km-KH' : 'en-US')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getOrderStatusColor(matchedOrder.status)}`}>
                    {matchedOrder.status}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getPaymentStatusColor(matchedOrder.paymentStatus)}`}>
                    {matchedOrder.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Customer & Address Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-850 border border-slate-200/80 dark:border-surface-800 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">
                    {isKhmer ? '👤 ព័ត៌មានអតិថិជន' : 'Customer Info'}
                  </span>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {matchedOrder.user?.name || (isKhmer ? 'អតិថិជនទូទៅ' : 'Walk-in Customer')}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-primary-500" />
                      <span>{matchedOrder.address?.phone || matchedOrder.user?.phone || 'N/A'}</span>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {matchedOrder.user?.email || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-850 border border-slate-200/80 dark:border-surface-800 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">
                    {isKhmer ? '📍 អាសយដ្ឋានដឹកជញ្ជូន' : 'Shipping Address'}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {[
                      matchedOrder.address?.province,
                      matchedOrder.address?.district,
                      matchedOrder.address?.commune,
                      matchedOrder.address?.village,
                    ].filter(Boolean).join(', ') || 'N/A'}
                    {matchedOrder.address?.roadNumber && ` (${matchedOrder.address.roadNumber})`}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {isKhmer ? '💳 វិធីទូទាត់:' : 'Payment:'} <span className="text-primary-600 font-bold">{matchedOrder.paymentMethod || 'BAKONG'}</span>
                  </p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-surface-800 overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-surface-850 border-b border-slate-200/80 dark:border-surface-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{isKhmer ? '🛍️ បញ្ជីមុខទំនិញក្នុងវិក្កយបត្រ' : 'Ordered Items'} ({matchedOrder.items?.length || 0})</span>
                  <span>{isKhmer ? 'តម្លៃសរុប' : 'Total'}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-surface-800 max-h-44 overflow-y-auto custom-scrollbar">
                  {matchedOrder.items?.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-surface-850/50">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {item.quantity} × ${Number(item.price).toFixed(2)}
                        </p>
                      </div>
                      <span className="font-bold font-mono text-slate-900 dark:text-white shrink-0">
                        ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Order Totals Summary */}
                <div className="p-3 bg-slate-50/80 dark:bg-surface-850/80 border-t border-slate-200/80 dark:border-surface-800 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {isKhmer ? 'តម្លៃទូទាត់សរុប (Grand Total):' : 'Grand Total:'}
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-black text-base text-primary-600 dark:text-primary-400 block">
                      ${Number(matchedOrder.total).toFixed(2)}
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                      {formatKhrPrice(matchedOrder.total)} KHR
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => printThermalReceipt(matchedOrder)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isKhmer ? 'បោះពុម្ពវិក្កយបត្រឡើងវិញ' : 'Re-print Receipt'}</span>
                </button>

                {matchedOrder.address?.phone && (
                  <a
                    href={`tel:${matchedOrder.address.phone}`}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'ខលទៅកាន់អតិថិជន' : 'Call Customer'}</span>
                  </a>
                )}
              </div>
            </div>
          ) : searchError ? (
            /* 2. Fraud / Unrecognized Receipt Warning */
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3 animate-in shake duration-200">
              <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-500/30">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base text-rose-900 dark:text-rose-200">
                {isKhmer ? 'រកមិនឃើញវិក្កយបត្រនេះក្នុងប្រព័ន្ធឡើយ!' : 'Unrecognized or Invalid Receipt!'}
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto leading-relaxed">
                {searchError}
              </p>
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-surface-900/80 border border-rose-200 dark:border-rose-900/40 text-left text-[11px] text-slate-600 dark:text-slate-400 space-y-1 max-w-md mx-auto">
                <p className="font-bold text-rose-800 dark:text-rose-300">{isKhmer ? '💡 គន្លឹះដោះស្រាយបញ្ហា៖' : 'Troubleshooting:'}</p>
                <p>• ពិនិត្យមើលថាតើលេខកូដវិក្កយបត្រត្រូវអក្សរធំ និងសញ្ញា "-" ដែរឬទេ (ឧ. ORD-MTZHRA9T-D89D17)។</p>
                <p>• វិក្កយបត្រអាចជាវិក្កយបត្រចាស់ពីប្រព័ន្ធផ្សេង ឬត្រូវបានលុបចេញពីប្រព័ន្ធ។</p>
              </div>
            </div>
          ) : (
            /* 3. Initial Empty State */
            <div className="py-10 text-center space-y-3 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-surface-800 flex items-center justify-center mx-auto text-slate-400">
                <Scan className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isKhmer ? 'រង់ចាំការស្កេន ឬបញ្ចូលលេខកូដវិក្កយបត្រ...' : 'Ready to verify receipt...'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  {isKhmer
                    ? 'លោកអ្នកអាចយកកាំភ្លើងស្កេន Barcode បាញ់ចំ Barcode លើវិក្កយបត្រ ឬបើកកាមេរ៉ាស្កេនបានភ្លាមៗ'
                    : 'Use a hardware barcode scanner, camera or type receipt code'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

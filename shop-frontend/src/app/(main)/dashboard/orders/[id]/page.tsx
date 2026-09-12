'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight, Download, FileText, Package, Printer, QrCode, CreditCard, XCircle, Landmark, ExternalLink, ShieldCheck, Copy, X, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Invoice, Order } from '@/types';
import { orderApi, paymentApi, settingApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t, paymentTypeForInvoice } from '@/lib/i18n';
import { formatDate, formatPrice, formatKhrPrice, getOrderStatusColor, getPaymentStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import axios from 'axios';
import { CardPaymentModal } from '@/components/payment/CardPaymentModal';
import { StripePaymentModal } from '@/components/payment/StripePaymentModal';
import { shopReceiptMetaFromFooterInfo, type ShopReceiptMeta } from '@/lib/shopContact';
import { useRealtime } from '@/providers/RealtimeProvider';

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isAuthChecked } = useAuthStore();
  const { language } = useLanguageStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [khqrPayment, setKhqrPayment] = useState<{
    orderId: string;
    reference: string;
    qrImageUrl: string;
    qrImageUrlKhr?: string;
    qrString?: string;
    qrStringKhr?: string;
    expiresAt: string;
    amount: number;
    amountKhr?: number;
  } | null>(null);
  const [khqrVariant, setKhqrVariant] = useState<'aba_pay' | 'aba_khr' | 'aba_poster'>('aba_pay');
  const [showCardModal, setShowCardModal] = useState(false);
  const [stripeCardSession, setStripeCardSession] = useState<{ clientSecret: string; amount: number } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'bakong' | 'aba'>('card');
  const [receiptMeta, setReceiptMeta] = useState<ShopReceiptMeta>(() => shopReceiptMetaFromFooterInfo(null));

  const parseOrderIdFromRoute = (raw: string) => {
    if (!raw) return raw;
    const decoded = decodeURIComponent(raw);
    if (!decoded.includes('__')) return decoded;
    const parts = decoded.split('__');
    return parts[parts.length - 1] || decoded;
  };

  const escapeHtml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const buildFallbackInvoiceText = () => {
    if (!order) return '';
    const lines = order.items.map(
      (item, idx) =>
        `${idx + 1}. ${item.name} x${item.quantity} = ${formatPrice(item.price * item.quantity, language)}`
    );
    const discountLine =
      (order.discount ?? 0) > 0
        ? [
            order.couponCode
              ? `${t(language, 'couponDiscount').replace('{code}', order.couponCode)}: -${formatPrice(order.discount, language)}`
              : `${t(language, 'couponDiscountNoCode')}: -${formatPrice(order.discount, language)}`,
          ]
        : [];
    return [
      `${t(language, 'orderLabel')}: ${order.orderNumber}`,
      `${t(language, 'dateLabel')}: ${formatDate(order.createdAt, language)}`,
      `${t(language, 'customerLabel')}: ${order.user?.name || t(language, 'customerLabel')}`,
      `${t(language, 'phoneLabel')}: ${order.address?.phone || order.user?.phone || 'N/A'}`,
      `${t(language, 'addressLabel')}: ${order.address ? [order.address.province, order.address.district, order.address.commune, order.address.village].filter(Boolean).join(', ') : 'Not provided'}`,
      `${t(language, 'noteLabel')}: ${order.notes?.trim() || 'N/A'}`,
      '',
      `${t(language, 'items')}:`,
      ...lines,
      '',
      `${t(language, 'subtotal')}: ${formatPrice(order.subtotal, language)}`,
      ...discountLine,
      `${t(language, 'shipping')}${
        order.shippingCarrier
          ? ` (${order.shippingCarrier === 'JNT' ? 'J&T' : 'VET'})`
          : ''
      }: ${formatPrice(order.shippingCost, language)}`,
      `${t(language, 'total')}: ${formatPrice(order.total, language)}`,
      `${t(language, 'paymentType')}: ${paymentTypeForInvoice(language, order.paymentMethod)}`,
    ].join('\n');
  };

  const handleDownloadReceipt = async () => {
    let activeInvoice = invoice;
    if (!activeInvoice && order?.id) {
      try {
        const { data } = await orderApi.getInvoice(order.id);
        activeInvoice = data.data || null;
        if (activeInvoice) setInvoice(activeInvoice);
      } catch {
        // Fallback to order data below
      }
    }

    const invoiceText = activeInvoice?.textInvoice || buildFallbackInvoiceText();
    if (!invoiceText) {
      toast.error(t(language, 'receiptDataNotReady'));
      return;
    }

    const receiptText = [
      `${t(language, 'brand')} ${t(language, 'receipt')}`,
      t(language, 'brand') + ' Online Store',
      receiptMeta.contactLine,
      '----------------------------------------',
      invoiceText,
    ].join('\n');
    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeInvoice?.invoiceNumber || order?.orderNumber || 'receipt'}-receipt.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handlePrintReceipt = () => {
    if (!invoice) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const itemsHtml = invoice.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td style="text-align:center;">${item.quantity}</td>
            <td style="text-align:right;">${formatPrice(item.lineTotal, language)}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(invoice.invoiceNumber)} Receipt</title>
          <style>
            @page { size: 80mm auto; margin: 8mm; }
            body {
              font-family: "Courier New", monospace;
              color: #111;
              margin: 0;
              display: flex;
              justify-content: center;
            }
            .receipt {
              width: 76mm;
              padding: 8px 10px 14px;
              border: 1px dashed #d1d5db;
            }
            .center { text-align: center; }
            .title {
              font-size: 28px;
              font-weight: 700;
              letter-spacing: 1px;
              margin: 6px 0 10px;
            }
            .shop-name {
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 3px;
            }
            .muted { font-size: 12px; color: #444; line-height: 1.35; }
            .line { border-top: 1px solid #222; margin: 10px 0 6px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: 12px; padding: 2px 0; }
            th { border-bottom: 1px dashed #777; padding-bottom: 6px; }
            .summary { margin-top: 8px; border-top: 1px dashed #777; padding-top: 8px; }
            .row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              margin: 2px 0;
            }
            .total {
              display: flex;
              justify-content: space-between;
              font-weight: 700;
              font-size: 14px;
              margin-top: 6px;
              padding-top: 6px;
              border-top: 1px solid #222;
            }
            .barcode {
              font-family: "Libre Barcode 39", "Courier New", monospace;
              font-size: 40px;
              letter-spacing: 1px;
              line-height: 1;
              margin-top: 12px;
            }
            .invoice-id {
              font-size: 11px;
              letter-spacing: 0.5px;
              margin-top: 2px;
            }
            .thanks {
              margin-top: 8px;
              font-size: 11px;
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="receipt">
            <div class="center title">${t(language, 'receipt')}</div>
            <div class="center shop-name">${t(language, 'brand')} Online Store</div>
            <div class="center muted">${escapeHtml(receiptMeta.contactLine)}</div>
            <div class="center muted">${escapeHtml(receiptMeta.shopAddress)}</div>
            <div class="center muted">${t(language, 'dateLabel')}: ${escapeHtml(formatDate(invoice.createdAt, language))}</div>
            <div class="center muted">${t(language, 'orderLabel')}: ${escapeHtml(invoice.orderNumber)}</div>
            <div class="line"></div>
            <div class="muted">${t(language, 'customerLabel')}: ${escapeHtml(invoice.customerName)}</div>
            <div class="muted">${t(language, 'phoneLabel')}: ${escapeHtml(invoice.customerPhone || 'N/A')}</div>
            <div class="muted">${t(language, 'addressLabel')}: ${escapeHtml(invoice.shippingAddress || 'Not provided')}</div>
            <div class="muted">${t(language, 'noteLabel')}: ${escapeHtml(invoice.note || 'N/A')}</div>
            <div class="muted">${t(language, 'receiptNoLabel')}: ${escapeHtml(invoice.invoiceNumber)}</div>
            <div class="muted">${t(language, 'paymentType')}: ${escapeHtml(paymentTypeForInvoice(language, invoice.paymentMethod))}</div>

            <table>
              <thead>
                <tr>
                  <th style="text-align:left;">${t(language, 'descriptionLabel')}</th>
                  <th style="text-align:center;">${t(language, 'qtyLabel')}</th>
                  <th style="text-align:right;">${t(language, 'priceLabel')}</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div class="summary">
              <div class="row"><span>${t(language, 'subtotal')}</span><span>${formatPrice(invoice.subtotal, language)}</span></div>
              ${(invoice.discount ?? 0) > 0 ? `
              <div class="row" style="color:#dc2626;">
                <span>${invoice.couponCode
                  ? escapeHtml(t(language, 'couponDiscount').replace('{code}', invoice.couponCode))
                  : escapeHtml(t(language, 'couponDiscountNoCode'))}</span>
                <span>-${formatPrice(invoice.discount, language)}</span>
              </div>` : ''}
              <div class="row"><span>${t(language, 'shipping')}${
                invoice.shippingCarrierLabel
                  ? ` (${escapeHtml(invoice.shippingCarrierLabel)})`
                  : ''
              }</span><span>${formatPrice(invoice.shippingCost, language)}</span></div>
              <div class="total"><span>${t(language, 'total')}</span><span>${formatPrice(invoice.total, language)}</span></div>
            </div>

            <div class="center barcode">*${escapeHtml(invoice.orderNumber)}*</div>
            <div class="center invoice-id">#${escapeHtml(invoice.invoiceNumber)}</div>
            <div class="center thanks">${t(language, 'thankYou')}</div>
          </div>
          <script>
            window.onload = function () { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const id = parseOrderIdFromRoute(String(params.id));
    let isMounted = true;

    const loadOrderData = (isSilent = false) => {
      if (!isSilent) setLoading(true);
      Promise.all([orderApi.getById(id), orderApi.getInvoice(id, language)])
        .then(([orderRes, invoiceRes]) => {
          if (!isMounted) return;
          const nextOrder = orderRes.data.data || null;
          setOrder((prev) => {
            // If payment status changed from UNPAID to PAID in real-time
            if (prev && prev.paymentStatus !== 'PAID' && nextOrder?.paymentStatus === 'PAID') {
              toast.success(
                language === 'km'
                  ? '🎉 ការទូទាត់ប្រាក់ទទួលបានជោគជ័យ!'
                  : '🎉 Payment successfully confirmed!'
              );
            }
            return nextOrder;
          });
          const method = String(nextOrder?.paymentMethod || '').toLowerCase();
          setSelectedPaymentMethod(method === 'bakong' ? 'bakong' : method === 'aba' ? 'aba' : 'card');
          setInvoice(invoiceRes.data.data || null);
        })
        .catch(() => {
          if (!isSilent && isMounted) {
            toast.error(t(language, 'failedLoadProduct'));
            router.push('/dashboard/orders');
          }
        })
        .finally(() => {
          if (isMounted && !isSilent) setLoading(false);
        });
    };

    loadOrderData(false);

    // Live real-time background fallback sync
    const interval = setInterval(() => {
      loadOrderData(true);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthChecked, isAuthenticated, params.id, router, language]);

  const { socket, joinOrder, leaveOrder } = useRealtime();

  // Instant Real-time WebSocket listener for this order
  useEffect(() => {
    const id = parseOrderIdFromRoute(String(params.id));
    if (!id) return;

    joinOrder(id);

    if (socket) {
      const handleOrderUpdated = (updatedOrder: Order) => {
        if (!updatedOrder || updatedOrder.id !== id) return;
        setOrder((prev) => {
          if (prev && prev.paymentStatus !== 'PAID' && updatedOrder.paymentStatus === 'PAID') {
            toast.success(
              language === 'km'
                ? '🎉 ការទូទាត់ប្រាក់ទទួលបានជោគជ័យ!'
                : '🎉 Payment successfully confirmed!'
            );
          } else if (prev && prev.status !== updatedOrder.status) {
            toast.success(
              language === 'km'
                ? `📦 ស្ថានភាព Order ត្រូវបានកែប្រែទៅជា: ${updatedOrder.status}`
                : `📦 Order status updated to: ${updatedOrder.status}`
            );
          }
          return { ...prev, ...updatedOrder };
        });
      };

      socket.on('ORDER_UPDATED', handleOrderUpdated);

      return () => {
        leaveOrder(id);
        socket.off('ORDER_UPDATED', handleOrderUpdated);
      };
    }

    return () => {
      leaveOrder(id);
    };
  }, [socket, params.id, joinOrder, leaveOrder, language]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated || !isAuthChecked) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('stripe_return') !== '1') return;
    const pi = q.get('payment_intent');
    if (q.get('redirect_status') !== 'succeeded' || !pi) return;
    const id = parseOrderIdFromRoute(String(params.id));
    let cancelled = false;
    (async () => {
      try {
        await orderApi.confirmPayment({ orderId: id, paymentIntentId: pi });
        if (cancelled) return;
        toast.success(language === 'zh' ? '支付已确认' : language === 'km' ? 'ការទូទាត់បានបញ្ជាក់' : 'Payment confirmed');
        router.replace(window.location.pathname);
        const { data: orderData } = await orderApi.getById(id);
        setOrder(orderData.data);
        const { data: invData } = await orderApi.getInvoice(id, language);
        setInvoice(invData.data);
      } catch {
        if (!cancelled) {
          toast.error(language === 'zh' ? '确认支付失败' : language === 'km' ? 'បញ្ជាក់បរាជ័យ' : 'Could not confirm payment');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthChecked, params.id, router, language]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated || !isAuthChecked) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('aba') !== 'success') return;
    const id = parseOrderIdFromRoute(String(params.id));
    let cancelled = false;
    (async () => {
      try {
        const { data } = await paymentApi.getAbaStatus(id);
        if (cancelled) return;
        if (data.data?.status === 'PAID') {
          toast.success(
            language === 'zh' ? 'ABA 支付已确认' : language === 'km' ? 'ការទូទាត់ ABA បានបញ្ជាក់' : 'ABA payment confirmed'
          );
        } else {
          toast(
            language === 'zh'
              ? '支付处理中，请稍候刷新页面'
              : language === 'km'
                ? 'ការទូទាត់កំពុងដំណើរការ សូមរង់ចាំ'
                : 'Payment processing — refresh in a moment if status does not update',
            { icon: 'ℹ️' }
          );
        }
        router.replace(window.location.pathname);
        const { data: orderData } = await orderApi.getById(id);
        setOrder(orderData.data);
        const { data: invData } = await orderApi.getInvoice(id, language);
        setInvoice(invData.data);
      } catch {
        if (!cancelled) {
          toast.error(
            language === 'zh' ? '无法确认 ABA 支付' : language === 'km' ? 'មិនអាចបញ្ជាក់ការទូទាត់ ABA' : 'Could not confirm ABA payment'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthChecked, params.id, router, language]);

  useEffect(() => {
    settingApi
      .get()
      .then(({ data }) => {
        if (data?.success && data.data?.footerInfo != null) {
          setReceiptMeta(shopReceiptMetaFromFooterInfo(data.data.footerInfo));
        }
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  useEffect(() => {
    if (!khqrPayment) return;
    const poll = setInterval(async () => {
      try {
        const { data } = await paymentApi.getKhqrStatus(khqrPayment.orderId);
        if (data.data.paymentStatus === 'PAID') {
          clearInterval(poll);
          setKhqrPayment(null);
          toast.success('Payment confirmed!');
          // Refresh order data
          const { data: orderData } = await orderApi.getById(khqrPayment.orderId);
          setOrder(orderData.data);
          const { data: invData } = await orderApi.getInvoice(khqrPayment.orderId, language);
          setInvoice(invData.data);
        }
      } catch {
        // keep polling
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [khqrPayment, language]);

  const handlePayNow = async () => {
    if (!order) return;
    setIsPaying(true);
    try {
      const { data } = await paymentApi.createKhqr(order.id);
      const khqrData = data.data;
      setKhqrPayment({
        orderId: order.id,
        reference: khqrData.reference,
        qrImageUrl: khqrData.qrImageUrl,
        qrImageUrlKhr: khqrData.qrImageUrlKhr,
        qrString: khqrData.qrString,
        qrStringKhr: khqrData.qrStringKhr,
        expiresAt: khqrData.expiresAt,
        amount: khqrData.amount,
        amountKhr: khqrData.amountKhr || Math.round(khqrData.amount * 4100),
      });
    } catch {
      toast.error(language === 'km' ? 'មិនអាចបង្កើត KHQR បានទេ' : 'Failed to initiate KHQR payment');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    const ok = window.confirm(
      language === 'km'
        ? 'តើអ្នកចង់បោះបង់ការបញ្ជាទិញនេះមែនទេ?'
        : language === 'zh'
          ? '确定要取消此订单吗？'
          : 'Are you sure you want to cancel this order?'
    );
    if (!ok) return;
    try {
      await orderApi.cancel(order.id);
      const { data: orderData } = await orderApi.getById(order.id);
      setOrder(orderData.data);
      toast.success(language === 'km' ? 'បានបោះបង់កម្មង់' : language === 'zh' ? '订单已取消' : 'Order cancelled');
    } catch {
      toast.error(language === 'km' ? 'បោះបង់មិនបាន' : language === 'zh' ? '取消失败' : 'Cancel failed');
    }
  };

  const handleCardPaymentSuccess = async (paymentIntentId: string = 'mock_card_payment') => {
    if (!order) return;
    try {
      await orderApi.confirmPayment({ orderId: order.id, paymentIntentId });
      toast.success('Payment confirmed!');
      setShowCardModal(false);
      setStripeCardSession(null);
      const { data: orderData } = await orderApi.getById(order.id);
      setOrder(orderData.data);
      const { data: invData } = await orderApi.getInvoice(order.id, language);
      setInvoice(invData.data);
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? String((error.response?.data as { message?: string } | undefined)?.message || '')
        : '';
      toast.error(msg || 'Failed to confirm payment.');
    }
  };

  if (!isAuthChecked) return null;

  if (loading) {
    return (
      <div className="page-container py-6 sm:py-8">
        <div className="card p-6 animate-pulse h-64" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
        <Link href="/" className="hover:text-primary-600">{t(language, 'breadcrumbHome')}</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <Link href="/dashboard" className="hover:text-primary-600">{t(language, 'breadcrumbAccount')}</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <Link href="/dashboard/orders" className="hover:text-primary-600">{t(language, 'breadcrumbOrders')}</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <span className="text-gray-900 dark:text-white font-medium break-all">{order.orderNumber}</span>
      </div>

      <div className="card overflow-hidden p-0 shadow-sm border-gray-100 dark:border-gray-800">
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white font-mono tracking-tight break-all">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t(language, 'placedOn').replace('{date}', formatDate(order.createdAt, language))}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className={`badge ${getOrderStatusColor(order.status)}`}>
                {t(language, `orderStatus_${order.status}`)}
              </span>
              <span className={`badge ${getPaymentStatusColor(order.paymentStatus)}`}>
                {t(language, order.paymentStatus === 'PAID' ? 'paymentStatus_PAID' : 'paymentStatus_PENDING')}
              </span>
          </div>
          </div>

        {order.paymentStatus === 'PENDING' && (
          <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-950/20 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    Bakong KHQR
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {language === 'km'
                      ? 'ស្កេនទូទាត់ជាមួយ ABA Mobile, Bakong ឬ Banking App ទាំងអស់'
                      : language === 'zh'
                      ? '使用 ABA Mobile、Bakong 或任何银行 App 扫码支付'
                      : 'Scan to pay with ABA Mobile, Bakong or any Banking App'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePayNow}
                  disabled={isPaying}
                  className="btn-primary py-2.5 px-4 text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  {isPaying ? '...' : language === 'km' ? 'បង់ប្រាក់តាម KHQR ឥឡូវនេះ' : language === 'zh' ? '立即通过 KHQR 支付' : 'Pay via KHQR Now'}
                </button>
                {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    className="btn-secondary py-2.5 px-3 text-xs inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    {language === 'km' ? 'បោះបង់កម្មង់' : language === 'zh' ? '取消订单' : 'Cancel order'}
                  </button>
                )}
              </div>
            </div>

            {/* Policy Notice: Dispatch After Payment */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">
                  {language === 'km'
                    ? 'ចំណាំ៖ សូមធ្វើការទូទាត់ប្រាក់ដើម្បីឱ្យហាងយើងខ្ញុំអាចរៀបចំផ្ញើទំនិញជូនលោកអ្នក!'
                    : language === 'zh'
                    ? '提示：请尽快完成付款，以便我们为您安排打包并发货！'
                    : 'Notice: Please complete your payment so we can pack and dispatch your order!'}
                </span>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                  {language === 'km'
                    ? 'ទំនិញរបស់អ្នកត្រូវបានរក្សាទុក ហើយនឹងត្រូវរៀបចំវេចខ្ចប់ផ្ញើចេញភ្លាមៗ ក្រោយពេលប្រព័ន្ធទទួលបានការទូទាត់ប្រាក់រួចរាល់។'
                    : language === 'zh'
                    ? '您的商品已保留，收到付款后将立即为您安排发货。'
                    : 'Your items are reserved and will be dispatched immediately once payment is confirmed.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {order.paymentStatus === 'PAID' && (
          <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-950/20 p-3 sm:p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-100">
                {language === 'km'
                  ? 'ការទូទាត់ប្រាក់ជោគជ័យ — ហាងកំពុងរៀបចំផ្ញើទំនិញជូន!'
                  : language === 'zh'
                  ? '付款已成功 — 正在为您打包并发货！'
                  : 'Payment Successful — Packing and dispatching your items!'}
              </p>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5">
                {language === 'km'
                  ? 'ទំនិញរបស់អ្នកនឹងត្រូវប្រគល់ជូនសេវាដឹកជញ្ជូនក្នុងពេលឆាប់ៗនេះ។'
                  : language === 'zh'
                  ? '您的商品将很快移交给快递派送。'
                  : 'Your package will be handed over to the courier shortly.'}
              </p>
            </div>
          </div>
        )}

        {/* Order status — compact width so steps are not stretched edge-to-edge */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="relative mx-auto max-w-md px-1">
            <div className="absolute top-[13px] left-3 right-3 sm:left-4 sm:right-4 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-500 rounded-full"
                style={{
                  width:
                    order.status === 'PENDING'
                      ? '0%'
                      : order.status === 'CONFIRMED'
                        ? '33%'
                        : order.status === 'PROCESSING' || order.status === 'SHIPPED'
                          ? '66%'
                          : order.status === 'DELIVERED'
                            ? '100%'
                            : '0%',
                }}
              />
            </div>
            <div className="relative flex justify-between gap-1">
              {(
                [
                  { key: 'PENDING' as const },
                  { key: 'CONFIRMED' as const },
                  { key: 'SHIPPED' as const },
                  { key: 'DELIVERED' as const },
                ] as const
              ).map((step, stepIndex, arr) => {
                const isCompleted =
                  arr.findIndex((s) => s.key === order.status) >= stepIndex || order.status === 'DELIVERED';
                const isCurrent =
                  order.status === step.key || (order.status === 'PROCESSING' && step.key === 'CONFIRMED');
                const isCancelled = order.status === 'CANCELLED';
                return (
                  <div key={step.key} className="flex flex-col items-center max-w-[22%] sm:max-w-none flex-1">
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 transition-colors z-10 bg-white dark:bg-surface-900 ${
                        isCancelled
                          ? 'border-red-500 text-red-500'
                          : isCompleted
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-gray-200 dark:border-gray-600 text-gray-400'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-current opacity-90" />
                    </div>
                    <p
                      className={`mt-1.5 text-center text-[10px] sm:text-xs font-medium leading-tight ${
                        isCancelled
                          ? 'text-red-500'
                          : isCurrent
                            ? 'text-primary-600 dark:text-primary-400'
                            : isCompleted
                              ? 'text-gray-800 dark:text-gray-200'
                              : 'text-gray-400'
                      }`}
                    >
                      {t(language, `orderStatus_${step.key}`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {order.paymentStatus === 'PENDING' && (
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/25 p-3 sm:p-3.5 flex gap-3 items-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/90 dark:bg-surface-800 shadow-sm ring-1 ring-amber-200/60 dark:ring-amber-800/50">
              <CreditCard className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            </div>
            <p className="text-sm text-amber-950/90 dark:text-amber-100/90 leading-snug min-w-0">
              {t(language, 'unpaidWarning')}
            </p>
          </div>
        )}
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t(language, 'purchasedProducts')}</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {t(language, 'qtyLabel')}: {item.quantity} • {formatPrice(item.price, language)} {t(language, 'each')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(item.price * item.quantity, language)}</p>
                <Link href="/products" className="text-xs text-primary-600 hover:underline">{t(language, 'browseMore').split(' ')[0]}</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5" /> {t(language, 'printReceipt')}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadReceipt}
              className="btn-primary text-sm px-3 py-2"
            >
              <Download className="w-4 h-4" /> {t(language, 'download')}
            </button>
            <button onClick={handlePrintReceipt} className="btn-secondary text-sm px-3 py-2">
              <Printer className="w-4 h-4" /> {t(language, 'print')}
            </button>
          </div>
        </div>

        {invoice ? (
          <div className="text-sm">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 space-y-1">
              <p className="font-semibold text-gray-900 dark:text-white">{t(language, 'brand')} Online Store</p>
              <p className="text-xs text-gray-500 border-none">{receiptMeta.contactLine}</p>
              <p className="text-xs text-gray-500">#{t(language, 'receiptNoLabel')}: {invoice.invoiceNumber}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
              <p><span className="text-gray-500 font-medium">{t(language, 'customerLabel')}:</span> {invoice.customerName}</p>
              <p><span className="text-gray-500 font-medium">{t(language, 'dateLabel')}:</span> {formatDate(invoice.createdAt, language)}</p>
              <p><span className="text-gray-500 font-medium">{t(language, 'orderLabel')}:</span> {invoice.orderNumber}</p>
              <p><span className="text-gray-500 font-medium">{t(language, 'items')}:</span> {invoice.items.length}</p>
              <p><span className="text-gray-500 font-medium">{t(language, 'phoneLabel')}:</span> {invoice.customerPhone || 'N/A'}</p>
              <p><span className="text-gray-500 font-medium">{t(language, 'noteLabel')}:</span> {invoice.note || 'N/A'}</p>
            </div>
            <p className="mt-2"><span className="text-gray-500 font-medium">{t(language, 'addressLabel')}:</span> {invoice.shippingAddress}</p>
            <p className="mt-2">
              <span className="text-gray-500 font-medium">{t(language, 'paymentType')}:</span>{' '}
              {paymentTypeForInvoice(language, invoice.paymentMethod)}
            </p>

            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <p className="flex justify-between"><span>{t(language, 'subtotal')}</span><span>{formatPrice(invoice.subtotal, language)}</span></p>
              {(invoice.discount ?? 0) > 0 && (
                <p className="flex justify-between text-red-600 dark:text-red-400">
                  <span className="flex items-center gap-1">
                    {invoice.couponCode
                      ? t(language, 'couponDiscount').replace('{code}', invoice.couponCode)
                      : t(language, 'couponDiscountNoCode')}
                  </span>
                  <span>-{formatPrice(invoice.discount, language)}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span>
                  {t(language, 'shipping')}
                  {invoice.shippingCarrierLabel ? (
                    <span className="text-gray-400 font-normal text-xs ml-1">({invoice.shippingCarrierLabel})</span>
                  ) : null}
                </span>
                <span>{formatPrice(invoice.shippingCost, language)}</span>
              </p>
              <p className="flex justify-between font-bold text-base pt-1 text-primary-600"><span>{t(language, 'totalPaid')}</span><span>{formatPrice(invoice.total, language)}</span></p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t(language, 'invoiceNotAvailable')}</p>
        )}
      </div>
      </div>

      {khqrPayment && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[420px] bg-white dark:bg-surface-900 rounded-[28px] p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-gray-100 dark:border-surface-750 text-center relative max-h-[92vh] overflow-y-auto"
          >
            {/* Top Bar with Branding & Close */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-surface-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                  ABA
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    {language === 'km' ? 'ទូទាត់ប្រាក់តាម Bakong KHQR' : 'Bakong KHQR Payment'}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    {language === 'km' ? 'ស្កែនបានគ្រប់ធនាគារទាំងអស់' : 'Scan with all KH banks'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKhqrPayment(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-surface-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Amount Display Hero */}
            <div className="py-4 text-center">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {language === 'km' ? 'ចំនួនទឹកប្រាក់សរុប' : 'Total Amount'}
              </p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-3xl font-black text-gray-950 dark:text-white tracking-tight">
                  {formatPrice(khqrPayment.amount, language)}
                </span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200/60 dark:border-amber-900/60">
                  ≈ {formatKhrPrice(khqrPayment.amount)}
                </span>
              </div>
            </div>

            {/* Segmented Currency Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-surface-800/90 rounded-2xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setKhqrVariant('aba_pay')}
                className={`py-2 rounded-xl transition-all ${
                  khqrVariant === 'aba_pay'
                    ? 'bg-white dark:bg-surface-700 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setKhqrVariant('aba_khr')}
                className={`py-2 rounded-xl transition-all ${
                  khqrVariant === 'aba_khr'
                    ? 'bg-white dark:bg-surface-700 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                KHR (៛)
              </button>
              <button
                type="button"
                onClick={() => setKhqrVariant('aba_poster')}
                className={`py-2 rounded-xl transition-all ${
                  khqrVariant === 'aba_poster'
                    ? 'bg-white dark:bg-surface-700 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                Poster
              </button>
            </div>

            {/* Official KHQR Code Card Container */}
            <div className="bg-slate-50 dark:bg-surface-800/50 p-3 rounded-2xl border border-gray-100 dark:border-surface-750 flex flex-col items-center mb-4">
              {khqrVariant === 'aba_poster' ? (
                <div className="w-full flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/payments/aba_payway_mao_sokhun.png"
                    alt="ABA Bank KHQR Poster MAO SOKHUN"
                    className="w-full max-h-[300px] object-contain rounded-xl shadow-sm"
                  />
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  {/* Authentic ABA KHQR Header */}
                  <div className="w-full max-w-[260px] bg-[#E1251B] text-white py-2 px-3.5 rounded-t-2xl flex items-center justify-between font-bold text-xs shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm tracking-tight">ABA</span>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">KHQR</span>
                    </div>
                    <span className="text-xs font-mono font-black">
                      {khqrVariant === 'aba_pay'
                        ? `$${Number(khqrPayment.amount).toFixed(2)}`
                        : `៛${(khqrPayment.amountKhr || Math.round(khqrPayment.amount * 4100)).toLocaleString()}`}
                    </span>
                  </div>

                  {/* QR Code Canvas */}
                  <div className="w-full max-w-[260px] bg-white p-3.5 border-x-2 border-b-2 border-[#E1251B] rounded-b-2xl shadow-md flex flex-col items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        khqrVariant === 'aba_pay'
                          ? (khqrPayment.qrImageUrl && !khqrPayment.qrImageUrl.startsWith('data:') ? khqrPayment.qrImageUrl : '/payments/aba_pay_khqr.png')
                          : (khqrPayment.qrImageUrlKhr && !khqrPayment.qrImageUrlKhr.startsWith('data:') ? khqrPayment.qrImageUrlKhr : '/payments/aba_qr_khr.png')
                      }
                      alt={`ABA Bank Dynamic KHQR ${khqrVariant === 'aba_pay' ? 'USD' : 'KHR'}`}
                      className="w-[200px] h-[200px] object-contain"
                    />
                    <div className="mt-2 flex items-center justify-between w-full pt-1.5 border-t border-gray-100 text-[11px] text-gray-700 font-bold">
                      <span>{khqrVariant === 'aba_pay' ? 'MAO SOKHUN ($)' : 'MAO SOKHUN (៛)'}</span>
                      <span className="font-mono text-red-600">{khqrVariant === 'aba_pay' ? '005 282 269' : '005 282 293'}</span>
                    </div>
                  </div>

                  <p className="mt-2.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {language === 'km'
                      ? 'ស្កេនជាមួយ ABA, Bakong ឬ Banking App ទាំងអស់'
                      : 'Scan with ABA Mobile, Bakong or any Mobile Banking App'}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Open in ABA App Link */}
            <a
              href="https://link.payway.com.kh/ABAPAYQf518577C"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm mb-3"
            >
              <Landmark className="w-4 h-4 text-red-500" />
              <span>{language === 'km' ? 'បើកទូទាត់ក្នុង ABA Mobile App' : 'Open in ABA Mobile App'}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            {/* Account Details with Copy Button */}
            <div className="bg-gray-50 dark:bg-surface-800/60 rounded-2xl p-3 text-xs space-y-2 text-left mb-4 border border-gray-100 dark:border-surface-750">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">ឈ្មោះគណនី:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {khqrVariant === 'aba_pay' ? 'MAO SOKHUN ($)' : 'MAO SOKHUN (៛)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">លេខគណនី:</span>
                <button
                  type="button"
                  onClick={() => {
                    const acc = khqrVariant === 'aba_pay' ? '005 282 269' : '005 282 293';
                    navigator.clipboard.writeText(acc.replace(/\s/g, ''));
                    toast.success('បានចម្លងលេខគណនី ' + acc);
                  }}
                  className="flex items-center gap-1.5 font-mono font-bold text-red-600 dark:text-red-400 hover:underline"
                  title="Click to copy"
                >
                  <span>{khqrVariant === 'aba_pay' ? '005 282 269' : '005 282 293'}</span>
                  <Copy className="w-3 h-3 opacity-70" />
                </button>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200/80 dark:border-surface-700 text-[11px]">
                <span className="text-gray-400">លេខសម្គាល់ (Ref):</span>
                <span className="font-mono text-gray-700 dark:text-gray-300 font-semibold">{khqrPayment.reference}</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setKhqrPayment(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-surface-750 dark:hover:bg-surface-700 text-gray-800 dark:text-white rounded-2xl text-xs font-bold transition"
            >
              {language === 'km' ? 'រួចរាល់ / បិទ' : 'Done / Close'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

"use client";

import { InvoiceDocument } from "@/components/InvoiceDocument";
import { ResponsiveFormFrame } from "@/components/ResponsiveFormFrame";
import {
  TEMPLATE,
  createItem,
  formatIntegerInput,
  invoiceFileSlug,
  invoiceTotal,
  parseFormattedInteger,
  resizeItems,
  todayInputValue,
  type Invoice,
  type InvoiceTheme,
} from "@/lib/invoice";
import { toJpeg } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";

function downloadBlob(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function InvoiceWorkspace() {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"jpeg" | "pdf" | null>(null);
  const [previewScale, setPreviewScale] = useState(560 / TEMPLATE.width);
  const [invoice, setInvoice] = useState<Invoice>(() => ({
    theme: "light",
    client: "",
    dateIssued: todayInputValue(),
    delivery: "",
    orderTitle: "",
    items: [createItem()],
  }));
  const [itemCountText, setItemCountText] = useState("1");
  const itemCountFocused = useRef(false);
  const [mobilePanel, setMobilePanel] = useState<"details" | "invoice">(
    "details",
  );

  const total = useMemo(() => invoiceTotal(invoice.items), [invoice.items]);

  useEffect(() => {
    if (!itemCountFocused.current) {
      setItemCountText(String(invoice.items.length));
    }
  }, [invoice.items.length]);

  function commitItemCount(raw: string) {
    const n = Math.max(1, Math.min(12, Math.floor(Number(raw)) || 1));
    setItemCountText(String(n));
    setInvoice((current) => ({
      ...current,
      items: resizeItems(current.items, n),
    }));
  }

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const syncScale = () => {
      setPreviewScale(frame.clientWidth / TEMPLATE.width);
    };
    syncScale();
    const observer = new ResizeObserver(syncScale);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  function patch(next: Partial<Invoice>) {
    setInvoice((current) => ({ ...current, ...next }));
  }

  function updateItem(
    id: string,
    field: "description" | "qty" | "rate",
    value: string,
  ) {
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== id) return item;
        if (field === "description") return { ...item, description: value };
        if (field === "rate") {
          return { ...item, rate: parseFormattedInteger(value) };
        }
        const numeric = value === "" ? 0 : Number(value);
        return { ...item, [field]: Number.isFinite(numeric) ? numeric : 0 };
      }),
    }));
  }

  async function captureJpeg() {
    const node = invoiceRef.current;
    if (!node) throw new Error("Invoice preview is not ready.");
    await document.fonts.ready;
    return toJpeg(node, {
      quality: 0.95,
      pixelRatio: 1,
      width: TEMPLATE.width,
      height: TEMPLATE.height,
      canvasWidth: TEMPLATE.width,
      canvasHeight: TEMPLATE.height,
      cacheBust: true,
    });
  }

  async function handleDownload(kind: "jpeg" | "pdf") {
    setBusy(kind);
    try {
      const dataUrl = await captureJpeg();
      const slug = invoiceFileSlug(invoice);
      if (kind === "jpeg") {
        downloadBlob(dataUrl, `${slug}.jpeg`);
        return;
      }

      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595.28, 841.89]);
      const jpeg = Uint8Array.from(
        atob(dataUrl.split(",")[1] ?? ""),
        (char) => char.charCodeAt(0),
      );
      const image = await pdf.embedJpg(jpeg);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
      });
      const pdfBytes = await pdf.save();
      const url = URL.createObjectURL(
        new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
      );
      downloadBlob(url, `${slug}.pdf`);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error(error);
      window.alert("Could not export the invoice. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const form = (
    <>
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[#171412]">
          Client details
        </h2>
        <p className="mt-2 text-[13px] leading-5 text-[#6b6258]">
          Add the client and pieces, the invoice fills itself.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-[#ebe0d0] p-1">
          {(["light", "dark"] as InvoiceTheme[]).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => patch({ theme })}
              className={`rounded-full px-4 py-2.5 text-sm tracking-[0.14em] uppercase transition ${
                invoice.theme === theme
                  ? "bg-[#171412] text-[#f6eee4]"
                  : "text-[#6b6258] hover:text-[#171412]"
              }`}
            >
              {theme} mode
            </button>
          ))}
        </div>

        <label className="mt-6 block">
          <span className="text-[11px] tracking-[0.22em] text-[#9a7043] uppercase">
            Client
          </span>
          <input
            value={invoice.client}
            onChange={(event) => patch({ client: event.target.value })}
            placeholder="Hope"
            className="mt-2 w-full border-0 border-b border-[#c9a26d] bg-transparent pb-2 text-xl text-[#171412] outline-none placeholder:text-[#7a6b5c]"
          />
        </label>

        <div className="mt-6 grid grid-cols-2 gap-5">
          <label>
            <span className="text-[11px] tracking-[0.22em] text-[#9a7043] uppercase">
              Date issued
            </span>
            <input
              type="date"
              value={invoice.dateIssued}
              onChange={(event) => patch({ dateIssued: event.target.value })}
              className="mt-2 w-full border-0 border-b border-[#c9a26d] bg-transparent pb-2 text-base text-[#171412] outline-none"
            />
          </label>
          <label>
            <span className="text-[11px] tracking-[0.22em] text-[#9a7043] uppercase">
              Delivery date
            </span>
            <input
              value={invoice.delivery}
              onChange={(event) => patch({ delivery: event.target.value })}
              placeholder="2 weeks"
              className="mt-2 w-full border-0 border-b border-[#c9a26d] bg-transparent pb-2 text-base text-[#171412] outline-none placeholder:text-[#7a6b5c]"
            />
          </label>
        </div>

        <label className="mt-6 block">
          <span className="text-[11px] tracking-[0.22em] text-[#9a7043] uppercase">
            Order title
          </span>
          <input
            value={invoice.orderTitle}
            onChange={(event) => patch({ orderTitle: event.target.value })}
            placeholder="Optional — Back to School Dress"
            className="mt-2 w-full border-0 border-b border-[#c9a26d] bg-transparent pb-2 text-base text-[#171412] outline-none placeholder:text-[#7a6b5c]"
          />
        </label>

        <div className="mt-8 flex items-end justify-between gap-4">
          <label className="flex-1">
            <span className="text-[11px] tracking-[0.22em] text-[#9a7043] uppercase">
              Number of items
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={itemCountText}
              onFocus={() => {
                itemCountFocused.current = true;
              }}
              onBlur={() => {
                itemCountFocused.current = false;
                commitItemCount(itemCountText);
              }}
              onChange={(event) => {
                const next = event.target.value;
                if (!/^\d*$/.test(next)) return;
                setItemCountText(next);
                if (next === "") return;
                const n = Number(next);
                if (n >= 1 && n <= 12) {
                  patch({ items: resizeItems(invoice.items, n) });
                }
              }}
              className="mt-2 w-full border-0 border-b border-[#c9a26d] bg-transparent pb-2 text-2xl text-[#171412] outline-none"
            />
          </label>
          <p className="pb-2 text-sm tracking-[0.08em] text-[#9a7043] uppercase">
            Total {`N${total.toLocaleString("en-NG")}`}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {invoice.items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[rgba(201,162,109,0.35)] bg-[rgba(255,255,255,0.35)] p-4"
            >
              <p className="text-[11px] tracking-[0.2em] text-[#9a7043] uppercase">
                Item {index + 1}
              </p>
              <input
                value={item.description}
                onChange={(event) =>
                  updateItem(item.id, "description", event.target.value)
                }
                placeholder="Shirt"
                className="mt-2 w-full border-0 bg-transparent text-lg text-[#171412] outline-none placeholder:text-[#7a6b5c]"
              />
              <div className="mt-3 grid grid-cols-2 gap-4">
                <label>
                  <span className="text-[10px] tracking-[0.18em] text-[#8a7d70] uppercase">
                    Qty
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={item.qty}
                    onChange={(event) =>
                      updateItem(item.id, "qty", event.target.value)
                    }
                    className="mt-1 w-full border-0 border-b border-[#d7c4ae] bg-transparent pb-1 text-[#171412] outline-none"
                  />
                </label>
                <label>
                  <span className="text-[10px] tracking-[0.18em] text-[#8a7d70] uppercase">
                    Rate (₦)
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatIntegerInput(item.rate)}
                    onChange={(event) =>
                      updateItem(item.id, "rate", event.target.value)
                    }
                    placeholder="10,000"
                    className="mt-1 w-full border-0 border-b border-[#d7c4ae] bg-transparent pb-1 text-[#171412] outline-none tabular-nums placeholder:text-[#7a6b5c]"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

    </>
  );

  const downloadButtons = (variant: "mobile" | "desktop") => (
    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => handleDownload("jpeg")}
        className={
          variant === "desktop"
            ? "rounded-full bg-[#f8f3eb] px-5 py-3 text-[11px] tracking-[0.16em] text-[#171412] uppercase disabled:opacity-60"
            : "rounded-full bg-[#171412] px-4 py-3.5 text-[10px] tracking-[0.16em] text-[#f6eee4] uppercase disabled:opacity-60"
        }
      >
        {busy === "jpeg" ? "Saving…" : "Download JPEG"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => handleDownload("pdf")}
        className={
          variant === "desktop"
            ? "rounded-full border border-white/20 bg-transparent px-5 py-3 text-[11px] tracking-[0.16em] text-[#f6eee4] uppercase disabled:opacity-60"
            : "rounded-full border border-white/15 bg-white/5 px-4 py-3.5 text-[10px] tracking-[0.16em] text-[#f6eee4] uppercase disabled:opacity-60"
        }
      >
        {busy === "pdf" ? "Saving…" : "Download PDF"}
      </button>
    </div>
  );

  return (
    <div className="desktop-studio relative mx-auto w-full max-w-7xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:px-12 lg:pb-24 xl:gap-20">
      <div
        className="sticky top-0 z-30 -mx-4 mb-5 border-b border-white/[0.06] bg-[#0a0908]/90 px-4 py-3 backdrop-blur-md lg:hidden"
        role="tablist"
        aria-label="Invoice panels"
      >
        <div className="grid grid-cols-2 gap-2 rounded-full bg-white/[0.06] p-1">
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "details"}
            onClick={() => setMobilePanel("details")}
            className={`rounded-full py-2.5 text-[11px] tracking-[0.14em] uppercase transition ${
              mobilePanel === "details"
                ? "bg-[#f8f3eb] text-[#171412]"
                : "text-[#a89a8c]"
            }`}
          >
            Details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "invoice"}
            onClick={() => setMobilePanel("invoice")}
            className={`rounded-full py-2.5 text-[11px] tracking-[0.14em] uppercase transition ${
              mobilePanel === "invoice"
                ? "bg-[#f8f3eb] text-[#171412]"
                : "text-[#a89a8c]"
            }`}
          >
            Invoice
          </button>
        </div>
      </div>

      <div
        className={`lg:col-start-1 lg:row-start-1 lg:pb-4 ${mobilePanel === "details" ? "block" : "hidden lg:block"}`}
      >
        <ResponsiveFormFrame>{form}</ResponsiveFormFrame>
      </div>

      <aside
        className={`lg:col-start-2 lg:row-start-1 lg:sticky lg:top-8 lg:self-start lg:border-l lg:border-white/[0.07] lg:pl-12 lg:max-h-[calc(100vh-2.5rem)] ${
          mobilePanel === "invoice" ? "block" : "hidden lg:block"
        }`}
      >
        <div className="preview-stage mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl px-5 py-5 lg:px-6">
          <div>
            <p className="text-[10px] tracking-[0.45em] text-[#a88657] uppercase">
              Live preview
            </p>
            {/* <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#faf6f0] xl:text-3xl">
              GEM template
            </h2> */}
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-[0.2em] text-[#8a7d6e] uppercase">
              {invoice.theme} mode
            </p>
            {/* <p className="mt-1 text-sm tabular-nums text-[#d4c4b0]">
              {`N${total.toLocaleString("en-NG")}`}
            </p> */}
          </div>
        </div>
        <div className="flex justify-center lg:justify-start xl:justify-center">
          <div
            ref={frameRef}
            className="relative w-full max-w-[min(100%,520px)] overflow-hidden rounded-xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/10 xl:max-w-[580px]"
            style={{
              aspectRatio: `${TEMPLATE.width} / ${TEMPLATE.height}`,
            }}
          >
            <div
              style={{
                width: TEMPLATE.width,
                height: TEMPLATE.height,
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
              }}
            >
              <div ref={invoiceRef}>
                <InvoiceDocument invoice={invoice} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 hidden max-w-[580px] lg:block xl:mx-auto">
          {downloadButtons("desktop")}
        </div>
        <div className="mt-6 lg:hidden">{downloadButtons("mobile")}</div>
      </aside>

      <div
        className={`mobile-dock fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0c0b0a]/95 px-4 py-3 backdrop-blur-lg lg:hidden ${
          mobilePanel === "details" ? "block" : "hidden"
        }`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] tracking-[0.28em] text-[#8a7d6e] uppercase">
              Total
            </p>
            <p className="truncate text-lg tabular-nums text-[#f6eee4]">
              {`N${total.toLocaleString("en-NG")}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobilePanel("invoice")}
            className="shrink-0 rounded-full bg-[#c9a26d] px-5 py-3 text-[11px] tracking-[0.12em] text-[#171412] uppercase"
          >
            See invoice
          </button>
        </div>
      </div>
    </div>
  );
}

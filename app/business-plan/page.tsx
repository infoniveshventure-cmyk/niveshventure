"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import DashboardShell from "@/components/DashboardShell";
import {
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface PDFPageProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
  containerWidth: number;
}

function PDFPage({ pdfDoc, pageNum, scale, containerWidth }: PDFPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [rendering, setRendering] = useState(false);
  const renderTaskRef = useRef<any>(null);

  // Intersection Observer to render pages progressively as they scroll into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        rootMargin: "300px 0px", // Render pages 300px before they scroll into viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  // Render the PDF page
  useEffect(() => {
    let active = true;

    async function render() {
      if (!isVisible || !pdfDoc || !canvasRef.current) return;

      try {
        setRendering(true);

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        if (!active) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        let finalScale = scale;

        // Auto-fit to container width
        if (containerWidth > 0) {
          const fitScale = containerWidth / unscaledViewport.width;
          finalScale = Math.min(scale, fitScale);
        }

        const viewport = page.getViewport({ scale: finalScale });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (context && active) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          context.scale(dpr, dpr);

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          const renderTask = page.render(renderContext);
          renderTaskRef.current = renderTask;
          await renderTask.promise;
        }
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error(`Page ${pageNum} render error:`, err);
        }
      } finally {
        if (active) {
          setRendering(false);
        }
      }
    }

    render();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isVisible, pdfDoc, pageNum, scale, containerWidth]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center w-full min-h-[200px] justify-center"
    >
      {!isVisible ? (
        <div className="flex flex-col items-center gap-2 text-ink-muted py-12">
          <Loader2 className="w-6 h-6 animate-spin text-neon-cyan/50" />
          <span className="text-[10px]">Loading page {pageNum}...</span>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden flex justify-center">
          <canvas ref={canvasRef} className="block w-full max-w-full h-auto" />
          {rendering && (
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-neon-cyan animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BusinessPlanPage() {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ dist: number; scale: number } | null>(null);

  // Measure container width for responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.clientWidth);

    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [loading]);

  // Initialize PDF.js
  useEffect(() => {
    if (pdfJsLoaded && typeof window !== "undefined" && (window as any).pdfjsLib) {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

      const loadingTask = pdfjsLib.getDocument("/business-plan.pdf");
      loadingTask.promise
        .then((pdf: any) => {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setLoading(false);
        })
        .catch((err: any) => {
          console.error("Error loading PDF:", err);
          toast.error("Failed to load Business Plan PDF");
          setLoading(false);
        });
    }
  }, [pdfJsLoaded]);

  // Support Ctrl + Mouse Wheel zoom on desktop
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setScale((s) => Math.min(s + 0.1, 3.0));
        } else {
          setScale((s) => Math.max(s - 0.1, 0.75));
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  // Support pinch-to-zoom on mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = { dist, scale };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartRef.current.dist;
      const newScale = Math.min(Math.max(touchStartRef.current.scale * factor, 0.75), 3.0);
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleShare = async () => {
    const pdfUrl = `${window.location.origin}/business-plan.pdf`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Nivesh Ventures Business Plan",
          text: "Check out the official business presentation of Nivesh Ventures.",
          url: pdfUrl,
        });
        toast.success("Shared successfully");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast.error("Sharing failed");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(pdfUrl);
        toast.success("Business Plan PDF link copied to clipboard!");
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  return (
    <DashboardShell>
      {/* Load PDF.js Script */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"
        strategy="afterInteractive"
        onLoad={() => setPdfJsLoaded(true)}
      />

      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {/* <h1 className="font-display text-2xl font-bold tracking-wide">Business Plan</h1> */}
            <p className="text-xs text-ink-muted mt-1">
              Scroll down to read the full business presentation.
            </p>
          </div>

          {/* <div className="flex items-center gap-2">
            <a
              href="/business-plan.pdf"
              download="Nivesh_Ventures_Business_Plan.pdf"
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-semibold text-center"
            >
              <Download size={14} />
              Download
            </a>
            <button
              onClick={handleShare}
              className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 font-semibold text-center"
            >
              <Share2 size={14} />
              Share Plan
            </button>
          </div> */}
        </div>

        {/* PDF Viewer Card */}
        <div className="glass-card flex flex-col items-center">
          {/* Controls Bar */}
          <div className="w-full flex items-center justify-between gap-4 p-4 border-b border-white/5 bg-base-soft/40">
            <span className="text-xs font-mono font-medium text-ink-muted">
              Total Pages: {numPages || "?"}
            </span>

            {/* <div className="flex items-center gap-1">
              <button
                disabled={scale <= 0.75 || loading}
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 text-ink"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-mono font-medium w-12 text-center text-ink-muted">
                {Math.round(scale * 100)}%
              </span>
              <button
                disabled={scale >= 3.0 || loading}
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 text-ink"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
            </div> */}
            <div className="flex items-center gap-2">
              <a
                href="/business-plan.pdf"
                download="Nivesh_Ventures_Business_Plan.pdf"
                className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-semibold text-center"
              >
                <Download size={14} />
                {/* Download */}
              </a>
              <button
                onClick={handleShare}
                className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 font-semibold text-center"
              >
                <Share2 size={14} />
                {/* Share Plan */}
              </button>
            </div>
          </div>

          {/* Scrolling Viewport */}
          <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full flex flex-col items-center p-0 bg-black/20 min-h-[500px] relative overflow-y-auto max-h-[800px] scroll-smooth"
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-20">
                <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
                <p className="text-xs text-ink-muted">Loading PDF Document...</p>
              </div>
            ) : (
              <div className="w-full max-w-full">
                {Array.from({ length: numPages }).map((_, i) => (
                  <PDFPage
                    key={i}
                    pdfDoc={pdfDoc}
                    pageNum={i + 1}
                    scale={scale}
                    containerWidth={containerWidth}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

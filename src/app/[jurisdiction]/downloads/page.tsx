"use client";

import Link from "next/link";
import { Download, ArrowRight } from "lucide-react";
import { useJurisdiction } from "@/lib/jurisdiction-context";
import { useIncidents } from "@/hooks/use-incidents";
import { useArrests } from "@/hooks/use-arrests";
import { useCFS } from "@/hooks/use-cfs";
import { use311 } from "@/hooks/use-311";
import { useTJJD } from "@/hooks/use-tjjd";
import { useCampus } from "@/hooks/use-campus";
import { DOWNLOAD_DOMAINS, type DomainDownloadInfo } from "@/config/download-columns";
import { downloadData, type DownloadFormat } from "@/lib/download";

type PayloadMap = Record<string, { records?: Record<string, any>[]; lastUpdated?: string } | undefined>;

function DomainCard({
  info,
  records,
  lastUpdated,
  jurisdiction,
}: {
  info: DomainDownloadInfo;
  records: Record<string, any>[];
  lastUpdated?: string;
  jurisdiction: string;
}) {
  const handleDownload = async (format: DownloadFormat) => {
    await downloadData(records, info.columns, jurisdiction, info.domainId, "full", format);
  };

  return (
    <div className="bg-white rounded-lg border border-border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-serif text-base font-bold">{info.label}</h2>
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {records.length.toLocaleString()} rows
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{info.description}</p>
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
      )}
      <div className="flex items-center gap-2 mt-auto pt-2">
        <button
          onClick={() => handleDownload("csv")}
          disabled={records.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-border hover:border-accent hover:text-foreground text-muted-foreground bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
        <button
          onClick={() => handleDownload("xlsx")}
          disabled={records.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-border hover:border-accent hover:text-foreground text-muted-foreground bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" />
          Excel
        </button>
        <Link
          href={`/${jurisdiction}${info.pageHref}`}
          className="ml-auto flex items-center gap-1 text-sm text-accent hover:underline"
        >
          View dashboard
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function DownloadsPage() {
  const { id: jurisdiction } = useJurisdiction();

  // All 6 hooks called unconditionally at top level (Rules of Hooks)
  const incidents = useIncidents();
  const arrests = useArrests();
  const cfs = useCFS();
  const requests311 = use311();
  const tjjd = useTJJD();
  const campus = useCampus();

  const payloads: PayloadMap = {
    incidents: incidents.data,
    arrests: arrests.data,
    cfs: cfs.data,
    "311": requests311.data,
    tjjd: tjjd.data,
    campus: campus.data,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-serif text-lg md:text-xl font-bold">Downloads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download full datasets in CSV or Excel format. For filtered exports, use the download button on each dashboard page.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOWNLOAD_DOMAINS.map((info) => {
          const payload = payloads[info.domainId];
          return (
            <DomainCard
              key={info.domainId}
              info={info}
              records={(payload?.records as Record<string, any>[]) ?? []}
              lastUpdated={payload?.lastUpdated}
              jurisdiction={jurisdiction}
            />
          );
        })}
      </div>
    </div>
  );
}

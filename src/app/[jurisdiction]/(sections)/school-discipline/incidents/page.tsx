"use client";

import { useState } from "react";
import { useCampus, useFilteredCampus } from "@/hooks/use-campus";
import { useCampusStore } from "@/stores/campus-store";
import { DownloadButton } from "@/components/ui/download-button";
import { DOWNLOAD_DOMAINS } from "@/config/download-columns";
import { CompStatDisciplineTable } from "@/components/charts/compstat-discipline-table";
import { MultiSelect } from "@/components/filters/multi-select";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { cn } from "@/lib/utils";
import { PageToggle } from "@/components/ui/page-toggle";
import { useJurisdiction } from "@/lib/jurisdiction-context";
import { getSections } from "@/lib/jurisdictions";

type SectionTab = "reasons" | "actions";

const SECTION_CODES: Record<SectionTab, string[]> = {
  reasons: ["W-REASON INCIDENT COUNTS"],
  actions: ["X-DISCIPLINE ACTION COUNTS"],
};

const campusCols = DOWNLOAD_DOMAINS.find((d) => d.domainId === "campus")!.columns;

export default function SchoolDisciplinePage() {
  const { data: rawPayload } = useCampus();
  const { filteredData, compStatRecords, schoolNameOptions, metadata, isLoading } =
    useFilteredCampus();
  const store = useCampusStore();
  const config = useJurisdiction();
  const sectionPages = getSections(config).find((s) => s.id === "school-discipline")?.pages ?? [];
  const [sectionTab, setSectionTab] = useState<SectionTab>("reasons");

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-lg md:text-xl font-bold">School Discipline</h1>
        <PageToggle pages={sectionPages} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border sticky top-0 z-50">
        {metadata?.schoolYears && (
          <select
            value={store.schoolYear ?? ""}
            onChange={(e) => store.setSchoolYear(e.target.value || null)}
            className="border border-border rounded px-2 py-1 text-sm bg-white"
          >
            <option value="">All School Years</option>
            {metadata.schoolYears.map((sy) => (
              <option key={sy} value={sy}>
                {sy}
              </option>
            ))}
          </select>
        )}

        <select
          value={store.schoolType ?? ""}
          onChange={(e) => {
            store.setSchoolType(e.target.value || null);
            store.setSchoolNames([]);
          }}
          className="border border-border rounded px-2 py-1 text-sm bg-white"
        >
          <option value="">All School Types</option>
          <option value="INDEPENDENT">Traditional ISD/CSD</option>
          <option value="CHARTER">Open Enrollment Charter</option>
        </select>

        <MultiSelect
          label="School Name"
          options={schoolNameOptions}
          selected={store.schoolNames}
          onChange={store.setSchoolNames}
        />
        <div className="ml-auto">
          <DownloadButton
            domain="campus"
            columns={campusCols}
            filteredData={filteredData}
            fullData={rawPayload?.records ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Section tabs + CompStat Table */}
      <div>
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setSectionTab("reasons")}
            className={cn(
              "px-3 py-1.5 text-xs rounded border transition-colors",
              sectionTab === "reasons"
                ? "bg-primary text-white border-primary"
                : "bg-white text-foreground border-border hover:bg-muted",
            )}
          >
            Incident Reasons
          </button>
          <button
            onClick={() => setSectionTab("actions")}
            className={cn(
              "px-3 py-1.5 text-xs rounded border transition-colors",
              sectionTab === "actions"
                ? "bg-primary text-white border-primary"
                : "bg-white text-foreground border-border hover:bg-muted",
            )}
          >
            Discipline Actions
          </button>
        </div>
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <CompStatDisciplineTable
            records={compStatRecords}
            schoolYears={metadata?.schoolYears ?? []}
            selectedYear={store.schoolYear}
            title="Discipline Summary by School Year"
            visibleSections={SECTION_CODES[sectionTab]}
          />
        )}
      </div>
    </div>
  );
}

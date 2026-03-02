"use client";

import { useMemo } from "react";
import { useCampus, useFilteredCampus } from "@/hooks/use-campus";
import { useCampusStore } from "@/stores/campus-store";
import { DownloadButton } from "@/components/ui/download-button";
import { DOWNLOAD_DOMAINS } from "@/config/download-columns";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { CompStatDisciplineTable } from "@/components/charts/compstat-discipline-table";
import { DotMap, type DotMapPoint } from "@/components/charts/dot-map";
import { MultiSelect } from "@/components/filters/multi-select";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";

/** Instruction type color map for dot map */
const INSTRUCTION_COLOR_MAP: Record<string, string> = {
  Regular: "#2563eb",
  Alternative: "#7C3AED",
  DAEP: "#f59e0b",
  JJAEP: "#65bc7b",
};

/** Strip " INSTRUCTIONAL" suffix for cleaner labels */
function cleanInstructionType(raw: string): string {
  return raw.replace(/ INSTRUCTIONAL$/i, "").trim();
}

const campusCols = DOWNLOAD_DOMAINS.find((d) => d.domainId === "campus")!.columns;

export default function SchoolDisciplinePage() {
  const { data: rawPayload } = useCampus();
  const { filteredData, compStatRecords, filteredSchools, schoolNameOptions, metadata, isLoading } =
    useFilteredCampus();
  const store = useCampusStore();

  // Bar chart: Incident Reasons (section W)
  const incidentReasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredData) {
      if (r.se !== "W-REASON INCIDENT COUNTS" || r.tp !== "Incident Type") continue;
      map.set(r.ds, (map.get(r.ds) ?? 0) + r.v);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ key, count }));
  }, [filteredData]);

  // Bar chart: Discipline Actions (section X)
  const disciplineActions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredData) {
      if (r.se !== "X-DISCIPLINE ACTION COUNTS" || r.tp !== "Incident Type") continue;
      map.set(r.ds, (map.get(r.ds) ?? 0) + r.v);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ key, count }));
  }, [filteredData]);

  // School dot map points — colored by cleaned instruction type
  const schoolPoints: DotMapPoint[] = useMemo(() => {
    return filteredSchools
      .filter((s) => s.lat && s.lon)
      .map((s) => ({
        lat: s.lat,
        lon: s.lon,
        category: cleanInstructionType(s.instructionType),
        count: s.enrollment || 1,
        label: s.name,
      }));
  }, [filteredSchools]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">School Discipline</h1>

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
            store.setSchoolNames([]); // reset names when type changes
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
        <MultiSelect
          label="Section"
          options={metadata?.sections ?? []}
          selected={store.sections}
          onChange={store.setSections}
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

      {/* CompStat Table */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <CompStatDisciplineTable
          records={compStatRecords}
          schoolYears={metadata?.schoolYears ?? []}
          selectedYear={store.schoolYear}
          title="Discipline Summary by School Year"
        />
      )}

      {/* Bar Charts: 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <BarChartHorizontal data={incidentReasons} title="Incident Reasons" />
            <BarChartHorizontal data={disciplineActions} title="Discipline Actions" />
          </>
        )}
      </div>

      {/* Dot Map */}
      {!isLoading && schoolPoints.length > 0 && (
        <DotMap
          points={schoolPoints}
          colorMap={INSTRUCTION_COLOR_MAP}
          defaultColor="#7C3AED"
          title="School Locations by Instruction Type"
          height={400}
        />
      )}
    </div>
  );
}

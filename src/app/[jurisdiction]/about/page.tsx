"use client";

import { useJurisdiction } from "@/lib/jurisdiction-context";

export default function AboutPage() {
  const config = useJurisdiction();

  const socrataBase = config.socrata?.baseUrl;
  const dataSources = [
    ...(config.socrata
      ? [
          {
            domain: "Police Incidents",
            source: `${config.shortName} Open Data — Police Incidents`,
            url: `${socrataBase}/${config.socrata.incidents}`,
            description: "NIBRS-based offense records since 2017, updated daily.",
          },
          {
            domain: "Arrests",
            source: `${config.shortName} Open Data — Arrests`,
            url: `${socrataBase}/${config.socrata.arrests}`,
            description: "Arrest records with demographic and charge details.",
          },
          {
            domain: "311 Service Requests",
            source: `${config.shortName} Open Data — 311 Requests`,
            url: `${socrataBase}/${config.socrata.requests311}`,
            description: "Code Compliance requests via the 311 system.",
          },
        ]
      : []),
    {
      domain: "Calls for Service",
      source: `${config.shortName} Police Department — CFS Data`,
      description: "Monthly CFS exports joined with call type and disposition crosswalks.",
    },
    {
      domain: "Youth Court Referrals",
      source: "Texas Juvenile Justice Department — Referral Data",
      description: "Monthly TJJD referral data by category (age, offense, disposition, etc.).",
    },
    {
      domain: "School Discipline",
      source: "Texas Education Agency — CAMPUS Discipline Summaries",
      description: `Annual TEA discipline incident reports for ${config.name} campuses.`,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <h1 className="font-serif text-2xl font-bold">About This Dashboard</h1>

      <section className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The {config.shortName} Youth Safety Dashboard provides a comprehensive view of public safety data
          relevant to youth in {config.name}. It consolidates data from multiple government
          sources into an accessible, interactive format.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Built by <strong>AH Datalytics</strong> for the{" "}
          <strong>{config.org} ({config.orgShort})</strong>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-lg font-bold">Data Sources</h2>
        <div className="space-y-3">
          {dataSources.map((ds) => (
            <div key={ds.domain} className="border border-border rounded-lg p-4 bg-white">
              <h3 className="font-serif font-bold text-sm">{ds.domain}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {"url" in ds && ds.url ? (
                  <a
                    href={ds.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {ds.source}
                  </a>
                ) : (
                  ds.source
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{ds.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold">Methodology</h2>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>
            <strong>Year-to-Date (YTD)</strong> comparisons use the same date range from January 1
            through the most recent available data date, compared to the same period in the prior year.
          </li>
          <li>
            <strong>NIBRS hierarchy</strong> follows the FBI&apos;s National Incident-Based Reporting
            System: Crime Against Person/Property/Society, Offense Group, and specific NIBRS code.
          </li>
          <li>
            <strong>CFS response times</strong> are calculated as the difference between first unit
            assigned and first unit arrived on scene, in minutes. Negative values are excluded.
          </li>
          <li>
            <strong>311 requests</strong> are filtered to the Code Compliance department only, per the
            original Power BI analysis scope.
          </li>
          <li>
            <strong>School discipline data</strong> comes from TEA CAMPUS discipline summaries,
            joined with the TEA school directory to filter to {config.name} campuses.
          </li>
        </ul>
      </section>

      <section className="border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          Data is refreshed daily via automated pipelines. Discrepancies with source systems may
          occur due to data update timing. All data is publicly available.
        </p>
      </section>
    </div>
  );
}

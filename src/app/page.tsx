"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout";
import { SECTIONS } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

const sectionDescriptions: Record<string, string> = {
  "offense-arrest":
    "Explore offense trends, NIBRS categories, geographic patterns, and arrest demographics across Dallas.",
  "cfs-311":
    "Analyze calls for service volume, time-of-day patterns, and 311 service request trends.",
  "youth-court":
    "View youth court referrals by offense type, demographics, and trends over time from TJJD data.",
  "school-discipline":
    "Examine school disciplinary incidents and outcomes across Dallas County campuses from TEA CAMPUS data.",
};

export default function HomePage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary">
            Dallas Youth Safety Dashboard
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A comprehensive public safety data platform for Dallas County, focused on youth
            outcomes across offense data, calls for service, court referrals, and school discipline.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by the{" "}
            <span className="font-semibold text-primary">Lone Star Justice Alliance</span> and{" "}
            <span className="font-semibold text-primary">AH Datalytics</span>
          </p>
        </section>

        {/* Section navigation cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECTIONS.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="group border border-border rounded-lg bg-white p-6 hover:border-primary hover:shadow-sm transition-all"
            >
              <h2 className="font-serif font-bold text-lg text-primary group-hover:text-accent transition-colors mb-2">
                {section.label}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {sectionDescriptions[section.id]}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {section.pages.map((page) => (
                  <span
                    key={page.id}
                    className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground"
                  >
                    {page.label}
                  </span>
                ))}
              </div>
              <span className="text-sm text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                Explore <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </section>

        {/* Data sources */}
        <section className="border border-border rounded-lg bg-white p-6">
          <h2 className="font-serif font-bold text-lg mb-4">Data Sources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-1">Open Data (Socrata API)</h3>
              <ul className="text-muted-foreground space-y-1">
                <li>Dallas Police Incidents (2017–present)</li>
                <li>Dallas Arrests</li>
                <li>311 Service Requests</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Partner Data</h3>
              <ul className="text-muted-foreground space-y-1">
                <li>Dallas Police Calls for Service</li>
                <li>TJJD Youth Court Referrals</li>
                <li>TEA CAMPUS Disciplinary Data</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

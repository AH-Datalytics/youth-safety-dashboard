import Image from "next/image";
import Link from "next/link";
import { JURISDICTIONS } from "@/lib/jurisdictions";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="bg-black text-white py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-serif text-2xl font-bold">
            Youth Safety Dashboards
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Powered by AH Datalytics
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {JURISDICTIONS.map((j) => (
            <Link
              key={j.id}
              href={`/${j.id}`}
              className="group block bg-white rounded-lg border border-[#e8e8e8] p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src={j.logo}
                  alt={j.org}
                  width={80}
                  height={30}
                  className="h-6 w-auto"
                />
                <span
                  className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full text-white"
                  style={{ backgroundColor: j.colors.primary }}
                >
                  {j.domains.length} domains
                </span>
              </div>
              <h2 className="font-serif text-lg font-bold text-[#1a1a1a] group-hover:text-[#2C1A6B] transition-colors">
                {j.name}
              </h2>
              <p className="text-sm text-[#6b7280] mt-1">{j.org}</p>
              <p className="text-xs text-[#9ca3af] mt-2">{j.description}</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#e8e8e8] bg-white py-4 px-4 text-center">
        <p className="text-xs text-[#666]">
          Powered by{" "}
          <a
            href="https://ahdatalytics.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
          >
            AH Datalytics
          </a>
        </p>
      </footer>
    </div>
  );
}

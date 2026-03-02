"""
Dallas Police Incidents — Download CSV & write Parquet
Replaces the R script. Runs on GitHub Actions (no local files needed).

Downloads the full incidents dataset from Dallas Open Data (Socrata CSV export),
cleans columns, extracts geo coordinates, filters 2017+, and writes a compact
zstd-compressed Parquet file.

Usage:
  python scripts/prepare-incidents-parquet.py

Output:
  data/generated/police-incidents.parquet
"""

import os
import re
import sys
from pathlib import Path

try:
    import pandas as pd
    import pyarrow as pa
    import pyarrow.parquet as pq
except ImportError:
    print("Missing dependencies. Install with: pip install pandas pyarrow requests")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Missing requests. Install with: pip install requests")
    sys.exit(1)

# Dallas Open Data — Police Incidents CSV export
CSV_URL = "https://www.dallasopendata.com/api/views/qv6i-rri7/rows.csv?accessType=DOWNLOAD"
OUTPUT_DIR = Path("data/generated")
OUTPUT_FILE = OUTPUT_DIR / "police-incidents.parquet"
DATE_FLOOR = "2017-01-01"


def pick_col(candidates: list[str], columns: list[str]) -> str | None:
    """Find first matching column name from candidates (case-insensitive)."""
    col_lower = {c.lower().strip(): c for c in columns}
    for cand in candidates:
        if cand.lower().strip() in col_lower:
            return col_lower[cand.lower().strip()]
    return None


def extract_lonlat(location: str) -> tuple[float | None, float | None]:
    """Extract longitude and latitude from various geo formats."""
    if not location or pd.isna(location):
        return None, None

    loc = str(location).strip()

    # JSON-ish: {"type":"Point","coordinates":[-96.7, 32.8]}
    if "coordinates" in loc:
        nums = re.findall(r"-?\d+\.?\d*", loc)
        if len(nums) >= 2:
            try:
                return float(nums[0]), float(nums[1])
            except ValueError:
                pass

    # POINT (lon lat) or (lon, lat) or (lon lat)
    m = re.search(r"\(([^)]*)\)", loc)
    if m:
        inside = m.group(1).replace(",", " ")
        parts = inside.split()
        if len(parts) >= 2:
            try:
                return float(parts[0]), float(parts[1])
            except ValueError:
                pass

    return None, None


def main():
    print("=== Dallas Police Incidents — CSV to Parquet ===")

    # Download CSV
    print(f"Downloading CSV from Dallas Open Data...")
    resp = requests.get(CSV_URL, stream=True, timeout=600)
    resp.raise_for_status()

    # Save to temp file first (large download)
    tmp_csv = OUTPUT_DIR / "_incidents_download.csv"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    total_bytes = 0
    with open(tmp_csv, "wb") as f:
        for chunk in resp.iter_content(chunk_size=1024 * 1024):
            f.write(chunk)
            total_bytes += len(chunk)
            if total_bytes % (50 * 1024 * 1024) == 0:
                print(f"  Downloaded {total_bytes / (1024*1024):.0f} MB...")

    print(f"  Downloaded {total_bytes / (1024*1024):.1f} MB total")

    # Read CSV
    print("Reading CSV...")
    df = pd.read_csv(tmp_csv, low_memory=False)
    print(f"  Loaded {len(df):,} rows, {len(df.columns)} columns")

    cols = list(df.columns)

    # Map flexible column names to standard names
    col_map = {
        "Call Received Date Time": pick_col(
            ["Call Received Date Time", "Call Received", "callreceived"], cols
        ),
        "Date2 of Occurrence": pick_col(
            ["Date2 of Occurrence ", "Date2 of Occurrence", "Date2", "date2_of_occurrence_2"], cols
        ),
        "Call Date Time": pick_col(
            ["Call Date Time", "Call Org Date", "CallOrgDate", "callorgdate"], cols
        ),
        "Date1 of Occurrence": pick_col(
            ["Date1 of Occurrence", "Date1", "date1", "Date of Occurrence"], cols
        ),
        "Time1 of Occurrence": pick_col(
            ["Time1 of Occurrence", "Time1", "time1"], cols
        ),
        "Incident Number": pick_col(
            ["Incident Number", "Incident Number w/year", "Incident Number W/Year",
             "Incident Number w/Year", "incidentnum"], cols
        ),
        "UCR Disposition": pick_col(["UCR Disposition", "ucr_disp"], cols),
        "NIBRS Code": pick_col(["NIBRS Code", "nibrs_code"], cols),
        "Call Cleared Date Time": pick_col(
            ["Call Cleared Date Time", "Call Cleared", "callcleared"], cols
        ),
        "Gang Related Offense": pick_col(["Gang Related Offense", "gang"], cols),
        "Drug Related Incident": pick_col(
            ["Drug Related Istevencident", "Drug Related Incident", "drug"], cols
        ),
        "Date Incident Created": pick_col(
            ["Date incident created", "Date Incident Created", "edate"], cols
        ),
        "Date of Report": pick_col(["Date of Report", "Reported Date", "reporteddate"], cols),
        "Call Dispatch Date Time": pick_col(
            ["Call Dispatch Date Time", "Call Dispatched", "calldispatched"], cols
        ),
        "NIBRS Type": pick_col(["NIBRS Type", "nibrs_type"], cols),
        "Location": pick_col(
            ["Full Location", "Location1", "Location 1", "Location", "geocoded_column"], cols
        ),
    }

    # Check for missing required columns
    missing = [name for name, col in col_map.items() if col is None]
    if missing:
        print(f"WARNING: Could not find columns: {missing}")
        print(f"Available columns: {cols[:50]}")

    # Rename columns to standard names
    rename_map = {orig: standard for standard, orig in col_map.items() if orig is not None}
    df = df.rename(columns=rename_map)

    # Parse Date1 of Occurrence
    if "Date1 of Occurrence" in df.columns:
        df["Date1_dt"] = pd.to_datetime(df["Date1 of Occurrence"], errors="coerce", utc=True)
    else:
        print("ERROR: No date column found. Cannot filter by date.")
        sys.exit(1)

    # Filter 2017+
    df = df[df["Date1_dt"] >= pd.Timestamp(DATE_FLOOR, tz="UTC")].copy()
    print(f"  After date filter (>= {DATE_FLOOR}): {len(df):,} rows")

    # Date-only column
    df["Date Only"] = df["Date1_dt"].dt.date
    df["Date1 of Occurrence"] = df["Date1_dt"].dt.date

    # Parse Date2
    if "Date2 of Occurrence" in df.columns:
        df["Date2 of Occurrence"] = pd.to_datetime(
            df["Date2 of Occurrence"], errors="coerce", utc=True
        ).dt.date

    # Hour extraction from Time1
    if "Time1 of Occurrence" in df.columns:
        def parse_hour(val):
            if pd.isna(val):
                return None
            s = str(val)
            m = re.match(r"^(\d{1,2}):", s)
            if m:
                h = int(m.group(1))
                return f"{h:02d}:00:00" if 0 <= h < 24 else None
            return None

        df["Hour"] = df["Time1 of Occurrence"].apply(parse_hour)

    # Longitude / Latitude extraction
    if "Location" in df.columns:
        coords = df["Location"].apply(extract_lonlat)
        df["Longitude"] = coords.apply(lambda x: x[0])
        df["Latitude"] = coords.apply(lambda x: x[1])

    # Drop helper columns
    drop_cols = ["Time1 of Occurrence", "Location", "Date1_dt"]
    df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors="ignore")

    # Select final columns (keep only those that exist)
    final_cols = [
        "Call Received Date Time",
        "Date2 of Occurrence",
        "Call Date Time",
        "Hour",
        "Date1 of Occurrence",
        "Incident Number",
        "UCR Disposition",
        "NIBRS Code",
        "Call Cleared Date Time",
        "Date Only",
        "Gang Related Offense",
        "Latitude",
        "Longitude",
        "Drug Related Incident",
        "Date Incident Created",
        "Date of Report",
        "Call Dispatch Date Time",
        "NIBRS Type",
    ]
    final_cols = [c for c in final_cols if c in df.columns]
    df = df[final_cols]

    # Write Parquet with zstd compression
    print(f"Writing Parquet ({len(df):,} rows)...")
    table = pa.Table.from_pandas(df)
    pq.write_table(table, OUTPUT_FILE, compression="zstd")

    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"  Wrote: {OUTPUT_FILE} ({size_mb:.1f} MB)")

    # Also output a lightweight CSV for the TypeScript ETL
    # (avoids re-downloading 850MB+ in the TS pipeline)
    # Includes: date, offense, category, district, zip, nibrs, hour, case_status, lat, lon
    etl_csv = OUTPUT_DIR / "_incidents-etl.csv"
    etl_cols = {
        "offense": pick_col(["Offense_Incident", "offincident", "Offense Incident"], cols),
        "category": pick_col(["NIBRS Crime Category", "nibrs_crime_category"], cols),
        "district": pick_col(["Division", "district", "District"], cols),
        "zip": pick_col(["Zip Code", "zip_code"], cols),
        "nibrs": pick_col(["NIBRS Crime", "nibrs_crime"], cols),
        "ucr_disp": pick_col(["UCR Disposition", "ucr_disp"], cols),
        "time1": pick_col(["Time1 of Occurrence", "Time1", "time1"], cols),
        "location": pick_col(
            ["Full Location", "Location1", "Location 1", "Location", "geocoded_column"], cols
        ),
    }

    # Read from the original CSV (before column renaming), filter 2017+
    df_orig = pd.read_csv(tmp_csv, low_memory=False)
    date_col = pick_col(["Date1 of Occurrence", "date1", "Date1"], list(df_orig.columns))
    if date_col:
        df_orig["_date"] = pd.to_datetime(df_orig[date_col], errors="coerce", utc=True)
        df_orig = df_orig[df_orig["_date"] >= pd.Timestamp(DATE_FLOOR, tz="UTC")]
        df_orig["_date_str"] = df_orig["_date"].dt.strftime("%Y-%m-%d")

        etl_df = pd.DataFrame()
        etl_df["date"] = df_orig["_date_str"]

        for out_name, src_col in etl_cols.items():
            if src_col and src_col in df_orig.columns:
                etl_df[out_name] = df_orig[src_col].fillna("").astype(str).str.strip()
            else:
                etl_df[out_name] = ""

        # Extract hour from time1 column
        def _parse_hour_str(val):
            if not val or pd.isna(val) or str(val).strip() == "":
                return ""
            s = str(val)
            m = re.match(r"^(\d{1,2}):", s)
            if m:
                h = int(m.group(1))
                return str(h) if 0 <= h < 24 else ""
            return ""

        if "time1" in etl_df.columns:
            etl_df["hour"] = etl_df["time1"].apply(_parse_hour_str)
            etl_df = etl_df.drop(columns=["time1"])
        else:
            etl_df["hour"] = ""

        # Extract lat/lon from location column
        if "location" in etl_df.columns:
            coords = etl_df["location"].apply(lambda x: extract_lonlat(x))
            etl_df["lat"] = coords.apply(lambda x: str(x[1]) if x[1] is not None else "")
            etl_df["lon"] = coords.apply(lambda x: str(x[0]) if x[0] is not None else "")
            etl_df = etl_df.drop(columns=["location"])
        else:
            etl_df["lat"] = ""
            etl_df["lon"] = ""

        # Rename ucr_disp → case_status (keep raw value; TS ETL will map to labels)
        if "ucr_disp" in etl_df.columns:
            etl_df = etl_df.rename(columns={"ucr_disp": "case_status"})

        etl_df.to_csv(etl_csv, index=False)
        etl_size_mb = os.path.getsize(etl_csv) / (1024 * 1024)
        print(f"  Wrote ETL CSV: {etl_csv} ({etl_size_mb:.1f} MB, {len(etl_df):,} rows)")
    else:
        print("  WARNING: Could not write ETL CSV (no date column found)")

    # Cleanup temp CSV
    if tmp_csv.exists():
        tmp_csv.unlink()
        print("  Cleaned up temp CSV")

    print(f"\nDone. {len(df):,} rows written to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

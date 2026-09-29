# Youth Safety Dashboard

Public dashboard for Texas youth public-safety data, built for Lone Star Justice Alliance.
Currently covers Dallas County (`/dallas`) and Tarrant County (`/tarrant`).

The app publishes aggregate and map-ready data from public sources and public-records datasets. Generated dashboard payloads are committed as compressed JSON so the deployed app can serve data without requiring runtime access to the original source files.

## Data Sources

- Municipal open data: police incidents, and where published, arrests and 311 service
  requests. Dallas publishes via Socrata; Fort Worth via ArcGIS Feature Services.
- Public-records source files: calls for service, and TJJD youth-court referral
  dispositions (a Family Code 58.009 request covering Dallas and Tarrant).
- Public education data: campus discipline and enrollment summaries from TEA.

Coverage differs by jurisdiction — not every domain is published everywhere. A
jurisdiction's nav and home page show only the sections it has data for. Calls for service
in Dallas come from an annual public-records request, and those pages state the date the
data runs through.

Live at https://youth-safety-dashboards.vercel.app/dallas and `/tarrant`.

Raw source files are not committed to this repository. They are downloaded during the scheduled refresh workflow and transformed into generated files under `data/generated/`.

## Development

```bash
npm install
npm run dev
```

To regenerate dashboard data locally, place the required source files under `data/source/` and `data/crosswalks/`, then run:

```bash
npm run refresh-data
```

## Scheduled Refresh

GitHub Actions runs a daily data refresh. The workflow:

1. Installs Node and Python dependencies.
2. Downloads source files using repository secrets.
3. Prepares large source files for ETL.
4. Runs the dashboard ETL.
5. Commits generated `.json.gz` payloads when data changes.

## Public Data Note

The dashboard is intended for public use. Some generated files include point-level coordinates used by the map views. Those payloads are also served by the deployed application API.

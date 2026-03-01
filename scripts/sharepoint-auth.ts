// ============================================================
// SharePoint / Microsoft Graph API Authentication
// Uses MSAL client credentials flow to download files from SharePoint.
// ============================================================

import { ConfidentialClientApplication } from "@azure/msal-node";

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID || "";
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID || "";
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET || "";

const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;
const SCOPES = ["https://graph.microsoft.com/.default"];

let msalClient: ConfidentialClientApplication | null = null;

function getMSALClient(): ConfidentialClientApplication {
  if (!msalClient) {
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
      throw new Error(
        "Missing SharePoint credentials. Set SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET environment variables."
      );
    }
    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        authority: AUTHORITY,
      },
    });
  }
  return msalClient;
}

async function getAccessToken(): Promise<string> {
  const client = getMSALClient();
  const result = await client.acquireTokenByClientCredential({ scopes: SCOPES });
  if (!result?.accessToken) {
    throw new Error("Failed to acquire access token from MSAL");
  }
  return result.accessToken;
}

/**
 * Download a file from OneDrive/SharePoint via Microsoft Graph API.
 * Uses direct drive access (works for both personal OneDrive and SharePoint doc libraries).
 * @param driveId - Drive ID (personal OneDrive or SharePoint document library)
 * @param itemPath - Path to the file within the drive (e.g. "/Clients/NLC/Dallas/PowerBI/data.xlsx")
 * @returns Buffer containing the file contents
 */
export async function downloadSharePointFile(
  driveId: string,
  itemPath: string
): Promise<Buffer> {
  const token = await getAccessToken();

  const encodedPath = encodeURIComponent(itemPath).replace(/%2F/g, "/");
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}:/content`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "follow",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`Download failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

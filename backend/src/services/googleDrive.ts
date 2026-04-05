import { google } from "googleapis";
import { Readable } from "stream";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

/**
 * Upload a base64 data URL to Google Drive.
 * Returns the public view URL.
 */
export async function uploadImageToDrive(
  filename: string,
  mimeType: string,
  base64Data: string
): Promise<{ fileId: string; viewUrl: string }> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  // Strip data URL prefix if present
  const base64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const buffer = Buffer.from(base64, "base64");
  const stream = Readable.from(buffer);

  const fileMetadata: any = { name: filename };
  if (FOLDER_ID) fileMetadata.parents = [FOLDER_ID];

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media: { mimeType, body: stream },
    fields: "id",
  });

  const fileId = res.data.id!;

  // Make file publicly readable
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    fileId,
    viewUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
}

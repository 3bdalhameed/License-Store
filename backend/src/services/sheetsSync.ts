import { google } from "googleapis";
import { prisma } from "../lib/prisma";

const getSheetClient = () => {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
};

// Expected sheet columns: A=key, B=product, C=status
// Row 1 is the header row and is skipped
export const syncKeysFromSheet = async (): Promise<{
  imported: number;
  skipped: number;
}> => {
  const sheets = getSheetClient();
  const sheetId = process.env.GOOGLE_SHEET_ID!;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1!A2:C",
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const [key, productName, status] = row;

    if (!key || !productName || status?.toLowerCase() === "sold") {
      skipped++;
      continue;
    }

    // Check if key already exists in DB
    const existing = await prisma.licenseKey.findUnique({ where: { key } });
    if (existing) {
      skipped++;
      continue;
    }

    // Find or create the product
    let product = await prisma.product.findFirst({
      where: { name: { equals: productName, mode: "insensitive" } },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: productName,
          priceInCredits: 1, // Default — admin can update in panel
        },
      });
    }

    await prisma.licenseKey.create({
      data: { key, productId: product.id, status: "UNUSED" },
    });

    imported++;
  }

  return { imported, skipped };
};

// Mark a key as sold back in Google Sheets (optional but keeps sheet in sync)
export const markKeyAsSoldInSheet = async (key: string): Promise<void> => {
  try {
    const sheets = getSheetClient();
    const sheetId = process.env.GOOGLE_SHEET_ID!;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Sheet1!A2:C",
    });

    const rows = response.data.values;
    if (!rows) return;

    const rowIndex = rows.findIndex((r) => r[0] === key);
    if (rowIndex === -1) return;

    // +2 because: 1-indexed + header row offset
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Sheet1!C${rowIndex + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [["sold"]] },
    });
  } catch (err) {
    console.error("Failed to update sheet:", err);
    // Non-fatal — DB is the source of truth
  }
};

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

  console.log(`Sheet rows found: ${rows.length}`);
  console.log("Raw rows:", JSON.stringify(rows));

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const key = row[0]?.toString().trim();
    const productName = row[1]?.toString().trim();
    const status = row[2]?.toString().trim().toLowerCase();

    console.log(`Row -> key: "${key}" | product: "${productName}" | status: "${status}"`);

    if (!key || !productName) {
      console.log("  Skipped: missing key or product name");
      skipped++;
      continue;
    }

    if (status === "sold") {
      console.log("  Skipped: already sold");
      skipped++;
      continue;
    }

    const existing = await prisma.licenseKey.findUnique({ where: { key } });
    if (existing) {
      console.log("  Skipped: key already in DB");
      skipped++;
      continue;
    }

    let product = await prisma.product.findFirst({
      where: { name: { equals: productName, mode: "insensitive" } },
    });

    if (!product) {
      console.log(`  Creating new product: "${productName}"`);
      product = await prisma.product.create({
        data: { name: productName, priceInCredits: 1 },
      });
    }

    await prisma.licenseKey.create({
      data: { key, productId: product.id, status: "UNUSED" },
    });

    console.log(`  Imported: "${key}" for "${productName}"`);
    imported++;
  }

  return { imported, skipped };
};

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

    const rowIndex = rows.findIndex((r) => r[0]?.toString().trim() === key);
    if (rowIndex === -1) return;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Sheet1!C${rowIndex + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [["sold"]] },
    });
  } catch (err) {
    console.error("Failed to update sheet:", err);
  }
};

// Append new keys to Google Sheet from admin panel
export const addKeysToSheet = async (keys: string[], productName: string): Promise<void> => {
  const sheets = getSheetClient();
  const sheetId = process.env.GOOGLE_SHEET_ID!;

  const rows = keys.map((key) => [key, productName, "unused"]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Sheet1!A:C",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
};
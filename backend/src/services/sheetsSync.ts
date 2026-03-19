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

// ── Get or create a sheet tab for a product ───────────────────────────────────
const getOrCreateProductTab = async (
  sheets: any,
  sheetId: string,
  productName: string,
  productNumber: number
): Promise<string> => {
  const tabName = `#${productNumber} - ${productName}`.slice(0, 100);

  // Get all existing tabs
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existingSheets = spreadsheet.data.sheets.map((s: any) => s.properties.title);

  if (!existingSheets.includes(tabName)) {
    // Create the tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });

    // Add header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A1:C1`,
      valueInputOption: "RAW",
      requestBody: { values: [["key", "product", "status"]] },
    });

    // Style header row (bold + background)
    const sheetRes = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const newSheet = sheetRes.data.sheets.find((s: any) => s.properties.title === tabName);
    if (newSheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: { sheetId: newSheet.properties.sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.44, green: 0.18, blue: 1 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          }],
        },
      });
    }
  }

  return tabName;
};

// ── Sync all keys from all product tabs ───────────────────────────────────────
export const syncKeysFromSheet = async (): Promise<{ imported: number; skipped: number }> => {
  const sheets = getSheetClient();
  const sheetId = process.env.GOOGLE_SHEET_ID!;

  // Get all sheet tabs
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const allTabs = (spreadsheet.data.sheets ?? []).map((s: any) => s.properties.title) as string[];

  let imported = 0;
  let skipped = 0;

  for (const tabName of allTabs) {
    // Skip non-product tabs (must start with #)
    if (!tabName.startsWith("#")) {
      skipped++;
      continue;
    }

    console.log(`📋 Reading tab: "${tabName}"`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A2:C`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) continue;

    // Extract product name from tab name: "#1000 - Windows 11 Pro" → "Windows 11 Pro"
    const productName = tabName.replace(/^#\d+ - /, "").trim();

    for (const row of rows) {
      const key = row[0]?.toString().trim();
      const status = row[2]?.toString().trim().toLowerCase();

      if (!key || status === "sold") { skipped++; continue; }

      const existing = await prisma.licenseKey.findUnique({ where: { key } });
      if (existing) { skipped++; continue; }

      let product = await prisma.product.findFirst({
        where: { name: { equals: productName, mode: "insensitive" } },
      });

      if (!product) {
        product = await (prisma.product as any).create({
          data: { name: productName, priceInCredits: 1 },
        });
      }

      if (!product) { skipped++; continue; }
      await prisma.licenseKey.create({
        data: { key, productId: product.id, status: "UNUSED" },
      });

      console.log(`  ✓ Imported: "${key}"`);
      imported++;
    }
  }

  return { imported, skipped };
};

// ── Add keys to the product's own tab ────────────────────────────────────────
export const addKeysToSheet = async (keys: string[], productName: string): Promise<void> => {
  const sheets = getSheetClient();
  const sheetId = process.env.GOOGLE_SHEET_ID!;

  const product: any = await prisma.product.findFirst({
    where: { name: { equals: productName, mode: "insensitive" } },
  });

  const productNumber = (product as any)?.productNumber ?? 1000;
  const tabName = await getOrCreateProductTab(sheets, sheetId, productName, productNumber);

  const rows = keys.map((key) => [key, productName, "unused"]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A:C`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
};

// ── Mark a key as sold in its product tab ────────────────────────────────────
export const markKeyAsSoldInSheet = async (key: string, productName: string, productNumber: number): Promise<void> => {
  try {
    const sheets = getSheetClient();
    const sheetId = process.env.GOOGLE_SHEET_ID!;

    const tabName = `#${productNumber} - ${productName}`.slice(0, 100);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A2:C`,
    });

    const rows = response.data.values;
    if (!rows) return;

    const rowIndex = rows.findIndex((r: any) => r[0]?.toString().trim() === key);
    if (rowIndex === -1) return;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tabName}'!C${rowIndex + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [["sold"]] },
    });
  } catch (err) {
    console.error("Failed to update sheet:", err);
  }
};
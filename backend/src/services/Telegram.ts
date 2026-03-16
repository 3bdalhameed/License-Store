export const sendTelegramMessage = async (message: string): Promise<void> => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  console.log("📱 Telegram config check:");
  console.log("  Token exists:", !!token);
  console.log("  Chat ID:", chatId);

  if (!token || !chatId) {
    console.log("❌ Telegram not configured — add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    console.log("  Sending to URL:", url.replace(token, "TOKEN_HIDDEN"));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const result = await response.json() as any;
    console.log("  Telegram response:", JSON.stringify(result));

    if (!result.ok) {
      console.error("❌ Telegram API error:", result.description);
    } else {
      console.log("✅ Telegram message sent successfully");
    }
  } catch (err) {
    console.error("❌ Telegram fetch failed:", err);
  }
};
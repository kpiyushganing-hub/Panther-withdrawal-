export async function sendTelegramProof(message: string, channel: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !channel) {
    console.warn('Telegram token or channel not configured. Skipping proof message.');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: channel,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      console.error('Failed to send Telegram message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

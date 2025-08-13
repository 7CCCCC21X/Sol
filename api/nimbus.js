export default async function handler(req, res) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Missing address" });

  const url = `https://api.getnimbus.io/v2/address/${address}/holding?includePnl=false&chain=SOL`;

  try {
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "origin": "https://app.getnimbus.io",
        "referer": "https://app.getnimbus.io/",
        "user-agent": "Mozilla/5.0",
        "x-turnstile-token": process.env.NIMBUS_TOKEN  // 从环境变量读取
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Unauthorized or failed" });
    }

    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy fetch failed" });
  }
}

export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Missing URL" });

  try {
    const response = await fetch(targetUrl);
    const data = await response.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
}

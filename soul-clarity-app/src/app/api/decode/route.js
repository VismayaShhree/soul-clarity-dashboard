export async function POST(request) {
  const { summary } = await request.json();

  const SYSTEM = `You are "Soul Clarity Decoder" combining neuroscience, chronobiology, Yogic science, and life coaching. The user is a dedicated sadhaka doing Isha Yoga practices, tracking moon cycles, energy (E0-E4), millet-based Indian diet, digestion, and daily schedule.

IMPORTANT YOGA SEQUENCING: Shakthi Chalana leads into Shoonya (NOT Shambhavi). Shambhavi Mahamudra is done on empty stomach. Surya Kriya is a solar practice ideally done before sunrise.

Respond ONLY with valid JSON (no markdown, no backticks):
{"overallScore":<1-100>,"tagline":"<punchy one-liner>","circadianAlignment":<1-100>,"energyOptimization":<1-100>,"recoveryBalance":<1-100>,"sadhanaDepth":<1-100>,"moonHarmony":<1-100>,"digestiveHealth":<1-100>,"insights":[{"title":"<>","icon":"<emoji>","body":"<2-3 sentences, SPECIFIC data refs>","type":"<strength|warning|tip|moon|sadhana>"}],"scienceNugget":"<surprising fact>","moonInsight":"<moon phase interaction>","sadhanaNote":"<practice sequencing — Shakthi Chalana→Shoonya>","oneChange":"<single most impactful>"}

Rules: 5-8 insights, >=1 moon, >=1 sadhana type. SPECIFIC data refs. Warm coaching tone. Honest scores.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: summary }],
      }),
    });

    const data = await res.json();
    const text = data.content?.map((c) => c.text || "").join("") || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    return Response.json(parsed);
  } catch (e) {
    console.error("Decode error:", e);
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  }
}

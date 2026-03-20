const { GoogleGenerativeAI } = require("@google/generative-ai");

const PRICE_LIST = {
  "Normal Makine Halısı": 100,
  "Shaggy Halı": 130,
  "Step Shaggy Halı": 240,
  "Akrilik Halı": 130,
  "Bambu Halı": 250,
  "Yün Halı": 240,
  "El Dokuma Halı": 240,
};

const VALID_TYPES = Object.keys(PRICE_LIST);

const SYSTEM_PROMPT = `Sen bir halı uzmanısın. Sana gönderilen fotoğrafları analiz ederek halının türünü tespit edeceksin.

Analiz yaparken şu kriterlere dikkat et:
- Halının arka yüzündeki ilmek yapısı (makine mi, el dokuması mı?)
- Tüy/hav yapısı ve uzunluğu (shaggy mı, normal mi, step shaggy mı?)
- Malzeme parlaklığı ve dokusu (yün mü, akrilik mi, bambu mu?)
- Etiket bilgisi varsa oku ve değerlendir (OCR)
- Desen karakteri ve kenar yapısı (saçak, overlok)

Halıyı şu kategorilerden BİRİNE sınıflandır:
${VALID_TYPES.map((t) => `- ${t}`).join("\n")}

Eğer etiket fotoğrafı yoksa, kararı halının arka ilmek yapısından ve tüy dokusundan ver.
Şüpheli durumlarda en yakın tahmini yap ve güven skorunu düşük tut.

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir şey yazma:
{
  "carpetType": "Kategorilerden biri",
  "confidence": 0-100 arası sayı,
  "description": "Türkçe 1-2 cümle açıklama"
}`;

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { images, brand } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res
        .status(400)
        .json({ error: "En az 1 fotoğraf gereklidir." });
    }

    if (images.length > 4) {
      return res
        .status(400)
        .json({ error: "En fazla 4 fotoğraf gönderilebilir." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const imageParts = images.map((img, i) => {
      const labels = [
        "Genel görünüm (uzaktan)",
        "Yakın çekim (doku)",
        "Arka yüz (ilmek yapısı)",
        "Etiket",
      ];
      const base64Data = img.data.replace(/^data:image\/\w+;base64,/, "");
      return {
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: base64Data,
        },
      };
    });

    const imageDescriptions = images
      .map((_, i) => {
        const labels = [
          "Genel görünüm (uzaktan)",
          "Yakın çekim (doku)",
          "Arka yüz (ilmek yapısı)",
          "Etiket",
        ];
        return `Fotoğraf ${i + 1}: ${labels[i] || "Ek fotoğraf"}`;
      })
      .join("\n");

    let userPrompt = `Aşağıdaki halı fotoğraflarını analiz et:\n${imageDescriptions}`;
    if (brand) {
      userPrompt += `\n\nMüşterinin belirttiği marka/model bilgisi: ${brand}`;
    }

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      ...imageParts,
      userPrompt,
    ]);

    const responseText = result.response.text();

    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(500).json({
        error: "AI yanıtı işlenemedi. Lütfen tekrar deneyin.",
      });
    }

    const { carpetType, confidence, description } = parsed;

    if (!VALID_TYPES.includes(carpetType)) {
      return res.status(200).json({
        success: true,
        result: {
          carpetType: "Belirsiz",
          confidence: Math.min(confidence || 30, 50),
          pricePerM2: null,
          description:
            description || "Halı türü net olarak belirlenemedi.",
          needsExpert: true,
        },
      });
    }

    const needsExpert = confidence < 60;

    return res.status(200).json({
      success: true,
      result: {
        carpetType,
        confidence,
        pricePerM2: needsExpert ? null : PRICE_LIST[carpetType],
        description,
        needsExpert,
      },
    });
  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({
      error: "Bir hata oluştu. Lütfen tekrar deneyin.",
    });
  }
};

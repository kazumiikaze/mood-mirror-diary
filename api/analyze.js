// api/analyze.js — Vercel Serverless Function
// รับ diary data จาก frontend แล้วส่งต่อไป Groq API
// API Key เก็บใน Environment Variable ฝั่ง server ไม่โผล่ใน browser

export const config = {
  runtime: 'edge', // ใช้ Edge Runtime เร็วกว่า Node runtime
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function buildPrompt({ mood, energy, diaryText, reflections = [], onboarding = {} }) {
  const reflectionText = reflections
    .map((r, i) => `คำถาม ${i + 1}: ${r.question}\nคำตอบ: ${r.answer}`)
    .join('\n\n');

  const goal = onboarding?.goal || 'ดูแลใจตัวเองให้ดีขึ้น';
  const issue = onboarding?.issue || 'สิ่งที่กำลังเผชิญอยู่';
  const tone = onboarding?.tone || 'อบอุ่นและตรงไปตรงมา';

  return `คุณคือนักจิตวิทยาคลินิกที่เชี่ยวชาญการประเมินสุขภาพจิต วิเคราะห์ข้อมูลต่อไปนี้และตอบกลับเป็น JSON เท่านั้น ห้ามมี text นอก JSON

ข้อมูลผู้ใช้:
- อารมณ์ที่เลือก: ${mood}
- พลังงาน: ${energy}/10
- เป้าหมายใช้แอป: ${goal}
- ปัญหาที่เผชิญ: ${issue}
- สไตล์คำแนะนำ: ${tone}

Diary วันนี้:
${diaryText}

คำตอบ AI Reflection:
${reflectionText}

====== เกณฑ์มาตรฐานที่ต้องยึดอย่างเคร่งครัด ======

[1] STRESS SCORE (0–100) — อิงจาก PSS (Perceived Stress Scale)
- 0–20   = ผ่อนคลายมาก (PSS ≤7) ไม่มีสัญญาณกดดัน รู้สึกควบคุมชีวิตได้ดี
- 21–40  = เครียดเล็กน้อย (PSS 8–13) มีความกังวลบ้าง แต่จัดการได้
- 41–60  = เครียดปานกลาง (PSS 14–18) รู้สึกกดดัน มีเหตุการณ์ที่ควบคุมไม่ได้
- 61–80  = เครียดสูง (PSS 19–25) หนักใจ รู้สึกรับมือได้ไม่ดี
- 81–100 = เครียดวิกฤต (PSS 26–40) หมดแรง หมดหวัง ควบคุมอะไรไม่ได้เลย
สัญญาณเพิ่ม score: ควบคุมไม่ได้, deadline, ขัดแย้ง, กลัวอนาคต, ร้องไห้, นอนไม่หลับ
สัญญาณลด score: พักผ่อน, ได้รับการสนับสนุน, ทำสิ่งที่ชอบ, มีแผน

[2] SENTIMENT SCORE (-100 ถึง +100) — อิงจาก Valence-Arousal Model
- +61 ถึง +100 = เชิงบวกมาก (มีความสุข ตื่นเต้น สดใส)
- +21 ถึง +60  = เชิงบวก (โดยรวมดี มีความหวัง)
- -20 ถึง +20  = กลาง (ผสม หรือไม่ชัดเจน)
- -21 ถึง -60  = เชิงลบ (เหนื่อย หดหู่ กังวล)
- -61 ถึง -100 = เชิงลบมาก (สิ้นหวัง เศร้าหนัก โกรธรุนแรง)

[3] EMOTION CLASSIFICATION (%) — อิงจาก Paul Ekman's Basic Emotions
อารมณ์ที่ใช้ได้: สุข / สงบ / กังวล / เครียด / เศร้า / โกรธ / เหงา / หมดแรง / ผิดหวัง / หวัง / ภูมิใจ / กลัว
- ประเมินจาก % ของสัญญาณในข้อความ ไม่ใช่ความถี่คำ
- รวมกันต้องได้ 100% เสมอ

[4] BURNOUT RISK — อิงจาก Maslach Burnout Inventory (MBI) 3 มิติ
risk = true เมื่อพบสัญญาณอย่างน้อย 2 ใน 3 มิติ:
- Exhaustion: "หมดแรง" "ไม่อยากทำอะไร" "เหนื่อยมาก" หรือพลังงาน ≤3/10
- Cynicism: "ไม่เห็นประโยชน์" "ทำไปก็เท่านั้น" "ไม่สนใจแล้ว"
- Inefficacy: "ทำได้ไม่ดี" "ไม่มีความสามารถ" "ล้มเหลว"

[5] TRIGGER DETECTION
domain: งาน / การเรียน / ความสัมพันธ์ / สุขภาพ / การเงิน / ครอบครัว / อนาคต / ตัวเอง
- percent รวมกันได้ 100%
- ถ้าไม่มี trigger จริงๆ label = "ยังไม่พบ trigger เครียดชัดเจน" percent = 100

====== JSON Output ======

{
  "emotionClassification": [
    {
      "label": "ชื่ออารมณ์",
      "percent": 0,
      "reason": "อธิบายโดยอิงสัญญาณจากข้อความ",
      "evidence": ["ประโยคจาก diary"]
    }
  ],
  "triggers": [
    {
      "label": "domain ที่เป็น trigger",
      "percent": 0,
      "reason": "อธิบายสั้นๆ",
      "evidence": ["ประโยคที่สนับสนุน"]
    }
  ],
  "stressScore": 0,
  "stressLevel": "ผ่อนคลาย/เครียดเล็กน้อย/เครียดปานกลาง/เครียดสูง/เครียดวิกฤต",
  "pssEquivalent": "PSS ประมาณ X — อธิบายสั้นๆ",
  "sentimentScore": 0,
  "sentimentLabel": "เชิงบวกมาก/เชิงบวก/กลาง/เชิงลบ/เชิงลบมาก",
  "primaryEmotion": "อารมณ์หลักของวันนี้",
  "mentalSummary": "สรุปภาพรวมสุขภาพใจ 2-3 ประโยค อิงเกณฑ์ที่ใช้",
  "smartResponse": [
    "คำแนะนำที่สอดคล้องกับระดับ stressLevel",
    "คำแนะนำข้อ 2",
    "คำแนะนำข้อ 3"
  ],
  "aiInsight": "insight ที่อิงเกณฑ์จิตวิทยา 1 ประโยค",
  "burnout": {
    "risk": false,
    "dimensions": { "exhaustion": false, "cynicism": false, "inefficacy": false },
    "message": "ระบุมิติที่พบสัญญาณ หรือ 'ไม่พบสัญญาณ burnout ในวันนี้'"
  },
  "protectiveActions": [
    { "text": "วิธีดูแลตัวเองที่ผู้ใช้บอกในข้อความ" }
  ],
  "safeMode": false,
  "crisisMatches": [],
  "emotionSummary": "สรุปอารมณ์หลักสั้นๆ",
  "triggerSummary": "สรุป trigger หลักสั้นๆ"
}

====== กฎสำคัญ ======
1. ยึดเกณฑ์มาตรฐานข้างต้นเสมอ ห้ามประเมินตามความรู้สึก
2. วิเคราะห์ความหมายประโยค ไม่จับคำเดี่ยว เช่น "ทำงานชิวๆ" ≠ เครียด
3. emotionClassification percent รวมกันต้องได้ 100 เสมอ
4. พบคำเสี่ยง เช่น "อยากตาย" "ฆ่าตัวตาย" → safeMode: true และใส่ใน crisisMatches
5. คำตอบดูแลตัวเองใส่ใน protectiveActions ไม่ใช่ triggers
6. smartResponse ต้องสอดคล้องกับระดับ stressLevel ไม่ใช่คำแนะนำทั่วไป`;
}

export default async function handler(req) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const prompt = buildPrompt(body);

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: 'json_object' }, // บังคับให้ตอบ JSON เท่านั้น
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return new Response(JSON.stringify({ error: `Groq API error: ${errText}` }), {
        status: groqRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content || '{}';

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse AI response as JSON', raw: content }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // เพิ่ม field ที่ frontend ต้องการ
    analysis.engineVersion = `Groq ${MODEL}`;
    if (!analysis.weeklyReport) analysis.weeklyReport = '';

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
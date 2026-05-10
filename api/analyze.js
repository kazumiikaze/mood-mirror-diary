
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

  return `คุณคือนักจิตวิทยาที่เชี่ยวชาญการวิเคราะห์อารมณ์และสุขภาพใจ วิเคราะห์ข้อมูลต่อไปนี้และตอบกลับเป็น JSON เท่านั้น ห้ามมี text นอก JSON

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

วิเคราะห์และตอบเป็น JSON format นี้ (ภาษาไทยทั้งหมด):
{
  "emotionClassification": [
    {
      "label": "ชื่ออารมณ์ เช่น สุข/สงบ/เครียด/กังวล/หมดแรง/เศร้า/โกรธ/เหงา",
      "percent": 0,
      "reason": "อธิบายสั้นๆ ว่าทำไมถึงวิเคราะห์แบบนี้",
      "evidence": ["ประโยคจาก diary ที่สนับสนุน"]
    }
  ],
  "triggers": [
    {
      "label": "สาเหตุความเครียด หรือ 'ยังไม่พบ trigger เครียดชัดเจน'",
      "percent": 0,
      "reason": "อธิบายสั้นๆ",
      "evidence": ["ประโยคที่สนับสนุน"]
    }
  ],
  "stressScore": 0,
  "stressLevel": "ต่ำ/ปานกลาง/สูง/สูงมาก",
  "sentimentScore": 0,
  "sentimentLabel": "ค่อนข้างบวก/กลางๆ/ค่อนข้างลบ",
  "mentalSummary": "สรุปภาพรวมสุขภาพใจวันนี้ 2-3 ประโยค",
  "smartResponse": [
    "คำแนะนำข้อ 1",
    "คำแนะนำข้อ 2",
    "คำแนะนำข้อ 3"
  ],
  "aiInsight": "insight สั้นๆ ที่น่าสนใจ 1 ประโยค",
  "burnout": {
    "risk": false,
    "message": "ข้อความถ้ามีความเสี่ยง burnout"
  },
  "protectiveActions": [
    { "text": "วิธีดูแลตัวเองที่ผู้ใช้บอก" }
  ],
  "safeMode": false,
  "crisisMatches": [],
  "emotionSummary": "สรุปอารมณ์สั้นๆ",
  "triggerSummary": "สรุป trigger สั้นๆ"
}

กฎสำคัญ:
1. stressScore: 0-100, sentimentScore: -100 ถึง 100
2. emotionClassification percent รวมกันได้ 100
3. ถ้าพบคำเสี่ยง เช่น "อยากตาย" "ฆ่าตัวตาย" ให้ตั้ง safeMode: true และใส่คำนั้นใน crisisMatches
4. วิเคราะห์ "ความหมายของประโยค" ไม่ใช่จับคำเดี่ยว เช่น "ทำงานโปรเจคชิวๆ" = สงบ ไม่ใช่เครียด
5. คำตอบเรื่องการดูแลตัวเองให้ใส่ใน protectiveActions ไม่ใช่ triggers`;
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
        temperature: 0.3,
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

    analysis.stressScore = analysis.stressScore ?? analysis.stress_score ?? 0;
    analysis.sentimentScore = analysis.sentimentScore ?? analysis.sentiment_score ?? 0;
    analysis.stressLevel = analysis.stressLevel ?? analysis.stress_level ?? 'ไม่ทราบ';
    analysis.sentimentLabel = analysis.sentimentLabel ?? analysis.sentiment_label ?? 'ไม่ทราบ';
    analysis.emotionSummary = analysis.emotionSummary ?? analysis.emotion_summary ?? '';
    analysis.triggerSummary = analysis.triggerSummary ?? analysis.trigger_summary ?? '';
    analysis.mentalSummary = analysis.mentalSummary ?? analysis.mental_summary ?? '';
    analysis.smartResponse = analysis.smartResponse ?? analysis.smart_response ?? [];
    analysis.aiInsight = analysis.aiInsight ?? analysis.ai_insight ?? '';
    analysis.burnout = analysis.burnout ?? { risk: false, message: '' };
    analysis.protectiveActions = analysis.protectiveActions ?? analysis.protective_actions ?? [];
    analysis.emotionClassification = analysis.emotionClassification ?? analysis.emotion_classification ?? [];
    analysis.triggers = analysis.triggers ?? [];

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

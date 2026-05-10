// src/utils/aiGroq.js
// แทนที่ aiMock.js — เรียก /api/analyze ซึ่งเป็น Vercel Function ที่คุย Groq ให้
// Frontend ไม่เห็น API Key เลย

/**
 * วิเคราะห์ diary ผ่าน Groq API (ผ่าน Vercel serverless function)
 * @param {object} params - { mood, energy, diaryText, reflections, onboarding, history }
 * @returns {object} analysis result (format เดิมกับที่ App.jsx ใช้)
 */
export async function analyzeDiary({ mood, energy, diaryText, reflections = [], onboarding = {}, history = [] }) {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood, energy, diaryText, reflections, onboarding }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const analysis = await response.json();

    // เพิ่ม weeklyReport จาก history ฝั่ง client (ไม่ต้องส่งประวัติทั้งหมดไป Groq)
    analysis.weeklyReport = buildWeeklyReport(analysis, history);

    return { safeMode: false, ...analysis };
  } catch (err) {
    console.error('[aiGroq] Error:', err);

    // Fallback: ถ้า API ล้มเหลว return error state ให้ UI แสดงแทน crash
    return {
      safeMode: false,
      engineVersion: 'Groq (offline fallback)',
      error: err.message,
      emotionClassification: [{ label: 'ไม่สามารถวิเคราะห์ได้', percent: 100, reason: `เกิดข้อผิดพลาด: ${err.message}`, evidence: [] }],
      triggers: [{ label: 'ยังไม่พบ trigger เครียดชัดเจน', percent: 100, reason: 'API ไม่พร้อมใช้งาน', evidence: [] }],
      stressScore: 0,
      stressLevel: 'ไม่ทราบ',
      sentimentScore: 0,
      sentimentLabel: 'ไม่ทราบ',
      mentalSummary: 'ไม่สามารถวิเคราะห์ได้ในขณะนี้ กรุณาลองอีกครั้ง',
      smartResponse: ['เกิดข้อผิดพลาดในการเชื่อมต่อ AI กรุณาตรวจสอบ GROQ_API_KEY และลองใหม่อีกครั้ง'],
      aiInsight: 'ไม่สามารถสร้าง insight ได้',
      burnout: { risk: false, message: '' },
      protectiveActions: [],
      emotionSummary: 'ไม่ทราบ',
      triggerSummary: 'ไม่ทราบ',
      weeklyReport: '',
    };
  }
}

/**
 * สร้าง weekly report จาก history ฝั่ง client
 * (ไม่ต้องส่ง history ทั้งหมดไปให้ Groq ประหยัด token)
 */
function buildWeeklyReport(todayAnalysis, history = []) {
  const recent = history.slice(0, 6); // 6 วันก่อนหน้า + วันนี้ = 7 วัน
  if (recent.length < 2) return 'ยังมีข้อมูลไม่พอสำหรับสรุปรายสัปดาห์ เริ่มเขียนต่ออีก 2–3 วัน ระบบจะเห็น pattern ได้ชัดขึ้น';

  const allEntries = [{ analysis: todayAnalysis, energy: todayAnalysis.energy }, ...recent];
  const avgStress = Math.round(allEntries.reduce((sum, item) => sum + Number(item.analysis?.stressScore || 0), 0) / allEntries.length);
  const avgEnergy = (allEntries.reduce((sum, item) => sum + Number(item.energy || 0), 0) / allEntries.length).toFixed(1);

  const topTriggers = {};
  allEntries.forEach((item) => {
    const label = item.analysis?.triggers?.[0]?.label;
    if (label && !label.includes('ยังไม่พบ')) topTriggers[label] = (topTriggers[label] || 0) + 1;
  });
  const topTrigger = Object.entries(topTriggers).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ยังไม่พบ trigger ที่ซ้ำชัดเจน';

  return `ช่วง 7 วันที่ผ่านมา ค่าเฉลี่ยความเครียดอยู่ที่ ${avgStress}/100 และพลังงานเฉลี่ย ${avgEnergy}/10 โดย trigger ที่พบซ้ำบ่อยที่สุดคือ "${topTrigger}"`;
}

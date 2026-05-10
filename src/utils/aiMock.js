// Sentence-aware mock AI for local demo only.
// Goal: analyze the overall meaning of each sentence, not only isolated keywords.
// Important behavior:
// - “วันนี้ทำงานโปรเจค ชิวๆสบายๆ” = work/project context with positive calm tone, NOT work anxiety.
// - “พักผ่อน นอน คุยกับแฟน” in self-care answer = coping/protective plan, NOT evidence that the day was restful.
// - No single-character/unsafe matching such as treating “อยาก” as “ยา”.

const moodToEmotion = {
  'สดใส': 'สุข',
  'เฉยๆ': 'สงบ',
  'เหนื่อย': 'หมดแรง',
  'เศร้า': 'เศร้า',
  'เครียด': 'เครียด',
  'กังวล': 'กังวล',
  'โกรธ': 'โกรธ'
};

const crisisKeywords = [
  'อยากตาย', 'ฆ่าตัวตาย', 'ไม่อยากอยู่', 'อยากหายไป', 'ไม่มีค่า', 'ทำร้ายตัวเอง',
  'จบชีวิต', 'อยู่ไปก็ไม่มีประโยชน์', 'หายไปจากโลก', 'ไม่อยากตื่น', 'ไม่อยากมีชีวิต'
];

const emotionPatterns = {
  'สุข': [
    ['มีความสุข', 5], ['ดีใจ', 4], ['ภูมิใจ', 4], ['สนุก', 3], ['ยิ้ม', 3], ['สำเร็จ', 4],
    ['โอเค', 2], ['ดีขึ้น', 3], ['โล่ง', 4], ['สบายใจ', 5], ['ขอบคุณ', 2], ['แฮปปี้', 4]
  ],
  'สงบ': [
    ['ชิว', 5], ['ชิล', 5], ['สบายๆ', 5], ['สบาย ๆ', 5], ['สบาย', 3], ['เรื่อยๆ', 3], ['เรื่อย ๆ', 3],
    ['ปกติ', 2], ['นิ่ง', 2], ['ผ่อนคลาย', 4], ['ไม่เครียด', 5], ['ไม่กังวล', 5], ['ควบคุมได้', 3]
  ],
  'เครียด': [
    ['เครียด', 5], ['กดดัน', 5], ['deadline', 5], ['เดดไลน์', 5], ['งานเยอะ', 5], ['ภาระ', 3],
    ['ไม่ทัน', 5], ['ทำไม่ทัน', 5], ['เร่ง', 3], ['หนักมาก', 5], ['หัวหมุน', 4], ['รับมือไม่ไหว', 6]
  ],
  'กังวล': [
    ['กังวล', 5], ['กลัว', 4], ['คิดมาก', 5], ['ไม่มั่นใจ', 4], ['ไม่แน่ใจ', 3], ['หวั่น', 3],
    ['กลัวพลาด', 5], ['ไม่รู้จะทำยังไง', 6], ['อนาคต', 2], ['ลังเล', 3]
  ],
  'หมดแรง': [
    ['เหนื่อย', 5], ['หมดแรง', 6], ['หมดไฟ', 6], ['ไม่ไหว', 6], ['ล้า', 4], ['เพลีย', 4],
    ['ไม่มีแรง', 6], ['นอนไม่พอ', 6], ['พักไม่พอ', 6], ['นอนดึก', 4], ['อยากพัก', 3]
  ],
  'เศร้า': [
    ['เศร้า', 5], ['เสียใจ', 5], ['ร้องไห้', 6], ['ท้อ', 5], ['ผิดหวัง', 4], ['น้อยใจ', 4],
    ['ว่างเปล่า', 5], ['ไม่โอเค', 4], ['แย่', 3], ['ใจหาย', 3]
  ],
  'โกรธ': [
    ['โกรธ', 5], ['โมโห', 5], ['หงุดหงิด', 5], ['รำคาญ', 3], ['ไม่พอใจ', 4], ['ไม่แฟร์', 4],
    ['ทะเลาะ', 4], ['โดนว่า', 4], ['อึดอัด', 3]
  ],
  'เหงา': [
    ['เหงา', 5], ['โดดเดี่ยว', 6], ['คนเดียว', 3], ['ไม่มีใคร', 5], ['ไม่มีคนเข้าใจ', 5],
    ['ไม่ถูกรับฟัง', 5], ['คิดถึง', 2]
  ]
};

const positiveToneTerms = [
  'ชิว', 'ชิล', 'สบายๆ', 'สบาย ๆ', 'สบายใจ', 'สบาย', 'โอเค', 'ดีขึ้น', 'โล่ง', 'สนุก', 'มีความสุข',
  'ดีใจ', 'ภูมิใจ', 'สำเร็จ', 'ไม่เครียด', 'ไม่กังวล', 'ไม่เหนื่อย', 'ควบคุมได้', 'ผ่านไปได้', 'ราบรื่น', 'แฮปปี้'
];

const negativeToneTerms = [
  'เครียด', 'กังวล', 'กดดัน', 'เหนื่อย', 'หมดแรง', 'หมดไฟ', 'ไม่ไหว', 'นอนไม่พอ', 'พักไม่พอ',
  'ไม่ทัน', 'ทำไม่ทัน', 'กลัว', 'คิดมาก', 'เสียใจ', 'เศร้า', 'ร้องไห้', 'ท้อ', 'โกรธ', 'โมโห',
  'หงุดหงิด', 'ทะเลาะ', 'เงินไม่พอ', 'หนี้', 'ป่วย', 'เจ็บ', 'ปวด', 'แย่', 'หนักมาก', 'รับมือไม่ไหว'
];

const negationPhrases = ['ไม่', 'ไม่ได้', 'ไม่ค่อย', 'ไม่ต้อง', 'ไม่รู้สึก', 'ไม่ได้รู้สึก'];
const intensifiers = ['มาก', 'สุด', 'โคตร', 'หนัก', 'สุดๆ', 'สุด ๆ', 'จริงๆ', 'จริง ๆ'];

const copingTerms = [
  'พัก', 'พักผ่อน', 'นอน', 'คุยกับแฟน', 'คุยกับเพื่อน', 'คุยกับครอบครัว', 'อาบน้ำ', 'เดินเล่น',
  'ฟังเพลง', 'เขียน', 'ทำสมาธิ', 'หายใจ', 'กินข้าว', 'ออกกำลังกาย', 'ดูหนัง', 'เล่นเกม', 'อ่านหนังสือ',
  'วางแผน', 'แบ่งงาน', 'คุยกับคนไว้ใจ'
];

const domainRules = {
  'งาน': {
    terms: ['งาน', 'deadline', 'เดดไลน์', 'หัวหน้า', 'ประชุม', 'โปรเจค', 'project', 'ลูกค้า', 'task', 'ส่งงาน', 'โอที', 'แก้งาน'],
    negativeCombos: ['งานเยอะ', 'ส่งงานไม่ทัน', 'เดดไลน์ใกล้', 'deadline ใกล้', 'แก้งานเยอะ', 'โดนเร่งงาน', 'ประชุมหนัก'],
    stressTerms: ['เครียด', 'กดดัน', 'ไม่ทัน', 'ทำไม่ทัน', 'เร่ง', 'หนัก', 'หัวหมุน', 'deadline', 'เดดไลน์', 'ภาระ', 'โอที']
  },
  'การเรียน': {
    terms: ['เรียน', 'สอบ', 'การบ้าน', 'รายงาน', 'อาจารย์', 'เกรด', 'โปรเจคจบ', 'สหกิจ', 'ฝึกงาน', 'มหาลัย'],
    negativeCombos: ['สอบไม่ทัน', 'อ่านไม่ทัน', 'กลัวตก', 'เกรดตก', 'รายงานไม่เสร็จ', 'ส่งไม่ทัน'],
    stressTerms: ['เครียด', 'กดดัน', 'ไม่ทัน', 'กลัวตก', 'กลัว', 'สอบ', 'เดดไลน์', 'deadline', 'ไม่เสร็จ']
  },
  'การพักผ่อน': {
    terms: ['นอนไม่พอ', 'พักไม่พอ', 'นอนดึก', 'ตื่นกลางดึก', 'ตื่นมาเหนื่อย', 'นอนไม่หลับ', 'ล้า', 'เพลีย', 'ไม่มีแรง'],
    negativeCombos: ['นอนไม่พอ', 'พักไม่พอ', 'นอนไม่หลับ', 'นอนดึก', 'ตื่นมาเหนื่อย'],
    stressTerms: ['ไม่พอ', 'ไม่ได้', 'น้อย', 'ดึก', 'ไม่หลับ', 'เหนื่อย', 'ล้า', 'เพลีย', 'ไม่มีแรง']
  },
  'ความสัมพันธ์': {
    terms: ['แฟน', 'เพื่อน', 'ครอบครัว', 'คนที่บ้าน', 'คนรัก', 'พ่อ', 'แม่', 'พี่', 'น้อง', 'ความสัมพันธ์'],
    negativeCombos: ['ทะเลาะกับแฟน', 'แฟนไม่เข้าใจ', 'เพื่อนไม่เข้าใจ', 'โดนเมิน', 'คุยกันไม่รู้เรื่อง', 'เข้าใจผิด', 'ห่างกัน'],
    stressTerms: ['ทะเลาะ', 'ไม่เข้าใจ', 'เมิน', 'เสียใจ', 'น้อยใจ', 'อึดอัด', 'โกรธ', 'ผิดหวัง', 'ห่าง']
  },
  'เงิน': {
    terms: ['เงิน', 'ค่าใช้จ่าย', 'หนี้', 'รายจ่าย', 'ค่าเช่า', 'ค่ากิน', 'ค่ารถ', 'บิล'],
    negativeCombos: ['เงินไม่พอ', 'ไม่พอใช้', 'หนี้เยอะ', 'ค่าใช้จ่ายเยอะ', 'รายจ่ายเยอะ'],
    stressTerms: ['ไม่พอ', 'หนี้', 'แพง', 'กังวล', 'เครียด', 'จ่าย', 'ขาด', 'เยอะ']
  },
  'สุขภาพ': {
    terms: ['ป่วย', 'เจ็บ', 'ปวด', 'สุขภาพ', 'ไม่สบาย', 'โรงพยาบาล', 'หมอ', 'กินยา', 'ทานยา', 'ยาแก้'],
    negativeCombos: ['ไม่สบาย', 'ปวดหัว', 'เจ็บคอ', 'ป่วยหนัก', 'ต้องไปโรงพยาบาล'],
    stressTerms: ['ปวด', 'เจ็บ', 'ไม่สบาย', 'กังวล', 'เหนื่อย', 'กลัว', 'แย่', 'ป่วย']
  },
  'อนาคต/ความไม่แน่นอน': {
    terms: ['อนาคต', 'ไม่แน่นอน', 'ทางเลือก', 'ตัดสินใจ', 'เป้าหมาย', 'ต่อไป', 'หลังจากนี้'],
    negativeCombos: ['ไม่รู้จะทำยังไง', 'กลัวพลาด', 'ไม่รู้จะเลือก', 'อนาคตไม่แน่นอน'],
    stressTerms: ['กลัว', 'กังวล', 'ไม่รู้', 'ลังเล', 'พลาด', 'ไม่แน่นอน', 'ไม่มั่นใจ']
  }
};

function normalize(text = '') {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

function truncate(text, limit = 110) {
  const value = String(text || '').trim();
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function sentenceId(text, source, index) {
  return `${source}-${index}-${normalize(text).slice(0, 24)}`;
}

function splitSentences(text = '') {
  const firstPass = String(text)
    .replace(/([.!?。！？])/g, '$1\n')
    .split(/[\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const segments = [];
  firstPass.forEach((line) => {
    if (line.length <= 90) {
      segments.push(line);
      return;
    }
    // Split long Thai diary text on discourse markers, while preserving readable chunks.
    const parts = line
      .replace(/(\sแต่\s|\sเพราะ\s|\sเลย\s|\sทำให้\s|\sจน\s|\sแล้ว\s|\sส่วน\s|\sพอ\s)/g, '\n$1')
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
    segments.push(...(parts.length ? parts : [line]));
  });

  return segments.slice(0, 60);
}

function sourceLabel(source) {
  if (source === 'diary') return 'Diary';
  if (source === 'reflection-event') return 'AI Reflection: เหตุการณ์';
  if (source === 'reflection-body') return 'AI Reflection: ความรู้สึก/ร่างกาย';
  if (source === 'reflection-control') return 'AI Reflection: สิ่งที่ควบคุมได้';
  if (source === 'reflection-care') return 'AI Reflection: แผนดูแลตัวเอง';
  return 'ข้อความ';
}

function hasTerm(sentence, term) {
  const s = normalize(sentence);
  const t = normalize(term);
  if (!t) return false;
  if (/^[a-z0-9 ]+$/i.test(t)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegex(t)}([^a-z0-9]|$)`, 'i').test(s);
  }
  return s.includes(t);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findTerms(sentence, terms) {
  return terms.filter((term) => hasTerm(sentence, Array.isArray(term) ? term[0] : term));
}

function isNegated(sentence, term) {
  const s = normalize(sentence);
  const t = normalize(term);
  if (!t || t.startsWith('ไม่')) return false;
  const index = s.indexOf(t);
  if (index < 0) return false;
  const before = s.slice(Math.max(0, index - 11), index);
  return negationPhrases.some((neg) => before.endsWith(neg) || before.includes(`${neg} `));
}

function hasIntensifier(sentence) {
  return intensifiers.some((term) => hasTerm(sentence, term));
}

function toneOfSentence(text) {
  const sentence = normalize(text);
  let positive = 0;
  let negative = 0;
  const positiveHits = [];
  const negativeHits = [];

  positiveToneTerms.forEach((term) => {
    if (hasTerm(sentence, term)) {
      positive += term.startsWith('ไม่') ? 4 : 3;
      positiveHits.push(term);
    }
  });

  negativeToneTerms.forEach((term) => {
    if (!hasTerm(sentence, term)) return;
    if (isNegated(sentence, term)) {
      positive += 3;
      positiveHits.push(`ไม่${term}`);
      return;
    }
    negative += 3;
    negativeHits.push(term);
  });

  if (hasIntensifier(sentence)) {
    if (negative > positive) negative += 1.5;
    if (positive > negative) positive += 1;
  }

  let tone = 'neutral';
  if (positive - negative >= 2) tone = 'positive';
  else if (negative - positive >= 2) tone = 'negative';
  else if (positive > 0 && negative > 0) tone = 'mixed';

  return { tone, positive, negative, positiveHits: [...new Set(positiveHits)], negativeHits: [...new Set(negativeHits)] };
}

function buildContext(diaryText = '', reflections = []) {
  const records = [];
  const pushSentences = (text, source, baseWeight, question = '') => {
    splitSentences(text).forEach((sentence, index) => {
      const tone = toneOfSentence(sentence);
      records.push({
        id: sentenceId(sentence, source, index),
        text: sentence,
        source,
        question,
        baseWeight,
        tone: tone.tone,
        positive: tone.positive,
        negative: tone.negative,
        positiveHits: tone.positiveHits,
        negativeHits: tone.negativeHits
      });
    });
  };

  pushSentences(diaryText, 'diary', 1.25);
  reflections.forEach((item, index) => {
    const answer = item?.answer || '';
    const question = item?.question || '';
    if (!answer.trim()) return;
    if (index === 0) pushSentences(answer, 'reflection-event', 0.95, question);
    else if (index === 1) pushSentences(answer, 'reflection-body', 0.95, question);
    else if (index === 2) pushSentences(answer, 'reflection-control', 0.55, question);
    else pushSentences(answer, 'reflection-care', 0.18, question);
  });

  const analysisSentences = records.filter((record) => record.source !== 'reflection-care');
  const careSentences = records.filter((record) => record.source === 'reflection-care' || record.source === 'reflection-control');
  const allText = [diaryText, ...reflections.map((item) => `${item?.question || ''} ${item?.answer || ''}`)].join('\n');
  return { records, analysisSentences, careSentences, allText };
}

function evidence(record) {
  return `${sourceLabel(record.source)}: ${truncate(record.text, 120)}`;
}

function uniqEvidence(records, limit = 3) {
  const seen = new Set();
  const output = [];
  records.forEach((record) => {
    const key = `${record.source}:${normalize(record.text)}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(evidence(record));
  });
  return output.slice(0, limit);
}

function detectProtectiveActions(careSentences) {
  const actions = [];
  careSentences.forEach((record) => {
    const matched = copingTerms.filter((term) => hasTerm(record.text, term));
    const positivePlan = record.source === 'reflection-care' || record.tone === 'positive' || matched.length > 0;
    if (positivePlan && (matched.length || record.text.length > 4)) {
      actions.push({ text: record.text, matched, source: record.source, evidence: evidence(record) });
    }
  });
  return actions.slice(0, 5);
}

function sentenceEmotionScores(context) {
  const rows = [];

  context.analysisSentences.forEach((record) => {
    const scoreMap = {};
    Object.entries(emotionPatterns).forEach(([emotion, patterns]) => {
      patterns.forEach(([term, weight]) => {
        if (!hasTerm(record.text, term)) return;
        if (isNegated(record.text, term) && !term.startsWith('ไม่')) return;

        let score = weight * record.baseWeight;
        // Sentence-level tone correction: positive sentence should not become negative just because it contains work/project/etc.
        if (['เครียด', 'กังวล', 'หมดแรง', 'เศร้า', 'โกรธ', 'เหงา'].includes(emotion)) {
          if (record.tone === 'positive') score *= 0.18;
          if (record.tone === 'neutral' && !record.negativeHits.length) score *= 0.65;
          if (record.tone === 'negative') score *= 1.15;
        }
        if (['สุข', 'สงบ'].includes(emotion)) {
          if (record.tone === 'positive') score *= 1.25;
          if (record.tone === 'negative') score *= 0.55;
        }

        if (score > 0.35) {
          scoreMap[emotion] = (scoreMap[emotion] || 0) + score;
        }
      });
    });

    // If no exact emotion term exists but whole sentence tone is clearly positive/negative, infer softly from sentence meaning.
    if (Object.keys(scoreMap).length === 0) {
      if (record.tone === 'positive') scoreMap['สงบ'] = Math.max(scoreMap['สงบ'] || 0, 2.4 * record.baseWeight);
      if (record.tone === 'negative') scoreMap['เครียด'] = Math.max(scoreMap['เครียด'] || 0, 1.8 * record.baseWeight);
    }

    Object.entries(scoreMap).forEach(([emotion, score]) => {
      if (score > 0.35) rows.push({ emotion, score, record });
    });
  });

  return rows;
}

function aggregateEmotions(context, selectedMood, energy, protectiveActions) {
  const rows = sentenceEmotionScores(context);
  const grouped = {};

  rows.forEach((row) => {
    if (!grouped[row.emotion]) grouped[row.emotion] = { label: row.emotion, score: 0, records: [], keywords: new Set() };
    grouped[row.emotion].score += row.score;
    grouped[row.emotion].records.push(row.record);
    const patterns = emotionPatterns[row.emotion] || [];
    patterns.forEach(([term]) => {
      if (hasTerm(row.record.text, term)) grouped[row.emotion].keywords.add(term);
    });
  });

  const moodEmotion = moodToEmotion[selectedMood] || 'สงบ';
  if (!grouped[moodEmotion]) grouped[moodEmotion] = { label: moodEmotion, score: 0, records: [], keywords: new Set() };
  grouped[moodEmotion].score += 1.8;

  if (Number(energy) <= 4) {
    if (!grouped['หมดแรง']) grouped['หมดแรง'] = { label: 'หมดแรง', score: 0, records: [], keywords: new Set() };
    grouped['หมดแรง'].score += 2.6;
  }
  if (Number(energy) >= 8 && ['สุข', 'สดใส'].includes(moodEmotion)) {
    grouped['สุข'].score += 1.4;
  }
  if (protectiveActions.length && !grouped['สงบ']) grouped['สงบ'] = { label: 'สงบ', score: 0, records: [], keywords: new Set() };
  if (protectiveActions.length) grouped['สงบ'].score += Math.min(1.6, protectiveActions.length * 0.35);

  const list = Object.values(grouped)
    .filter((item) => item.score > 0.65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!list.length) {
    return [{
      label: moodEmotion,
      score: 1,
      percent: 100,
      keywords: [],
      evidence: [`Mood Selector: ผู้ใช้เลือกอารมณ์เริ่มต้นว่า “${selectedMood || 'เฉย ๆ'}”`],
      reason: `ยังไม่พบประโยคที่มีน้ำเสียงชัดเจน จึงอิงจาก mood selector และพลังงาน ${energy}/10`
    }];
  }

  return normalizePercent(list).map((item) => {
    const records = item.records.sort((a, b) => (b.negative + b.positive) - (a.negative + a.positive));
    const keywords = [...item.keywords].slice(0, 5);
    const hasSentenceEvidence = records.length > 0;
    const reason = buildEmotionReason({ ...item, keywords, records }, selectedMood, energy, protectiveActions);
    return {
      label: item.label,
      score: item.score,
      percent: item.percent,
      keywords,
      evidence: hasSentenceEvidence ? uniqEvidence(records, 3) : [`Mood Selector: ผู้ใช้เลือกอารมณ์เริ่มต้นว่า “${selectedMood || 'เฉย ๆ'}”`],
      reason
    };
  });
}

function normalizePercent(items) {
  const total = items.reduce((sum, item) => sum + item.score, 0) || 1;
  let result = items.map((item) => ({ ...item, percent: Math.max(4, Math.round((item.score / total) * 100)) }));
  const sum = result.reduce((acc, item) => acc + item.percent, 0);
  if (sum !== 100 && result.length) {
    result[0].percent += 100 - sum;
  }
  return result;
}

function buildEmotionReason(item, selectedMood, energy, protectiveActions) {
  const evidenceText = item.records?.length
    ? 'วิเคราะห์จากน้ำเสียงของประโยคโดยรวม ไม่ใช่คำเดี่ยว'
    : 'อิงจากอารมณ์ที่ผู้ใช้เลือก';
  const keywordText = item.keywords?.length ? ` มีคำ/วลีประกอบ เช่น “${item.keywords.slice(0, 3).join('”, “')}”` : '';
  const moodText = moodToEmotion[selectedMood] === item.label ? ` และสอดคล้องกับ mood selector (${selectedMood})` : '';
  const energyText = Number(energy) <= 4 ? ` พลังงานต่ำ (${energy}/10) ช่วยยืนยันความล้า` : ` พลังงานอยู่ที่ ${energy}/10`;
  const careText = protectiveActions.length && ['สุข', 'สงบ'].includes(item.label)
    ? ' โดยคำตอบเรื่องการพัก/คุยกับคนใกล้ตัวถูกตีความเป็นแผนดูแลตัวเอง'
    : '';
  return `${evidenceText}.${keywordText}${moodText}. ${energyText}.${careText}`;
}

function detectTriggers(context) {
  const candidates = {};
  const neutralContext = [];

  context.analysisSentences.forEach((record, index, list) => {
    Object.entries(domainRules).forEach(([label, rule]) => {
      const domainHits = findTerms(record.text, rule.terms);
      const comboHits = findTerms(record.text, rule.negativeCombos);
      if (!domainHits.length && !comboHits.length) return;

      const stressHits = findTerms(record.text, rule.stressTerms).filter((term) => !isNegated(record.text, term));
      const nearbyNegative = (list[index - 1]?.tone === 'negative' && list[index - 1]?.source === record.source) ||
        (list[index + 1]?.tone === 'negative' && list[index + 1]?.source === record.source);

      const isPositiveDomainSentence = record.tone === 'positive' && !comboHits.length && !stressHits.length;
      const isTrigger = comboHits.length > 0 || stressHits.length > 0 || record.tone === 'negative' || (nearbyNegative && domainHits.length > 0);

      if (isPositiveDomainSentence || !isTrigger) {
        neutralContext.push({ label, record, domainHits });
        return;
      }

      if (!candidates[label]) candidates[label] = { label, score: 0, records: [], keywords: new Set(), neutralRecords: [] };
      let score = 2.2 * record.baseWeight;
      score += comboHits.length * 3.2;
      score += stressHits.length * 1.7;
      score += record.negative * 0.45;
      if (record.tone === 'mixed') score += 0.6;
      if (record.tone === 'positive') score *= 0.28;
      candidates[label].score += score;
      candidates[label].records.push(record);
      [...domainHits, ...comboHits, ...stressHits].forEach((term) => candidates[label].keywords.add(term));
    });
  });

  neutralContext.forEach((item) => {
    if (candidates[item.label]) candidates[item.label].neutralRecords.push(item.record);
  });

  const list = Object.values(candidates)
    .filter((item) => item.score > 0.8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!list.length) {
    const positiveWork = neutralContext.find((item) => item.label === 'งาน');
    const neutralEvidence = positiveWork ? [evidence(positiveWork.record)] : [];
    return [{
      label: 'ยังไม่พบ trigger เครียดชัดเจน',
      score: 1,
      percent: 100,
      keywords: [],
      evidence: neutralEvidence.length ? neutralEvidence : ['ยังไม่พบประโยคที่ระบุสาเหตุความเครียดชัดเจนใน Diary หรือคำตอบ Reflection ช่วงเหตุการณ์'],
      reason: neutralEvidence.length
        ? 'พบเรื่องงาน/โปรเจคเป็นบริบทของวัน แต่ประโยคนั้นมีน้ำเสียงบวกหรือสบาย จึงไม่สรุปว่าเป็นความกังวลเรื่องงาน'
        : 'ยังไม่มีประโยคที่เชื่อม “หัวข้อ/เหตุการณ์” เข้ากับความเครียดหรือความกดดันโดยตรง'
    }];
  }

  return normalizePercent(list).map((item) => {
    const keywords = [...item.keywords].slice(0, 6);
    const evidenceList = uniqEvidence(item.records, 3);
    return {
      label: item.label,
      score: item.score,
      percent: item.percent,
      keywords,
      evidence: evidenceList,
      reason: buildTriggerReason(item, keywords)
    };
  });
}

function buildTriggerReason(trigger, keywords) {
  const keywordText = keywords.length ? `พบ “${keywords.slice(0, 4).join('”, “')}”` : 'พบบริบทที่เกี่ยวข้อง';
  const positiveNote = trigger.neutralRecords?.length
    ? ' ทั้งนี้ระบบแยกประโยคบริบทเชิงบวกออกแล้ว จึงไม่นับประโยคที่พูดถึงเรื่องนี้แบบสบาย ๆ เป็น trigger'
    : '';
  return `${keywordText} ในประโยคที่มีน้ำเสียงเครียด/กดดันหรือมีคำบอกปัญหาชัดเจน.${positiveNote}`;
}

function detectCrisis(text) {
  const normalized = normalize(text);
  return crisisKeywords.filter((keyword) => normalized.includes(keyword));
}

function buildStressScore({ emotions, triggers, energy, context, protectiveActions }) {
  let score = 14;
  const topEmotion = emotions[0]?.label;
  const emotionWeights = {
    'เครียด': 21,
    'กังวล': 18,
    'หมดแรง': 19,
    'เศร้า': 17,
    'โกรธ': 15,
    'เหงา': 11,
    'สงบ': -8,
    'สุข': -10
  };
  emotions.forEach((emotion, index) => {
    score += (emotionWeights[emotion.label] || 0) * (index === 0 ? 1 : 0.45) * (emotion.percent / 100 + 0.5);
  });

  const hasRealTrigger = triggers[0]?.label && !triggers[0].label.includes('ยังไม่พบ');
  if (hasRealTrigger) score += 9;

  const negativeSentenceStrength = context.analysisSentences.reduce((sum, record) => sum + record.negative * record.baseWeight, 0);
  const positiveSentenceStrength = context.analysisSentences.reduce((sum, record) => sum + record.positive * record.baseWeight, 0);
  score += negativeSentenceStrength * 1.15;
  score -= positiveSentenceStrength * 0.7;

  if (Number(energy) <= 3) score += 18;
  else if (Number(energy) <= 5) score += 8;
  else if (Number(energy) >= 8) score -= 6;

  if (protectiveActions.length) score -= Math.min(9, protectiveActions.length * 2.2);
  if (['สุข', 'สงบ'].includes(topEmotion) && !hasRealTrigger) score -= 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildSentimentScore(emotions, stressScore, protectiveActions) {
  let score = 0;
  emotions.forEach((emotion) => {
    const weight = emotion.percent / 100;
    if (emotion.label === 'สุข') score += 48 * weight;
    if (emotion.label === 'สงบ') score += 32 * weight;
    if (['เครียด', 'กังวล', 'หมดแรง', 'เศร้า', 'โกรธ', 'เหงา'].includes(emotion.label)) score -= 38 * weight;
  });
  score -= Math.round((stressScore - 45) / 2.2);
  score += Math.min(12, protectiveActions.length * 3);
  return Math.max(-100, Math.min(100, Math.round(score)));
}

function getStressLevel(score) {
  if (score >= 80) return 'สูงมาก';
  if (score >= 60) return 'สูง';
  if (score >= 40) return 'ปานกลาง';
  return 'ต่ำ';
}

function detectBurnout({ context, energy, stressScore, history = [] }) {
  const burnoutSignals = ['เหนื่อย', 'หมดแรง', 'หมดไฟ', 'ไม่ไหว', 'เบื่อ', 'นอนไม่พอ', 'ล้า', 'พักไม่พอ', 'เพลีย'];
  const todayRecords = context.analysisSentences.filter((record) => record.tone === 'negative' && burnoutSignals.some((term) => hasTerm(record.text, term)));
  const recent = history.slice(0, 5);
  const recentRiskDays = recent.filter((entry) => Number(entry.analysis?.stressScore || 0) >= 65 || Number(entry.energy || 10) <= 4).length;
  const risk = todayRecords.length >= 2 || (Number(energy) <= 4 && stressScore >= 60) || recentRiskDays >= 3;
  let message = '';

  if (risk) {
    message = recentRiskDays >= 3
      ? 'มีสัญญาณเหนื่อยสะสมจากหลายวันย้อนหลังร่วมกับวันนี้ ควรลดภาระชั่วคราวและจัดเวลาพักแบบจริงจัง'
      : `วันนี้มีประโยคที่สื่อถึงความล้าในบริบทปัญหา เช่น “${truncate(todayRecords[0]?.text || '', 70)}” จึงควรพักก่อนเพิ่มภาระใหม่`;
  }
  return { risk, message, recentRiskDays, todayHits: todayRecords.length };
}

function buildMentalSummary({ emotions, triggers, stressScore, energy, protectiveActions }) {
  const topEmotion = emotions[0];
  const secondEmotion = emotions[1];
  const topTrigger = triggers[0];
  const level = getStressLevel(stressScore);
  const secondPart = secondEmotion ? ` มีอารมณ์รองคือ “${secondEmotion.label}” ${secondEmotion.percent}%` : '';
  const triggerPart = topTrigger?.label && !topTrigger.label.includes('ยังไม่พบ')
    ? ` สาเหตุหลักที่เห็นคือ “${topTrigger.label}” จากประโยคที่มีน้ำเสียงเชื่อมกับความเครียดโดยตรง`
    : ` ${topTrigger?.reason || 'ยังไม่พบ trigger ที่ชัดเจนจากประโยควันนี้'}`;
  const copingPart = protectiveActions.length
    ? ` ระบบพบแผนดูแลตัวเอง เช่น “${truncate(protectiveActions[0].text, 65)}” ซึ่งถูกนับเป็น protective action ไม่ใช่ trigger`
    : '';
  return `วันนี้อารมณ์หลักคือ “${topEmotion.label}” ${topEmotion.percent}%${secondPart} ระดับความเครียดอยู่ในเกณฑ์${level} (${stressScore}/100) และพลังงานอยู่ที่ ${energy}/10.${triggerPart}.${copingPart}`;
}

function buildSmartResponse({ emotions, triggers, stressScore, energy, onboarding, protectiveActions }) {
  const topEmotion = emotions[0]?.label || 'ไม่ชัดเจน';
  const topTrigger = triggers[0]?.label || 'ยังไม่พบ trigger เครียดชัดเจน';
  const topEvidence = triggers[0]?.evidence?.[0] || emotions[0]?.evidence?.[0] || 'ยังไม่มีประโยคหลักที่ชัดเจน';
  const goal = onboarding?.goal || 'ดูแลใจตัวเองให้ดีขึ้น';
  const issue = onboarding?.issue || 'สิ่งที่กำลังเผชิญอยู่';
  const tone = onboarding?.tone || 'อบอุ่นและตรงไปตรงมา';

  const response = [];
  response.push(`วันนี้ระบบอ่านจาก “ความหมายของทั้งประโยค” มากกว่าการจับคำเดี่ยว ผลหลักคือ “${topEmotion}” และ trigger คือ “${topTrigger}” โดยมีประโยคสำคัญคือ ${topEvidence}`);

  if (topTrigger.includes('ยังไม่พบ')) {
    response.push('วันนี้ยังไม่พบประโยคที่เชื่อมเหตุการณ์เข้ากับความเครียดโดยตรง หากมีคำว่า “งาน/โปรเจค” แต่ประโยคมีน้ำเสียงแบบ “ชิวๆ สบายๆ” ระบบจะตีความว่าเป็นกิจกรรมของวัน ไม่ใช่ความกังวลเรื่องงาน');
  }

  if (protectiveActions.length) {
    response.push(`คำตอบเรื่อง “${truncate(protectiveActions[0].text, 80)}” ถูกมองเป็นวิธีดูแลตัวเองหรือ coping plan ไม่ใช่ข้อสรุปว่าทั้งวันคุณพักผ่อนเยอะ ระบบจึงใช้ข้อมูลนี้เพื่อลดระดับความเสี่ยงเล็กน้อยเท่านั้น`);
  }

  if (topTrigger === 'งาน') {
    response.push('ถ้างานเป็น trigger จริงของวันนี้ ให้แยกงานเป็น 3 ชั้น: งานที่ต้องส่งวันนี้, งานที่เลื่อนได้, และความกังวลที่ยังไม่ใช่ปัญหาจริงตอนนี้ วิธีนี้ช่วยให้สมองไม่รวมทุกอย่างเป็นก้อนเดียว');
    response.push('คืนนี้เลือกทำแค่ action เล็กที่สุดหนึ่งอย่าง เช่น เขียน checklist พรุ่งนี้ 3 ข้อ หรือเปิดไฟล์แล้วจัดหัวข้อ 10 นาที จากนั้นพัก ไม่ต้องบังคับให้ตัวเองแก้ทุกอย่างในคืนเดียว');
  } else if (topTrigger === 'การเรียน') {
    response.push('ถ้าเรื่องเรียนเป็น trigger ให้เริ่มจากการทำให้สิ่งที่ต้องส่งเล็กลงมาก ๆ เช่น สรุปหัวข้อเดียว อ่าน 5 หน้า หรือถามเพื่อนหนึ่งคำถาม เป้าหมายคือเริ่มขยับ ไม่ใช่ทำให้เสร็จทั้งหมดทันที');
  } else if (topTrigger === 'การพักผ่อน') {
    response.push('ถ้าพักผ่อนไม่พอเป็น trigger หลัก วันนี้ควรลดสิ่งกระตุ้นก่อนนอน และตั้งเป้าเป็นการพักที่เป็นไปได้จริง เช่น ปิดหน้าจอเร็วขึ้น 20 นาที หรือเตรียมของพรุ่งนี้แล้วเข้านอน');
  } else if (topTrigger === 'ความสัมพันธ์') {
    response.push('ถ้าความสัมพันธ์เป็น trigger ให้แยกเหตุการณ์จริงออกจากการตีความ เช่น “เขาตอบช้า” กับ “เขาไม่สนใจเรา” เป็นคนละประโยค การแยกแบบนี้ช่วยลดการโทษตัวเองหรืออีกฝ่ายเร็วเกินไป');
  } else if (topTrigger === 'เงิน') {
    response.push('ถ้าเรื่องเงินเป็น trigger ให้เริ่มจากรายการเล็ก ๆ ที่ควบคุมได้ จดรายจ่ายจำเป็น 3 อย่าง และสิ่งที่เลื่อนได้ 1 อย่าง เพื่อเปลี่ยนความกังวลเป็นแผนที่มองเห็นได้');
  } else if (topTrigger === 'สุขภาพ') {
    response.push('ถ้าสุขภาพเป็น trigger ให้ดูแลพื้นฐานก่อน เช่น ดื่มน้ำ กินอาหารอ่อน ๆ พัก และถ้าอาการรบกวนชีวิตประจำวันควรปรึกษาผู้เชี่ยวชาญ/สถานพยาบาล');
  } else if (topTrigger === 'อนาคต/ความไม่แน่นอน') {
    response.push('ถ้าความไม่แน่นอนเป็น trigger ให้เขียนแยกเป็น 2 ช่อง: สิ่งที่ควบคุมได้ใน 24 ชั่วโมง และสิ่งที่ยังไม่ต้องแก้วันนี้ การแยกนี้ช่วยไม่ให้ใจแบกอนาคตทั้งหมดพร้อมกัน');
  } else if (topEmotion === 'สุข' || topEmotion === 'สงบ') {
    response.push('วันนี้มีสัญญาณค่อนข้างสงบหรือบวก ให้จดไว้ว่าอะไรทำให้วันดำเนินไปได้ดี เช่น pace งาน คนที่คุยด้วย หรือช่วงเวลาที่ได้พัก เพราะข้อมูลนี้จะช่วยสร้าง pattern ดูแลใจในวันที่หนักกว่า');
  } else {
    response.push('วันนี้สัญญาณยังไม่ชัดพอว่าต้นเหตุคืออะไร ลองเขียนเพิ่มวันถัดไปด้วยรูปแบบ “เหตุการณ์ → ความคิดที่เกิดขึ้น → ความรู้สึกในร่างกาย → สิ่งที่ต้องการ” ระบบจะวิเคราะห์ได้แม่นขึ้นมาก');
  }

  if (stressScore >= 75) {
    response.push('คะแนนความเครียดค่อนข้างสูง วันนี้ไม่ควรตัดสินใจเรื่องใหญ่ตอนใจแน่น ให้ลดแรงกดดันก่อน เช่น อาบน้ำ ดื่มน้ำ หายใจช้า ๆ หรือส่งข้อความหาคนใกล้ตัวว่าอยากได้พื้นที่พัก');
  } else if (stressScore >= 45) {
    response.push('ระดับความเครียดวันนี้ควรดูแล แต่ยังพอจัดการได้ เลือกทำสิ่งเล็ก ๆ หนึ่งอย่างที่ช่วยให้พรุ่งนี้ง่ายขึ้นก็เพียงพอ');
  } else {
    response.push('ระดับความเครียดวันนี้ต่ำหรือไม่เด่น เป็นโอกาสดีที่จะสังเกตว่าสภาพแวดล้อมแบบไหนทำให้ใจนิ่งขึ้น แล้วเก็บไว้ใช้ซ้ำในวันถัดไป');
  }

  if (Number(energy) <= 4) {
    response.push(`พลังงาน ${energy}/10 ถือว่าค่อนข้างต่ำ แนะนำให้ใช้แผนแบบประหยัดแรง: ลดงานที่ไม่จำเป็น เลือกพักก่อน และอย่าประเมินคุณค่าตัวเองจาก productivity ของวันนี้`);
  }

  response.push(`คำแนะนำนี้เชื่อมกับเป้าหมายของคุณคือ “${goal}” และบริบท onboarding เรื่อง “${issue}” โดยใช้โทน “${tone}”`);
  return response;
}

function buildWeeklyReport(historyWithToday) {
  const recent = historyWithToday.slice(0, 7);
  if (recent.length < 2) return 'ยังมีข้อมูลไม่พอสำหรับสรุปรายสัปดาห์ เริ่มเขียนต่ออีก 2–3 วัน ระบบจะเห็น pattern ได้ชัดขึ้น';
  const avgStress = Math.round(recent.reduce((sum, item) => sum + Number(item.analysis?.stressScore || 0), 0) / recent.length);
  const avgEnergy = (recent.reduce((sum, item) => sum + Number(item.energy || 0), 0) / recent.length).toFixed(1);
  const topTriggers = {};
  recent.forEach((item) => {
    const label = item.analysis?.triggers?.[0]?.label;
    if (label && !label.includes('ยังไม่พบ')) topTriggers[label] = (topTriggers[label] || 0) + 1;
  });
  const topTrigger = Object.entries(topTriggers).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ยังไม่พบ trigger ที่ซ้ำชัดเจน';
  return `ช่วง 7 วันที่ผ่านมา ค่าเฉลี่ยความเครียดอยู่ที่ ${avgStress}/100 และพลังงานเฉลี่ย ${avgEnergy}/10 โดย trigger ที่พบซ้ำบ่อยที่สุดคือ “${topTrigger}”`;
}

function buildInsight({ emotions, triggers, stressScore, energy, protectiveActions }) {
  const topEmotion = emotions[0]?.label || 'ไม่ชัดเจน';
  const topTrigger = triggers[0]?.label || 'ยังไม่พบ trigger เครียดชัดเจน';
  if (topTrigger.includes('ยังไม่พบ') && ['สุข', 'สงบ'].includes(topEmotion)) {
    return 'วันนี้ระบบพบโทนโดยรวมค่อนข้างสงบ/บวก และไม่พบ trigger เครียดชัดเจนจากประโยคที่เขียนไว้';
  }
  if (stressScore >= 70 && Number(energy) <= 4) {
    return 'วันนี้ความเครียดสูงพร้อมกับพลังงานต่ำ รูปแบบนี้มักทำให้ตัดสินใจยาก ควรลดงานหรือกิจกรรมที่ไม่จำเป็นก่อน';
  }
  if (protectiveActions.length) {
    return `คุณมีแผนดูแลตัวเองที่ชัด เช่น “${truncate(protectiveActions[0].text, 70)}” ซึ่งเป็นสัญญาณที่ดีและช่วยพยุงใจได้`;
  }
  return `อารมณ์หลักวันนี้คือ “${topEmotion}” และ trigger ที่เด่นคือ “${topTrigger}” การเห็นความเชื่อมโยงนี้ช่วยให้วางแผนดูแลตัวเองได้ตรงจุดขึ้น`;
}

export function analyzeDiary({ mood, energy, diaryText, reflections = [], onboarding = {}, history = [] }) {
  const context = buildContext(diaryText, reflections);
  const crisisMatches = detectCrisis(context.allText);

  if (crisisMatches.length) {
    return {
      safeMode: true,
      crisisMatches,
      title: 'Safe Mode: ตรวจพบข้อความที่อาจเสี่ยงต่อความปลอดภัย',
      supportiveMessage: 'ตอนนี้คุณอาจกำลังเหนื่อยและเจ็บปวดมาก สิ่งสำคัญที่สุดคือคุณไม่จำเป็นต้องรับมือคนเดียวในตอนนี้ กรุณาติดต่อคนที่ไว้ใจได้ทันที หรือขอความช่วยเหลือจากสายด่วน/หน่วยบริการใกล้ตัว',
      immediateSteps: [
        'วางของมีคมหรือสิ่งที่อาจใช้ทำร้ายตัวเองให้ออกห่างก่อน',
        'โทรหรือส่งข้อความหาคนที่ไว้ใจได้ เช่น เพื่อน ครอบครัว หรืออาจารย์/หัวหน้างาน',
        'หากรู้สึกว่าอาจควบคุมตัวเองไม่ได้ ให้ไปห้องฉุกเฉินหรือสถานพยาบาลใกล้ที่สุดทันที',
        'สายด่วนสุขภาพจิตไทย 1323'
      ],
      emotionClassification: [],
      triggers: [],
      stressScore: 100,
      sentimentScore: -100,
      smartResponse: []
    };
  }

  const protectiveActions = detectProtectiveActions(context.careSentences);
  const emotions = aggregateEmotions(context, mood, energy, protectiveActions);
  const triggers = detectTriggers(context);
  const stressScore = buildStressScore({ emotions, triggers, energy, context, protectiveActions });
  const sentimentScore = buildSentimentScore(emotions, stressScore, protectiveActions);
  const burnout = detectBurnout({ context, energy, stressScore, history });
  const mentalSummary = buildMentalSummary({ emotions, triggers, stressScore, energy, protectiveActions });
  const smartResponse = buildSmartResponse({ emotions, triggers, stressScore, energy, onboarding, protectiveActions });
  const emotionSummary = `${emotions[0]?.label || 'ไม่ชัดเจน'}: ${emotions[0]?.reason || 'ยังไม่พบข้อมูลเพียงพอ'}`;
  const triggerSummary = `${triggers[0]?.label || 'ยังไม่พบ trigger เครียดชัดเจน'}: ${triggers[0]?.reason || 'ยังไม่พบข้อมูลเพียงพอ'}`;
  const todayWithAnalysis = [{ analysis: { stressScore, triggers }, energy }, ...history];

  return {
    safeMode: false,
    engineVersion: 'Sentence AI Mock v4',
    protectiveActions,
    emotionClassification: emotions,
    triggers,
    emotionSummary,
    triggerSummary,
    stressScore,
    stressLevel: getStressLevel(stressScore),
    sentimentScore,
    sentimentLabel: sentimentScore > 20 ? 'ค่อนข้างบวก' : sentimentScore < -20 ? 'ค่อนข้างลบ' : 'กลาง ๆ',
    mentalSummary,
    smartResponse,
    burnout,
    aiInsight: buildInsight({ emotions, triggers, stressScore, energy, protectiveActions }),
    weeklyReport: buildWeeklyReport(todayWithAnalysis)
  };
}

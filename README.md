# Mood Mirror Diary v4 — Sentence AI Mock

Local mini-project สำหรับ Mental Wellness Journal + AI Assistant

## วิธีรัน

```bash
npm install
npm run dev
```

เปิด URL ที่ Vite แสดง เช่น `http://localhost:5173`

## สิ่งที่ปรับใน v4

- ปรับ AI Emotional Analysis ให้เป็นระดับประโยค ไม่ใช่จับคำเดี่ยว
- ตัวอย่าง: `วันนี้ทำงานโปรเจค ชิวๆสบายๆ` จะวิเคราะห์เป็นโทนสงบ/บวก และไม่ตีความว่าเป็นความกังวลเรื่องงาน
- Trigger Detection จะนับเฉพาะประโยคที่มี domain + น้ำเสียงเครียด/กดดัน/ปัญหาชัดเจน
- Emotion Classification และ Trigger Detection แสดง evidence sentence จากข้อความที่ user เขียนจริง
- แยกคำตอบ self-care เช่น `พักผ่อน นอน คุยกับแฟน` เป็น coping plan ไม่ใช่ trigger หรือข้อสรุปว่าทั้งวันพักผ่อนเยอะ
- ปรับ Tree Feature เป็น minimal 3D earthtone พร้อม planter, glow, layered leaves และ animation
- ใช้ localStorage key ใหม่ `v4` เหมือนเริ่มเว็บใหม่แยกจากข้อมูลเวอร์ชันก่อน

## หมายเหตุ

ระบบ AI ในเวอร์ชันนี้ยังเป็น Mock AI สำหรับ demo local ไม่ใช่ AI API จริง แต่ logic ถูกออกแบบให้วิเคราะห์บริบทและน้ำเสียงของประโยคมากกว่าเวอร์ชันก่อน

// backend/server.js

// ... (ส่วนการตั้งค่า Node, Express, MongoDB Schema และ Model ยังคงเดิม)
// backend/server.js (ส่วนที่ 1. ตั้งค่า Middleware และ Database)

// 🚨 แทนที่ URI นี้ด้วย URI ของ MongoDB Atlas ของคุณ 🚨
// ต้องเปลี่ยน <db_password> ด้วยรหัสผ่านจริงที่คุณบันทึกไว้!
const DB_URI = 'mongodb+srv://savings_admin:11332580pl@cluster0.vnfusyu.mongodb.net/?appName=Cluster0'; 
// backend/server.js
const express = require('express');
const app = express();

const mongoose = require('mongoose'); // <--- 🚨 บรรทัดนี้สำคัญมาก! 🚨
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { Parser } = require('json2csv'); 
// ... (โค้ดส่วนอื่น ๆ ที่ตามมา)
// *** (อย่าลืมเพิ่มชื่อ Database 'groupSavingsDB' ต่อท้าย URI ด้วยครับ) ***

mongoose.connect(DB_URI)
    .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ... (โค้ดส่วนอื่น ๆ ยังคงเดิม)
// เปลี่ยนชื่อที่ใช้ในการคำนวณสรุปยอด (ใน API /api/savings)
app.get('/api/savings', async (req, res) => {
    try {
        // ... (โค้ดดึงข้อมูล)
        
        // **ปรับปรุงตรงนี้:**
        const userNames = ["ออมสิน", "เบนซ์", "แพร", "มิ้ว"];
        let initialTotals = { total: 0 };
        userNames.forEach(name => initialTotals[name] = 0); // ตั้งค่าเริ่มต้น
        
        const totals = savings.reduce((acc, current) => {
            acc.total += current.depositAmount;
            // ใช้ชื่อใหม่ในการคำนวณ
            acc[current.depositorName] = (acc[current.depositorName] || 0) + current.depositAmount;
            return acc;
        }, initialTotals); // ใช้ initialTotals ที่มีชื่อใหม่แล้ว

        res.json({
            summary: totals,
            history: savings
        });
    } catch (error) {
        // ...
    }
});

// ... (ส่วน API อื่น ๆ ยังคงเดิม)
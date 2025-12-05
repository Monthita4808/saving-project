const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Parser } = require('json2csv'); // เผื่อคุณใช้ export csv

// 1. สร้าง App Express
const app = express();

// 2. ตั้งค่า Port (สำคัญสำหรับ Render)
// ให้ใช้ process.env.PORT เป็นหลัก ถ้าไม่มีค่อยใช้ 3000
const port = process.env.PORT || 3000;

// 3. ตั้งค่า Middleware
app.use(cors());
app.use(express.json()); // สำคัญ! ต้องมีเพื่อให้อ่าน body เวลา POST ได้

// 4. ตั้งค่า Database URI
// แนะนำให้ใช้ Environment Variable จาก Render (process.env.DB_URL) เพื่อความปลอดภัย
// แต่ถ้ายังไม่คล่อง ใช้ค่านี้เป็น Fallback ชั่วคราวได้ครับ
const DB_URI = process.env.DB_URL || 'mongodb+srv://savings_admin:11332580pl@cluster0.vnfusyu.mongodb.net/groupSavingsDB?appName=Cluster0';

// 5. เชื่อมต่อ MongoDB
mongoose.connect(DB_URI)
    .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 6. สร้าง Schema และ Model (ต้องมีตรงนี้ ไม่งั้นโค้ดข้างล่างจะ error)
const savingsSchema = new mongoose.Schema({
    depositorName: String,
    depositAmount: Number,
    date: { type: Date, default: Date.now }
});

const Savings = mongoose.model('Savings', savingsSchema);

// ---------------- API Routes ----------------

// API: ดึงข้อมูลและสรุปยอด (ที่คุณเขียนไว้)
app.get('/api/savings', async (req, res) => {
    try {
        const savings = await Savings.find().sort({ date: -1 });
        
        // รายชื่อสมาชิก
        const userNames = ["ออมสิน", "เบนซ์", "แพร", "มิ้ว"];
        
        // ตั้งค่าเริ่มต้นให้ทุกคนเป็น 0
        let initialTotals = { total: 0 };
        userNames.forEach(name => initialTotals[name] = 0);
        
        // คำนวณยอดรวม
        const totals = savings.reduce((acc, current) => {
            acc.total += current.depositAmount;
            // เช็คว่าชื่อคนฝากอยู่ในลิสต์ไหม ถ้าอยู่ก็บวกเงินเพิ่ม
            if (acc.hasOwnProperty(current.depositorName)) {
                acc[current.depositorName] += current.depositAmount;
            } else {
                // เผื่อมีชื่อแปลกปลอม หรือชื่อนอกเหนือจากลิสต์ (Optional)
                acc[current.depositorName] = (acc[current.depositorName] || 0) + current.depositAmount;
            }
            return acc;
        }, initialTotals);

        res.json({
            summary: totals,
            history: savings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
});

// API: เพิ่มข้อมูลเงินออม (จำเป็นต้องมี เพื่อให้เว็บทำงานได้จริง)
app.post('/api/savings', async (req, res) => {
    try {
        const newSaving = new Savings({
            depositorName: req.body.depositorName,
            depositAmount: req.body.depositAmount,
            date: req.body.date || Date.now()
        });
        
        const savedSaving = await newSaving.save();
        res.status(201).json(savedSaving);
    } catch (error) {
        res.status(400).json({ message: "บันทึกข้อมูลไม่สำเร็จ" });
    }
});

// ---------------- Frontend Serving ----------------

// 7. เสิร์ฟไฟล์ Frontend (สำคัญมากสำหรับเว็บฟรี)
// ชี้ไปที่โฟลเดอร์ frontend (ถอยหลังกลับไป 1 ชั้นจาก backend)
app.use(express.static(path.join(__dirname, '../frontend')));

// ถ้า User เข้ามาที่หน้าเว็บอื่นๆ ที่ไม่ใช่ API ให้ส่ง index.html ไปให้
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 8. เริ่มต้น Server (เอาไว้ล่างสุดเสมอ)
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
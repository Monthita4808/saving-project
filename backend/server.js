const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
// *** เพิ่ม Multer สำหรับจัดการ File Uploads ***
const multer = require('multer'); 
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));

// -------------------------------------------------------------------
// 1. Multer Setup: กำหนดที่เก็บไฟล์ชั่วคราว (Simulated Storage)
// ในสภาพแวดล้อมจริง เช่น Railway คุณควรใช้ Cloud Storage (S3/GCS) 
// แต่สำหรับ Demo เราจะเก็บใน memory หรือ temp folder ชั่วคราว
// -------------------------------------------------------------------
const UPLOAD_FOLDER = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // บันทึกไฟล์ไปยังโฟลเดอร์ 'uploads'
        cb(null, UPLOAD_FOLDER);
    },
    filename: (req, file, cb) => {
        // ตั้งชื่อไฟล์ใหม่เพื่อไม่ให้ซ้ำกัน
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const DB_URI = process.env.DB_URL || 'mongodb+srv://savings_admin:11332580pl@cluster0.vnfusyu.mongodb.net/groupSavingsDB?appName=Cluster0';

mongoose.connect(DB_URI)
    .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// -------------------------------------------------------------------
// 2. Schema Update: เพิ่ม field สำหรับ URL ของสลิป
// -------------------------------------------------------------------
const savingsSchema = new mongoose.Schema({
    depositorName: String,
    depositAmount: Number,
    slipUrl: { type: String, required: true }, // เพิ่ม field สำหรับ Path ของไฟล์สลิป
    date: { type: Date, default: Date.now }
}, {
    timestamps: true // เพิ่ม timestamp เพื่อใช้เรียงลำดับใน Frontend
});

const Savings = mongoose.model('Savings', savingsSchema);

// -------------------------------------------------------------------
// 3. Serve uploaded slips: Route สำหรับดึงรูปสลิป
// -------------------------------------------------------------------
app.use('/uploads', express.static(UPLOAD_FOLDER));


// Route สำหรับดึงข้อมูลยอดรวมและประวัติทั้งหมด
app.get('/api/savings', async (req, res) => {
    try {
        const savings = await Savings.find().sort({ date: -1 });
        const userNames = ["ออมสิน", "รถเบนซ์", "แพรวา", "มิ้ว"];
        
        let initialTotals = { total: 0 };
        userNames.forEach(name => initialTotals[name] = 0);
        
        const totals = savings.reduce((acc, current) => {
            acc.total += current.depositAmount;
            
            // แก้ไขการหาชื่อเพื่อให้รองรับชื่อใน Schema
            const nameKey = current.depositorName; 
            acc[nameKey] = (acc[nameKey] || 0) + current.depositAmount;
            
            return acc;
        }, initialTotals);

        res.json({
            summary: totals,
            transactions: savings // เปลี่ยนชื่อเป็น transactions ให้ตรงกับ Frontend
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
});


// -------------------------------------------------------------------
// 4. POST Route Fix: แก้ชื่อ Route และใส่ Multer Middleware
// -------------------------------------------------------------------
app.post('/api/savings/deposit', upload.single('slipUpload'), async (req, res) => {
    
    // ตรวจสอบว่ามีไฟล์สลิปหรือไม่
    if (!req.file) {
        return res.status(400).json({ message: "ไม่พบไฟล์สลิป (slipUpload) หรือการอัปโหลดมีปัญหา" });
    }

    try {
        const { depositorName, depositAmount, depositDate } = req.body;
        
        // ตรวจสอบข้อมูลพื้นฐาน
        if (!depositorName || !depositAmount) {
             // ถ้าข้อมูลไม่ครบ ให้ลบไฟล์ที่อัปโหลดไปแล้วทิ้ง (เพื่อทำความสะอาด)
            fs.unlinkSync(req.file.path); 
            return res.status(400).json({ message: "ชื่อผู้ออมหรือจำนวนเงินไม่สมบูรณ์" });
        }

        const newSaving = new Savings({
            depositorName: depositorName,

            date: depositDate ? new Date(depositDate) : Date.now(),
            // บันทึก Path ของไฟล์ที่ Server สามารถเข้าถึงได้
            slipUrl: `/uploads/${req.file.filename}` 
        });
        
        const savedSaving = await newSaving.save();
        res.status(201).json(savedSaving);

    } catch (error) {
        console.error("Error saving data:", error);
        // ถ้าเกิดข้อผิดพลาดในการบันทึกฐานข้อมูล ให้ลบไฟล์ที่อัปโหลดไปแล้วทิ้ง
        fs.unlinkSync(req.file.path); 
        res.status(400).json({ message: "บันทึกข้อมูลไม่สำเร็จ: " + error.message });
    }
});

// Route สำหรับ Export CSV (เหมือนเดิม)
app.get('/api/savings/export', async (req, res) => {
    try {
        const savings = await Savings.find().sort({ date: -1 });
        let csv = "วันที่,ชื่อผู้ออม,จำนวนเงิน(บาท),URL สลิป\n";
        
        savings.forEach(item => {
            const date = new Date(item.date).toLocaleDateString('th-TH');
            const amount = item.depositAmount.toFixed(2);
            // ใช้ BACKEND_URL เพื่อสร้าง URL สลิปที่สมบูรณ์ในไฟล์ CSV
            const fullSlipUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}${item.slipUrl}`; 
            csv += `"${date}","${item.depositorName}","${amount}","${fullSlipUrl}"\n`;
        });

        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment('saving_history.csv');
        res.send('\uFEFF' + csv); // \uFEFF คือ BOM สำหรับ encoding UTF-8 ใน Excel

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งออกข้อมูล" });
    }
});

app.use(express.static(path.join(__dirname, '../frontend')));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
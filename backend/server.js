const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DB_URI = process.env.DB_URL || 'mongodb+srv://savings_admin:11332580pl@cluster0.vnfusyu.mongodb.net/groupSavingsDB?appName=Cluster0';

mongoose.connect(DB_URI)
    .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const savingsSchema = new mongoose.Schema({
    depositorName: String,
    depositAmount: Number,
    date: { type: Date, default: Date.now }
});

const Savings = mongoose.model('Savings', savingsSchema);

app.get('/api/savings', async (req, res) => {
    try {
        const savings = await Savings.find().sort({ date: -1 });
        const userNames = ["ออมสิน", "เบนซ์", "แพร", "มิ้ว"];
        let initialTotals = { total: 0 };
        userNames.forEach(name => initialTotals[name] = 0);
        
        const totals = savings.reduce((acc, current) => {
            acc.total += current.depositAmount;
            if (acc.hasOwnProperty(current.depositorName)) {
                acc[current.depositorName] += current.depositAmount;
            } else {
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

app.use(express.static(path.join(__dirname, '../frontend')));

// แก้ไขตรงนี้: ใช้ Regex /.*/ แทน * เพื่อแก้ปัญหา PathError
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
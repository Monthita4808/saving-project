// frontend/script.js

const API_BASE_URL = 'http://localhost:3000/api';
// **อัปเดตรายการชื่อผู้ออมใหม่**
const userNames = ["ออมสิน", "เบนซ์", "แพร", "มิ้ว"]; 

document.addEventListener('DOMContentLoaded', () => {
    // กำหนดวันที่ปัจจุบันเป็นค่าเริ่มต้น
    document.getElementById('depositDate').valueAsDate = new Date();
    loadSavingsData();
});

// ... (ส่วน Event Listener สำหรับ Form Submission ยังคงเดิม) ...

/**
 * อัปเดตยอดรวมใน Dashboard
 * @param {object} summary - วัตถุที่มียอดรวมทั้งหมดและยอดของแต่ละคน
 */
function updateDashboard(summary) {
    // อัปเดตยอดรวมที่ Hero Section
    document.getElementById('totalAmount').textContent = `${summary.total.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`;

    // อัปเดตยอดแยกแต่ละคน
    userNames.forEach(name => {
        const amount = summary[name] || 0;
        // **ใช้ ID ใหม่** เช่น amountออมสิน, amountเบนซ์
        const element = document.getElementById(`amount${name}`); 
        if (element) {
            element.textContent = `${amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`;
        }
    });
}

// ... (ส่วน updateHistoryTable และ Export Button Listener ยังคงเดิม) ...
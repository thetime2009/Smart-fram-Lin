const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "https://blynk.cloud/external/api/";

// ฟังก์ชันดึงข้อมูลจาก Blynk (Polling)
async function fetchData() {
    try {
        // ดึงค่าอุณหภูมิ (V37), ความชื้นดิน (V36), ฝน (V65), น้ำที่ใช้ (V29)
        const pins = ['V37', 'V36', 'V65', 'V29'];
        
        for (let pin of pins) {
            const response = await fetch(`${BLYNK_URL}get?token=${BLYNK_TOKEN}&${pin}`);
            const value = await response.text();
            updateUI(pin, value);
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function updateUI(pin, value) {
    if (pin === 'V37') document.getElementById('temp').innerText = value + "°C";
    if (pin === 'V36') document.getElementById('soil').innerText = value + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = value;
    if (pin === 'V29') document.getElementById('water_used').innerText = value;
}

// ฟังก์ชันส่งคำสั่ง Update (เช่น ปุ่มกด)
async function updateBlynk(pin, value) {
    try {
        await fetch(`${BLYNK_URL}update?token=${BLYNK_TOKEN}&${pin}=${value}`);
        console.log(`Updated ${pin} to ${value}`);
    } catch (error) {
        alert("การเชื่อมต่อผิดพลาด");
    }
}

// ฟังก์ชันสำหรับ Switch (0 หรือ 1)
function toggleBlynk(pin, isChecked) {
    const val = isChecked ? 1 : 0;
    updateBlynk(pin, val);
}

function stopAllRelays() {
    ['V1', 'V2', 'V3', 'V4'].forEach(pin => updateBlynk(pin, 0));
}

// เริ่มดึงข้อมูลทุกๆ 2 วินาที
setInterval(fetchData, 2000);
fetchData(); // เรียกทันทีที่โหลดหน้า

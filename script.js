const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

function secondsToTime(seconds) {
    if (seconds === null || isNaN(seconds) || seconds < 0) return "--:--";
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
}

function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':');
    return (parseInt(hrs) * 3600) + (parseInt(mins) * 60);
}

// 1. ดึงข้อมูลทีละ Pin เพื่อความชัวร์ (แก้ปัญหา JSON Error)
async function getBlynkData(pin) {
    try {
        const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`);
        if (response.ok) {
            let rawData = await response.text();
            // ล้างขยะอักขระ: [ ] " ' และตัวเว้นวรรค
            let cleanData = rawData.replace(/[\[\]"']/g, '').trim();
            updateUI(pin, cleanData); 
        }
    } catch (error) {
        console.error(`Error fetching ${pin}:`, error);
    }
}

// 2. ฟังก์ชันหลัก: วนลูปดึงข้อมูลทุก Pin
async function fetchData() {
    const pins = ['V10', 'V1', 'V0', 'V65', 'V18', 'V105', 'V106', 'V11', 'V12', 'V13', 'V14', 'V27', 'V40', 'V41', 'V42', 'V43'];
    // ใช้ for...of เพื่อให้ดึงทีละ Pin อย่างเป็นลำดับ (เสถียรกว่า)
    for (const pin of pins) {
        await getBlynkData(pin);
    }
}

// --- ปรับปรุงฟังก์ชันจัดการเวลาโดยเฉพาะ ---
function updateUI(pin, cleanValue) {
    if (!cleanValue) return;
     // let parts = String(cleanValue).replace(/[\[\]"']/g, '').split(',');
     // let val = parts[0];

    // --- เพิ่มส่วนอัปเดตสวิตช์วาล์ว V11 - V14 ---
    const valveSwitch = document.getElementById(`${pin.toLowerCase()}_switch`);
    if (valveSwitch) {
        // ใน Blynk ถ้าเป็นปุ่ม/วาล์ว ค่ามักเป็น 1 หรือ 255 คือเปิด
        valveSwitch.checked = (val === "1" || val === "255");
        return; // ทำงานเสร็จแล้วหยุดตรงนี้
    }



    
    // ล้างอักขระส่วนเกินที่อาจหลุดมา (เช่น ช่องว่าง หรือเครื่องหมายคำพูด)
    let raw = String(cleanValue).replace(/[\[\]"']/g, '');
    let parts = raw.split(',');

    // --- จัดการข้อมูลเวลา V40, V41, V42, V43 ---
    if (['V40', 'V41', 'V42', 'V43'].includes(pin)) {
        // parts[0] คือ Start Sec, parts[1] คือ Stop Sec
        if (parts.length >= 2) {
            let startSec = parseInt(parts[0].trim());
            let stopSec = parseInt(parts[1].trim());

            // ตรวจสอบว่าต้องไม่เป็นค่าว่างหรือ NaN
            let startTime = (!isNaN(startSec) && startSec !== -1) ? secondsToTime(startSec) : "--:--";
            let stopTime = (!isNaN(stopSec) && stopSec !== -1) ? secondsToTime(stopSec) : "--:--";

            // อัปเดตลงตาราง
            const startTable = document.getElementById(`${pin.toLowerCase()}_start`);
            const stopTable = document.getElementById(`${pin.toLowerCase()}_stop`);
            
            if (startTable) startTable.innerText = startTime;
            if (stopTable) stopTable.innerText = stopTime;

            // ถ้าเลือกโซนนี้อยู่ ให้ใส่ค่าใน Input แก้ไขด้วย
            const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
            if (selectedZone && selectedZone.value === pin) {
                document.getElementById('start_t').value = (startTime !== "--:--" ? startTime : "");
                document.getElementById('stop_t').value = (stopTime !== "--:--" ? stopTime : "");
            }
        }
        return;
    }

    // --- ส่วนเซนเซอร์และสถานะ ---
    if (pin === 'V1') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V0') document.getElementById('soil').innerText = cleanValue + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = cleanValue;
    if (pin === 'V18') document.getElementById('water_used').innerText = cleanValue;
    if (pin === 'V105') document.getElementById('vpd_val').innerText = cleanValue;
    
    if (pin === 'V106') {
        const txt = cleanValue === "1" ? "คายน้ำสูง" : cleanValue === "2" ? "คายน้ำดีมาก" : cleanValue;
        document.getElementById('status_val').innerText = txt;
    }

    if (pin === 'V10') {
        const sw = document.getElementById('v10_switch');
        if (sw) sw.checked = (cleanValue === "1");
    }

    if (pin === 'V27') {
        const menu = document.getElementById('menu_select');
        if (menu) menu.value = cleanValue;
    }

    const isOn = (cleanValue === "255" || cleanValue === "1");
    const btnMap = {'V11': 'btn-z1', 'V12': 'btn-z2', 'V13': 'btn-z3', 'V14': 'btn-z4'};
    if (btnMap[pin]) updateBtnStyle(btnMap[pin], isOn);
}

function updateBtnStyle(id, isOn) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (isOn) {
        btn.classList.add('btn-success');
        btn.classList.remove('btn-outline-success');
    } else {
        btn.classList.add('btn-outline-success');
        btn.classList.remove('btn-success'); 
    }
}

// 4. ส่วนการบันทึก (Save) และปุ่มกด
async function updateBlynk(pin, value) {
    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${value}`;
    const img = new Image();
    img.src = url;
    setTimeout(() => getBlynkData(pin), 1000);
}

function toggleBlynk(pin, isChecked) {
    updateBlynk(pin, isChecked ? 1 : 0);
}

function saveTimer() {
    const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
    if (!selectedZone) return alert("เลือกโซนก่อนครับ");

    const pin = selectedZone.value;
    const startStr = document.getElementById('start_t').value;
    const stopStr = document.getElementById('stop_t').value;

    if (!startStr || !stopStr) return alert("ระบุเวลาให้ครบครับ");

    const startSec = timeToSeconds(startStr);
    const stopSec = timeToSeconds(stopStr);

    // ส่งค่าแบบ Time Input: [Start, Stop, TZ, Days]
    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${startSec}&value=${stopSec}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    const img = new Image();
    img.src = url;
    
    alert(`บันทึกสำเร็จ: ${startStr} - ${stopStr}`);
    setTimeout(() => getBlynkData(pin), 1500);
}

// ฟังก์ชันสำหรับ เปิด/ปิด วาล์วสลับกัน (Toggle)
function toggleValve(pin, btnId) {
    const btn = document.getElementById(btnId);
    
    // เช็กว่าปัจจุบันปุ่มมี class 'btn-success' (สีเขียวเข้ม) อยู่หรือไม่
    // ถ้ามี แสดงว่า "เปิดอยู่" -> ให้ส่งค่า 0 ไปเพื่อ "ปิด"
    // ถ้าไม่มี แสดงว่า "ปิดอยู่" -> ให้ส่งค่า 1 ไปเพื่อ "เปิด"
    const isNowOn = btn.classList.contains('btn-success');
    const newValue = isNowOn ? 0 : 1;

    console.log(`Toggling ${pin} to ${newValue}`);
    
    // ส่งค่าไปที่ Blynk
    updateBlynk(pin, newValue);
}

// เริ่มต้น
document.addEventListener('DOMContentLoaded', () => {
    fetchData(); 
    setInterval(fetchData, 5000); 
});

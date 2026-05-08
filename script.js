const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 
console.log(pin, parts);
function secondsToTime(seconds) {
    if (seconds === null || isNaN(seconds) || seconds < 0) return "--:--";
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
}
function minutesToTime(min) {
    if (!min || min === "0") return "--:--";

    let minutes = parseInt(min);
    let h = Math.floor(minutes / 60);
    let m = minutes % 60;

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':');
    return (parseInt(hrs) * 3600) + (parseInt(mins) * 60);
}

// 1. ดึงข้อมูลทีละ Pin เพื่อความชัวร์ (แก้ปัญหา JSON Error)
async function getBlynkData(pin) {
    try {
        const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}?t=${Date.now()}`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });

        if (response.ok) {
            let rawData = await response.text();

            let data;
            try {
                data = JSON.parse(rawData);
            } catch (e) {
                data = rawData.replace(/[\[\]"']/g, '').split(',');
            }

            updateUI(pin, data);
        }

    } catch (error) {
        console.error(`มือถือดึงข้อมูล ${pin} ไม่ได้:`, error);
    }
}

// 2. ฟังก์ชันหลัก: วนลูปดึงข้อมูลทุก Pin
async function fetchData() {
    const pins = ['V10', 'V1', 'V0', 'V65', 'V18', 'V105', 'V106', 'V11', 'V12', 'V13', 'V14', 'V27', 'V40', 'V41', 'V42', 'V43', 'V88'];
    // ใช้ for...of เพื่อให้ดึงทีละ Pin อย่างเป็นลำดับ (เสถียรกว่า)
    for (const pin of pins) {
        await getBlynkData(pin);
    }
}

// --- ปรับปรุงฟังก์ชันจัดการเวลาโดยเฉพาะ ---
    
    function updateUI(pin, data) {
    if (!data) return;

    // แปลง data เป็น array
    let parts = Array.isArray(data) ? data : String(data).replace(/[\[\]"']/g, '').split(',');

    // 👇 ใส่ตรงนี้เลย (ถูกต้อง)
    console.log("PIN:", pin, "DATA:", parts);
        
    let val = parts[0];
    let cleanValue = val;

    // 🔥 แปลง "นาที" → "HH:MM"
    function minutesToTime(min) {
        if (!min || min === "0") return "--:--";

        let m = parseInt(min);
        if (isNaN(m)) return "--:--";

        let h = Math.floor(m / 60);
        let mm = m % 60;

        return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    }

    // =========================
    // 🔧 V10 AUTO MODE CONTROL
    // =========================
    if (pin === 'V10') {
        const isAuto = (val === "1");

        const v10Switch = document.getElementById('v10_switch');
        if (v10Switch) v10Switch.checked = isAuto;

        const zonePins = ['v11_switch', 'v12_switch', 'v13_switch', 'v14_switch'];

        zonePins.forEach(id => {
            const sw = document.getElementById(id);
            if (sw) {
                sw.disabled = isAuto;

                if (isAuto) {
                    sw.checked = false;
                }
            }
        });
    }

    // =========================
    // 🔧 SWITCH V11-V14
    // =========================
    const valveSwitch = document.getElementById(`${pin.toLowerCase()}_switch`);
    if (valveSwitch) {
        valveSwitch.checked = (val === "1" || val === "255");
    }

    // =========================
    // ⏰ TIME INPUT V40-V43
    // =========================
    if (['V40', 'V41', 'V42', 'V43'].includes(pin)) {

        let startMin = parseInt(parts[0]);
        let stopMin  = parseInt(parts[1]);
        let days     = parts[2] || "";

        let startTime = (!isNaN(startMin) && startMin !== -1) ? minutesToTime(startMin) : "--:--";
        let stopTime  = (!isNaN(stopMin)  && stopMin !== -1)  ? minutesToTime(stopMin)  : "--:--";

        let dayText = days ? "Everyday" : "--";

        // 👉 อัปเดตตาราง
        const startTable = document.getElementById(`${pin.toLowerCase()}_start`);
        const stopTable  = document.getElementById(`${pin.toLowerCase()}_stop`);
        const dayTable   = document.getElementById(`${pin.toLowerCase()}_day`);

        if (startTable) startTable.innerText = startTime;
        if (stopTable)  stopTable.innerText  = stopTime;
        if (dayTable)   dayTable.innerText   = dayText;

        // 👉 sync input ด้านล่าง (แก้ใหม่)
const selectedZone = document.querySelector('input[name="timer_zone"]:checked');

if (selectedZone && selectedZone.value === pin) {

    const startInput = document.getElementById('start_t');
    const stopInput  = document.getElementById('stop_t');

    // 🔥 บังคับ format HH:mm เท่านั้น
    if (startInput) {
        startInput.value = /^\d{2}:\d{2}$/.test(startTime) ? startTime : "";
    }

    if (stopInput) {
        stopInput.value = /^\d{2}:\d{2}$/.test(stopTime) ? stopTime : "";
    }
}

        return;
    }

    // =========================
    // 🌡️ SENSOR
    // =========================
    if (pin === 'V1') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V0') document.getElementById('humi').innerText = cleanValue + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = cleanValue;

    if (pin === 'V18') {
        let waterVal = parseFloat(cleanValue);
        document.getElementById('water_used').innerText = !isNaN(waterVal)
            ? waterVal.toFixed(2) + " (ลิตร)"
            : "0.00 (ลิตร)";
    }

    if (pin === 'V105') {
        let vpdVal = parseFloat(cleanValue);
        document.getElementById('vpd_val').innerText = !isNaN(vpdVal)
            ? vpdVal.toFixed(2)
            : "0.00";
    }

    if (pin === 'V88') document.getElementById('soil').innerText = cleanValue + "%";

    if (pin === 'V106') {
        const txt =
            cleanValue === "1" ? "คายน้ำสูง" :
            cleanValue === "2" ? "คายน้ำดีมาก" :
            cleanValue;

        document.getElementById('status_val').innerText = txt;
    }

    // =========================
    // 🔧 MODE SELECT
    // =========================
    if (pin === 'V27') {
        const menu = document.getElementById('menu_select');
        if (menu) menu.value = cleanValue;
    }

    // =========================
    // 🎛️ BUTTON UI
    // =========================
    const isOn = (cleanValue === "255" || cleanValue === "1");

    const btnMap = {
        'V11': 'btn-z1',
        'V12': 'btn-z2',
        'V13': 'btn-z3',
        'V14': 'btn-z4'
    };

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

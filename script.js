const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

// --- 1. ฟังก์ชันจัดการเวลา ---
function secondsToTime(seconds) {
    if (seconds === null || isNaN(seconds)) return "--:--";
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
}

function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':');
    return (parseInt(hrs) * 3600) + (parseInt(mins) * 60);
}

// --- 2. ฟังก์ชันดึงข้อมูลแบบทีละตัว (เพื่อความชัวร์) ---
async function getBlynkData(pin) {
    try {
        const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`);
        if (response.ok) {
            // รับค่าเป็น Text เพื่อจัดการอักขระที่ JSON อ่านไม่ได้
            let rawData = await response.text();
            
            // ล้างอักขระขยะ [ ] " ' \r \n ออกให้หมด
            let cleanData = rawData.replace(/[\[\]"'\r\n\t]/g, '').trim();
            
            updateUI(pin, cleanData); 
        }
    } catch (error) {
        console.error(`Error fetching ${pin}:`, error);
    }
}

// ฟังก์ชันหลัก: ดึงข้อมูลทีละ Pin เพื่อไม่ให้ Server ทำงานหนักเกินไป
async function fetchData() {
    const pins = ['V10', 'V1', 'V0', 'V65', 'V18', 'V105', 'V106', 'V11', 'V12', 'V13', 'V14', 'V27', 'V40', 'V41', 'V42', 'V43'];
    
    for (const pin of pins) {
        await getBlynkData(pin);
    }
}

// --- 3. ฟังก์ชันอัปเดตหน้าจอ ---
function updateUI(pin, cleanValue) {
    if (cleanValue === undefined || cleanValue === null || cleanValue === "") return;

    // --- จัดการข้อมูลเวลา (V40-V43) ---
    if (['V40', 'V41', 'V42', 'V43'].includes(pin)) {
        let timeParts = cleanValue.split(',');
        
        if (timeParts.length >= 2) {
            const startSec = parseInt(timeParts[0].trim());
            const stopSec = parseInt(timeParts[1].trim());

            if (!isNaN(startSec) && !isNaN(stopSec)) {
                const startTime = secondsToTime(startSec);
                const stopTime = secondsToTime(stopSec);

                // เขียนลงตาราง
                const startTable = document.getElementById(`${pin.toLowerCase()}_start`);
                const stopTable = document.getElementById(`${pin.toLowerCase()}_stop`);
                if (startTable) startTable.innerText = startTime;
                if (stopTable) stopTable.innerText = stopTime;

                // เขียนลง Input (ถ้าเลือกโซนนั้นอยู่)
                const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
                if (selectedZone && selectedZone.value === pin) {
                    document.getElementById('start_t').value = startTime;
                    document.getElementById('stop_t').value = stopTime;
                }
            }
        }
        return;
    }

    // --- อัปเดตตัวเลขเซนเซอร์ ---
    if (pin === 'V1') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V0') document.getElementById('soil').innerText = cleanValue + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = cleanValue;
    if (pin === 'V18') document.getElementById('water_used').innerText = cleanValue;
    if (pin === 'V105') document.getElementById('vpd_val').innerText = cleanValue;
    
    // สถานะคายน้ำ
    if (pin === 'V106') {
        let statusTxt = cleanValue;
        if (cleanValue === "1") statusTxt = "คายน้ำสูง";
        if (cleanValue === "2") statusTxt = "คายน้ำดีมาก";
        document.getElementById('status_val').innerText = statusTxt;
    }

    // ระบบอัตโนมัติ (V10)
    if (pin === 'V10') {
        const sw = document.getElementById('v10_switch');
        if (sw) sw.checked = (cleanValue === "1");
    }

    // เมนูรูปแบบการทำงาน (V27)
    if (pin === 'V27') {
        const menu = document.getElementById('menu_select');
        if (menu) menu.value = cleanValue;
    }

    // อัปเดตสีปุ่มวาล์ว
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

// --- 4. ฟังก์ชันส่งคำสั่ง (Control) ---
async function updateBlynk(pin, value) {
    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${value}`;
    const img = new Image();
    img.src = url;
    // รอ 1 วินาทีแล้วดึงค่าใหม่
    setTimeout(() => getBlynkData(pin), 1000);
}

function toggleBlynk(pin, isChecked) {
    updateBlynk(pin, isChecked ? 1 : 0);
}

function saveTimer() {
    const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
    if (!selectedZone) return alert("กรุณาเลือกโซน");

    const pin = selectedZone.value;
    const startStr = document.getElementById('start_t').value;
    const stopStr = document.getElementById('stop_t').value;

    if (!startStr || !stopStr) return alert("กรุณาระบุเวลา");

    const startSec = timeToSeconds(startStr);
    const stopSec = timeToSeconds(stopStr);

    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${startSec}&value=${stopSec}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    const img = new Image();
    img.src = url;
    
    alert(`บันทึกเวลาโซน ${pin} เรียบร้อย`);
    setTimeout(() => getBlynkData(pin), 1500);
}

// --- 5. เริ่มทำงาน ---
document.addEventListener('DOMContentLoaded', () => {
    fetchData(); 
    setInterval(fetchData, 5000); // ปรับเป็น 5 วินาทีเพื่อความเสถียร
});

const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

async function fetchData() {
    try {
        // ดึงค่าเซนเซอร์, สถานะระบบ และ Pins ตั้งเวลา (V40-V43)
        const pins = ['V10', 'V1', 'V0', 'V65', 'V18', 'V105', 'V106', 'V11', 'V12', 'V13', 'V14', 'V21', 'V22', 'V23', 'V24', 'V27', 'V40', 'V41', 'V42', 'V43'];
        
        for (let pin of pins) {
            const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`);
            if (response.ok) {
                const data = await response.json(); 
                // จัดการข้อมูล Time Input (V40-V43) จะมาเป็น Array
                // ส่วนค่าปกติจะดึงตำแหน่งที่ 0 มาใช้งาน
                updateUI(pin, data);
            }
        }
    } catch (error) {
        console.error("Connection Error:", error);
    }
}

// ฟังก์ชันแปลง วินาที -> HH:mm
function secondsToTime(seconds) {
    if (isNaN(seconds) || seconds === null) return "--:--";
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
}

// ฟังก์ชันแปลง HH:mm -> วินาที
function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':');
    return (parseInt(hrs) * 3600) + (parseInt(mins) * 60);
}

function updateUI(pin, value) {
    if (value === undefined || value === null) return;
    
    // ค่าสำหรับแสดงผลข้อความทั่วไป (ลบเครื่องหมายส่วนเกิน)
    let cleanValue = String(value).replace(/[\[\]" ]/g, ''); 

    // 1. อัปเดตตัวเลขเซนเซอร์
    if (pin === 'V1') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V0') document.getElementById('soil').innerText = cleanValue + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = cleanValue;
    if (pin === 'V18') document.getElementById('water_used').innerText = cleanValue;
    if (pin === 'V105') document.getElementById('vpd_val').innerText = cleanValue;
    if (pin === 'V106') document.getElementById('status_val').innerText = cleanValue;

    // 2. อัปเดตปุ่ม Switch ระบบอัตโนมัติ (V10)
    if (pin === 'V10') {
        const v10Switch = document.getElementById('v10_switch');
        if (v10Switch) v10Switch.checked = (cleanValue === "1");
    }

    // 3. อัปเดต Dropdown เลือกโหมด (V27)
    if (pin === 'V27') {
        const menu = document.getElementById('menu_select');
        if (menu && menu.value !== cleanValue) menu.value = cleanValue;
    }

    // 4. การจัดการเวลาทุกโซน (V40-V43)
    if (['V40', 'V41', 'V42', 'V43'].includes(pin)) {
        try {
            // แปลงข้อมูลจาก Blynk (มักมาเป็น Array [startSec, stopSec, timezone, days])
            const timeData = Array.isArray(value) ? value : JSON.parse(String(value).replace(/'/g, '"'));
            
            if (timeData && timeData.length >= 2) {
                const startTime = secondsToTime(timeData[0]);
                const stopTime = secondsToTime(timeData[1]);

                // --- อัปเดตลงในตารางสรุป (Table) ---
                const startElem = document.getElementById(`${pin.toLowerCase()}_start`);
                const stopElem = document.getElementById(`${pin.toLowerCase()}_stop`);
                if (startElem) startElem.innerText = startTime;
                if (stopElem) stopElem.innerText = stopTime;

                // --- อัปเดตลงในฟอร์มแก้ไข (ถ้าโซนนั้นกำลังถูกเลือกอยู่) ---
                const selectedZoneInput = document.querySelector('input[name="timer_zone"]:checked');
                if (selectedZoneInput && selectedZoneInput.value === pin) {
                    document.getElementById('start_t').value = startTime;
                    document.getElementById('stop_t').value = stopTime;
                }
            }
        } catch (e) {
            console.warn(`Data for ${pin} is not in TimeInput format yet.`);
        }
    }

    // 5. อัปเดตสีปุ่มควบคุมวาล์ว (Z1-Z4) ตามสถานะไฟ LED (V11-V14)
    const status = (cleanValue === "255" || cleanValue === "1");
    if (pin === 'V11') updateBtnStyle('btn-z1', status);
    if (pin === 'V12') updateBtnStyle('btn-z2', status);
    if (pin === 'V13') updateBtnStyle('btn-z3', status);
    if (pin === 'V14') updateBtnStyle('btn-z4', status);
}

function updateBtnStyle(id, isOn) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (isOn) {
        btn.classList.remove('btn-outline-success');
        btn.classList.add('btn-success');
    } else {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-success');
    }
}

async function updateBlynk(pin, value) {
    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${value}`;
    const img = new Image();
    img.src = url; 
    console.log(`Command sent: ${pin} = ${value}`);
}

function toggleBlynk(pin, isChecked) {
    updateBlynk(pin, isChecked ? 1 : 0);
}

function saveTimer() {
    const selectedPin = document.querySelector('input[name="timer_zone"]:checked').value;
    const startStr = document.getElementById('start_t').value;
    const stopStr = document.getElementById('stop_t').value;

    if(!startStr || !stopStr) return alert("กรุณาระบุเวลาให้ครบถ้วน");

    const startSec = timeToSeconds(startStr);
    const stopSec = timeToSeconds(stopStr);

    // รูปแบบการส่งค่าแบบ Time Input สำหรับ Private Server (Multi-value update)
    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${selectedPin}?value=${startSec}&value=${stopSec}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    
    const img = new Image();
    img.src = url;
    
    alert(`บันทึกโซน ${selectedPin} เรียบร้อย: ${startStr} - ${stopStr}`);
    // เรียก fetchData ทันทีเพื่อให้ตารางอัปเดต
    setTimeout(fetchData, 1000);
}

// ตั้งเวลาดึงข้อมูลทุก 3 วินาที
setInterval(fetchData, 3000);
fetchData();

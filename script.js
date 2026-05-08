const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

async function fetchData() {
    try {
        // ดึงค่าเซนเซอร์ และสถานะไฟ LED (V21-V24)
        const pins = ['V10' , 'V1', 'V0', 'V65', 'V18', 'V105','V106', 'V11','V12','V13','V14','V21', 'V22', 'V23', 'V24', 'V27', 'V40', 'V41', 'V42', 'V43' ];
        
        for (let pin of pins) {
            const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`);
            if (response.ok) {
                const data = await response.json(); 
                let value = Array.isArray(data) ? data[0] : data;
                updateUI(pin, value);
            }
        }
    } catch (error) {
        console.error("Connection Error:", error);
    }
}

// ฟังก์ชันเสริมสำหรับแปลง วินาที (จากเที่ยงคืน) เป็นรูปแบบ HH:mm เพื่อใส่ในช่อง Input
function secondsToTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
}

function updateUI(pin, value) {
    if (value === undefined || value === null) return;
    
    // เตรียมค่าสำหรับการเช็คสถานะทั่วไป (ลบเครื่องหมาย [ ] " และช่องว่าง)
    let cleanValue = String(value).replace(/[\[\]" ]/g, ''); 

    // 1. อัปเดตตัวเลขเซนเซอร์และสถานะ
    if (pin === 'V1') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V0') document.getElementById('soil').innerText = cleanValue + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = cleanValue;
    if (pin === 'V18') document.getElementById('water_used').innerText = cleanValue;
    if (pin === 'V105') document.getElementById('vpd_val').innerText = cleanValue;
    if (pin === 'V106') document.getElementById('status_val').innerText = cleanValue;

    // 2. อัปเดตปุ่ม Switch ระบบอัตโนมัติ (V10)
    if (pin === 'V10') {
        const v10Switch = document.getElementById('v10_switch');
        if (v10Switch) {
            v10Switch.checked = (cleanValue === "1");
        }
    }

    // 3. อัปเดต Dropdown เลือกโหมด (V27)
    if (pin === 'V27') {
        const menu = document.getElementById('menu_select');
        if (menu && menu.value !== cleanValue) {
            menu.value = cleanValue;
        }
    }

    // 4. อัปเดตการเลือกโซน (V40-V43) และดึงเวลามาแสดง
    // ตรวจสอบว่า Pin ที่กำลังอัปเดต คือโซนที่ผู้ใช้เลือกดูอยู่หรือไม่
    const selectedZoneInput = document.querySelector('input[name="timer_zone"]:checked');
    const currentSelectedPin = selectedZoneInput ? selectedZoneInput.value : 'V40';

    // ถ้า Pin นี้ถูกเปิดใช้งาน (ค่าเป็น 1) ให้เลื่อนปุ่มวิทยุไปที่โซนนั้น
    if (cleanValue === "1") {
        const zoneRadio = document.getElementById(pin === 'V40' ? 'z1' : pin === 'V41' ? 'z2' : pin === 'V42' ? 'z3' : pin === 'V43' ? 'z4' : '');
        if (zoneRadio) zoneRadio.checked = true;
    }

    // ดึงเวลา: ถ้า Pin ที่กำลังประมวลผลตรงกับโซนที่เลือกดูอยู่ ให้แยกค่าเวลามาโชว์
    if (pin === currentSelectedPin) {
        try {
            // Blynk Time Input จะส่งมาเป็น Array [startSeconds, stopSeconds, timezone]
            const timeData = JSON.parse(String(value).replace(/'/g, '"'));
            if (Array.isArray(timeData) && timeData.length >= 2) {
                document.getElementById('start_t').value = secondsToTime(timeData[0]);
                document.getElementById('stop_t').value = secondsToTime(timeData[1]);
            }
        } catch (e) {
            console.log("ไม่ใช่รูปแบบ Time Input หรือข้อมูลยังไม่พร้อม");
        }
    }

    // 5. อัปเดตสีปุ่มควบคุมวาล์ว (Z1-Z4) ตามสถานะ LED (V11-V14)
    const status = (cleanValue === "255" || cleanValue === "1");
    if (pin === 'V11') updateBtnStyle('btn-z1', status);
    if (pin === 'V12') updateBtnStyle('btn-z2', status);
    if (pin === 'V13') updateBtnStyle('btn-z3', status);
    if (pin === 'V14') updateBtnStyle('btn-z4', status);
}

function updateBtnStyle(id, isOn) {
    const btn = document.getElementById(id);
    if (isOn) {
        btn.classList.remove('btn-outline-success');
        btn.classList.add('btn-success'); // เปลี่ยนเป็นสีเขียวเข้มเมื่อเปิด
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
    // 1. หาว่าผู้ใช้เลือกโซนไหน (V40, V41, V42 หรือ V43)
    const selectedPin = document.querySelector('input[name="timer_zone"]:checked').value;
    
    // 2. ดึงค่าเวลาจาก input
    const startStr = document.getElementById('start_t').value;
    const stopStr = document.getElementById('stop_t').value;

    if(!startStr || !stopStr) return alert("กรุณาระบุเวลา");

    // 3. แปลงเวลาเป็นวินาที (Blynk Legacy API มักใช้หน่วยวินาทีสำหรับ Time Input)
    const startSec = timeToSeconds(startStr);
    const stopSec = timeToSeconds(stopStr);

    // 4. ส่งค่าไปที่ Blynk (ส่งแบบ [startSeconds, stopSeconds, "timezone"])
    // รูปแบบของ Time Input String: ["startSeconds", "stopSeconds", "timezone", "days"]
    // สำหรับ Legacy เราจะส่งค่าลำดับแรกไปก่อนเพื่อให้บอร์ดทำงานเบื้องต้นได้
    
    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${selectedPin}?value=${startSec}&value=${stopSec}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    
    const img = new Image();
    img.src = url;
    
    alert(`บันทึกโซน ${selectedPin} เวลา ${startStr}-${stopStr} แล้ว`);
}

function timeToSeconds(timeStr) {
    const [hrs, mins] = timeStr.split(':');
    return (parseInt(hrs) * 3600) + (parseInt(mins) * 60);
}




// ตั้งเวลาดึงข้อมูลทุก 3 วินาที
setInterval(fetchData, 3000);
fetchData();

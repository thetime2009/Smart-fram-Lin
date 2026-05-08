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

function updateUI(pin, value) {
    if (value === undefined || value === null) return;
    let cleanValue = String(value).replace(/[\[\]" ]/g, ''); 

    // อัปเดตตัวเลขเซนเซอร์
    if (pin === 'V1') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V0') document.getElementById('soil').innerText = cleanValue + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = cleanValue;
    if (pin === 'V18') document.getElementById('water_used').innerText = cleanValue;
    if (pin === 'V105') document.getElementById('vpd_val').innerText = cleanValue;
    if (pin === 'V106') document.getElementById('status_val').innerText = cleanValue;

    // --- ส่วนอัปเดตปุ่ม Switch ระบบอัตโนมัติ (V10) ---
    if (pin === 'V10') {
        const v10Switch = document.getElementById('v10_switch');
        // ถ้าค่าเป็น "1" ให้ติ๊กถูก (On) ถ้าเป็น "0" ให้เอาออก (Off)
        v10Switch.checked = (cleanValue === "1");
    }
    // --- อัปเดต Dropdown เลือกโหมด (V27) ---
    if (pin === 'V27') {
        const menu = document.getElementById('menu_select');
        if (menu && menu.value !== cleanValue) {
            menu.value = cleanValue;
        }
    }

    // --- อัปเดตการเลือกโซนตั้งเวลา (V40-V43) ---
    // ถ้า Pin ไหนส่งค่า "1" มา ให้ปุ่มนั้นถูกเลือก
    if (cleanValue === "1") {
        if (pin === 'V40') document.getElementById('z1_timer').checked = true;
        if (pin === 'V41') document.getElementById('z2_timer').checked = true;
        if (pin === 'V42') document.getElementById('z3_timer').checked = true;
        if (pin === 'V43') document.getElementById('z4_timer').checked = true;
    }
    


    // อัปเดตสีปุ่มตามสถานะ LED (255 คือเปิดใน Blynk Legacy)
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

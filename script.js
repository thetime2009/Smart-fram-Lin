const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

// --- 1. ฟังก์ชันช่วยจัดการเวลา ---
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

// --- 2. ฟังก์ชันดึงข้อมูล (Fetch Data) ---
async function getBlynkData(pin) {
    try {
        const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`);
        if (response.ok) {
            const data = await response.json();
            updateUI(pin, data);
        }
    } catch (error) {
        console.error(`Error fetching ${pin}:`, error);
    }
}

async function fetchData() {
    const pins = ['V10', 'V1', 'V0', 'V65', 'V18', 'V105', 'V106', 'V11', 'V12', 'V13', 'V14', 'V27', 'V40', 'V41', 'V42', 'V43'];
    // ดึงทุก Pin พร้อมกันเพื่อความเร็วในการโหลดครั้งแรก
    await Promise.all(pins.map(pin => getBlynkData(pin)));
}

// --- 3. ฟังก์ชันอัปเดตหน้าจอ (UI Update) ---
function updateUI(pin, value) {
    if (value === undefined || value === null) return;
    
    // จัดการข้อมูลเวลา (V40-V43) แสดงในตารางและช่อง Input
    if (['V40', 'V41', 'V42', 'V43'].includes(pin)) {
        if (Array.isArray(value) && value.length >= 2) {
            const startTime = secondsToTime(value[0]);
            const stopTime = secondsToTime(value[1]);

            // เขียนลงตารางสรุป
            const startTable = document.getElementById(`${pin.toLowerCase()}_start`);
            const stopTable = document.getElementById(`${pin.toLowerCase()}_stop`);
            if (startTable) startTable.innerText = startTime;
            if (stopTable) stopTable.innerText = stopTime;

            // เขียนลงช่อง Input (ถ้ากำลังเลือกโซนนั้นอยู่)
            const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
            if (selectedZone && selectedZone.value === pin) {
                document.getElementById('start_t').value = startTime;
                document.getElementById('stop_t').value = stopTime;
            }
        }
        return;
    }

    // จัดการข้อมูลทั่วไป
    let cleanValue = String(Array.isArray(value) ? value[0] : value).replace(/[\[\]" ]/g, '');

    if (pin === 'V1') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V0') document.getElementById('soil').innerText = cleanValue + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = cleanValue;
    if (pin === 'V18') document.getElementById('water_used').innerText = cleanValue;
    if (pin === 'V105') document.getElementById('vpd_val').innerText = cleanValue;
    
    if (pin === 'V106') {
        let statusTxt = cleanValue;
        if (cleanValue === "1") statusTxt = "คายน้ำสูง";
        if (cleanValue === "2") statusTxt = "คายน้ำดีมาก";
        document.getElementById('status_val').innerText = statusTxt;
    }

    if (pin === 'V10') {
        const sw = document.getElementById('v10_switch');
        if (sw) sw.checked = (cleanValue === "1");
    }

    if (pin === 'V27') {
        const menu = document.getElementById('menu_select');
        if (menu && menu.value !== cleanValue) menu.value = cleanValue;
    }

    // อัปเดตสีปุ่มวาล์ว Z1-Z4
    const isOn = (cleanValue === "255" || cleanValue === "1");
    if (pin === 'V11') updateBtnStyle('btn-z1', isOn);
    if (pin === 'V12') updateBtnStyle('btn-z2', isOn);
    if (pin === 'V13') updateBtnStyle('btn-z3', isOn);
    if (pin === 'V14') updateBtnStyle('btn-z4', isOn);
}

function updateBtnStyle(id, isOn) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (isOn) {
        btn.classList.replace('btn-outline-success', 'btn-success');
    } else {
        btn.classList.replace('btn-success', 'btn-outline-success');
    }
}

// --- 4. ฟังก์ชันส่งคำสั่งกลับไปที่ Blynk (Control) ---
async function updateBlynk(pin, value) {
    try {
        const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${value}`;
        const img = new Image(); // ใช้เทคนิค Image Beacon เพื่อส่งคำสั่งได้เร็วและลด CORS issue
        img.src = url;
        console.log(`Sent command to ${pin}: ${value}`);
        // อัปเดตค่าหน้าเว็บทันทีหลังส่ง 1 วินาที
        setTimeout(() => getBlynkData(pin), 1000);
    } catch (error) {
        console.error("Update Error:", error);
    }
}

function toggleBlynk(pin, isChecked) {
    updateBlynk(pin, isChecked ? 1 : 0);
}

function saveTimer() {
    const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
    if (!selectedZone) return alert("กรุณาเลือกโซนที่ต้องการตั้งค่า");

    const pin = selectedZone.value;
    const startStr = document.getElementById('start_t').value;
    const stopStr = document.getElementById('stop_t').value;

    if (!startStr || !stopStr) return alert("กรุณาระบุเวลาให้ครบถ้วน");

    const startSec = timeToSeconds(startStr);
    const stopSec = timeToSeconds(stopStr);

    // ส่งค่าในรูปแบบ Time Input [Start, Stop, Timezone, Days]
    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${startSec}&value=${stopSec}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    
    const img = new Image();
    img.src = url;
    
    alert(`บันทึกเวลาโซน ${pin} สำเร็จ (${startStr} - ${stopStr})`);
    setTimeout(fetchData, 1000);
}

// --- 5. เริ่มต้นการทำงาน ---
document.addEventListener('DOMContentLoaded', () => {
    // โหลดข้อมูลทันทีที่เปิดเว็บ
    fetchData(); 
    // ตั้งเวลาโหลดซ้ำทุกๆ 3 วินาที
    setInterval(fetchData, 3000); 
});

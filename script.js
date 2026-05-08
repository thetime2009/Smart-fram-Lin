const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

// ฟังก์ชันแปลง วินาที -> HH:mm
function secondsToTime(seconds) {
    if (seconds === null || isNaN(seconds)) return "--:--";
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
}

// ฟังก์ชันดึงข้อมูลแบบเดี่ยว (ดึงมาโชว์ทันที)
async function getBlynkData(pin) {
    try {
        const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`);
        if (response.ok) {
            const data = await response.json();
            // Private Server มักส่งกลับมาเป็น Array [value]
            updateUI(pin, data);
        }
    } catch (error) {
        console.error(`Error fetching ${pin}:`, error);
    }
}

// ฟังก์ชันหลักที่รันทุก 3 วินาที และรันตอนเปิดเว็บ
async function fetchData() {
    const pins = ['V10', 'V1', 'V0', 'V65', 'V18', 'V105', 'V106', 'V11', 'V12', 'V13', 'V14', 'V27', 'V40', 'V41', 'V42', 'V43'];
    
    // ดึงทุก Pin พร้อมกันเพื่อความเร็ว
    await Promise.all(pins.map(pin => getBlynkData(pin)));
}

function updateUI(pin, value) {
    if (value === undefined || value === null) return;
    
    // ข้อมูลเวลา (V40-V43) - จัดการในรูปแบบ Array
    if (['V40', 'V41', 'V42', 'V43'].includes(pin)) {
        // ดึงค่าจาก Array: [0]=StartSec, [1]=StopSec
        if (Array.isArray(value) && value.length >= 2) {
            const startTime = secondsToTime(value[0]);
            const stopTime = secondsToTime(value[1]);

            // อัปเดตลงตารางสรุป
            const startTable = document.getElementById(`${pin.toLowerCase()}_start`);
            const stopTable = document.getElementById(`${pin.toLowerCase()}_stop`);
            if (startTable) startTable.innerText = startTime;
            if (stopTable) stopTable.innerText = stopTime;

            // อัปเดตลงช่อง Input (ถ้าโซนนั้นถูกเลือกอยู่)
            const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
            if (selectedZone && selectedZone.value === pin) {
                document.getElementById('start_t').value = startTime;
                document.getElementById('stop_t').value = stopTime;
            }
        }
        return;
    }

    // ข้อมูลทั่วไป (เซนเซอร์/ปุ่ม)
    let cleanValue = String(Array.isArray(value) ? value[0] : value).replace(/[\[\]" ]/g, '');

    if (pin === 'V1') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V0') document.getElementById('soil').innerText = cleanValue + "%";
    if (pin === 'V18') document.getElementById('water_used').innerText = cleanValue;
    if (pin === 'V105') document.getElementById('vpd_val').innerText = cleanValue;
    
    // สถานะคายน้ำ (อิงตามรูปที่คุณส่งมา)
    if (pin === 'V106') {
        let statusTxt = cleanValue;
        if (cleanValue === "1") statusTxt = "คายน้ำสูง";
        if (cleanValue === "2") statusTxt = "คายน้ำดีมาก";
        document.getElementById('status_val').innerText = statusTxt;
    }

    // ปุ่ม Switch V10
    if (pin === 'V10') {
        const sw = document.getElementById('v10_switch');
        if (sw) sw.checked = (cleanValue === "1");
    }

    // สีปุ่มวาล์ว Z1-Z4
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

// ส่วนสำคัญ: รันทันทีเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    fetchData(); 
    setInterval(fetchData, 3000); 
});

const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

async function fetchData() {
    try {
        // ดึงค่าเซนเซอร์ และสถานะไฟ LED (V21-V24)
        const pins = ['V37', 'V36', 'V65', 'V29', 'V21', 'V22', 'V23', 'V24'];
        
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
    if (pin === 'V37') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V36') document.getElementById('soil').innerText = cleanValue + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = cleanValue;
    if (pin === 'V29') document.getElementById('water_used').innerText = cleanValue;

    // อัปเดตสีปุ่มตามสถานะ LED (255 คือเปิดใน Blynk Legacy)
    const status = (cleanValue === "255" || cleanValue === "1");
    if (pin === 'V21') updateBtnStyle('btn-z1', status);
    if (pin === 'V22') updateBtnStyle('btn-z2', status);
    if (pin === 'V23') updateBtnStyle('btn-z3', status);
    if (pin === 'V24') updateBtnStyle('btn-z4', status);
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

// ตั้งเวลาดึงข้อมูลทุก 3 วินาที
setInterval(fetchData, 3000);
fetchData();

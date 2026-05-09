// =====================
// 🔑 CONFIG & VARIABLES
// =====================
const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 
let farmChart; 

// ตัวแปรเก็บสถานะสำหรับปุ่มแบบ Switch (V35, V36)
let statusV35 = 0;
let statusV36 = 0;

// =====================
// ⏰ TIME FUNCTIONS
// =====================
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

function parseBlynkTime(data) {
    let raw = String(data).replace(/[\[\]"']/g, '');
    let merged = raw.split(',').join(',');
    let parts = merged.split('\x00').filter(x => x !== '');
    return parts;
}

// =====================
// 📊 CHART FUNCTIONS
// =====================
function initChart() {
    const ctx = document.getElementById('farmChart');
    if (!ctx) return;
    const existingChart = Chart.getChart("farmChart"); 
    if (existingChart) existingChart.destroy();

    farmChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'อุณหภูมิ (°C)',
                data: [],
                borderColor: '#ff4757',
                backgroundColor: 'rgba(255, 71, 87, 0.1)',
                fill: true,
                tension: 0.4
            }, {
                label: 'ความชื้น (%)',
                data: [],
                borderColor: '#2ed573',
                backgroundColor: 'rgba(46, 213, 115, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: false }, x: { grid: { display: false } } }
        }
    });
}

function updateChart(temp, humi) {
    if (!farmChart) return;
    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    farmChart.data.labels.push(now);
    farmChart.data.datasets[0].data.push(parseFloat(temp));
    farmChart.data.datasets[1].data.push(parseFloat(humi));
    if (farmChart.data.labels.length > 12) {
        farmChart.data.labels.shift();
        farmChart.data.datasets[0].data.shift();
        farmChart.data.datasets[1].data.shift();
    }
    farmChart.update('none');
}

// =====================
// 📡 DATA FETCHING
// =====================
async function getBlynkData(pin) {
    try {
        const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}?t=${Date.now()}`);
        if (response.ok) {
            let rawData = await response.text();
            let data;
            try { data = JSON.parse(rawData); } catch { data = rawData; }
            updateUI(pin, data);
        }
    } catch (error) {
        console.error(`Error loading ${pin}:`, error);
    }
}

async function fetchData() {
    const pins = ['V10','V1','V0','V65','V18','V105','V106','V11','V12','V13','V14','V27','V40','V41','V42','V43','V50','V51','V52','V53','V88','V26','V30','V31','V55','V35','V36','V15','V16','V20'];
    for (const pin of pins) {
        await getBlynkData(pin);
    }
}

// =====================
// 🎯 MAIN UI UPDATE
// =====================
function updateUI(pin, data) {
    if (!data) return;
    let parts = parseBlynkTime(data);
    let val = parts[0];

    // 🌡️ SENSOR & CHART
    if (pin === 'V1') {
        document.getElementById('temp').innerText = val + "°C";
        const humiVal = document.getElementById('humi').innerText.replace('%', '');
        updateChart(val, humiVal);
    }
    if (pin === 'V0') document.getElementById('humi').innerText = val + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = val;
    if (pin === 'V88') document.getElementById('soil').innerText = val + "%";
    
    // 💧 WATER & STATUS
    if (pin === 'V18') {
        let v = parseFloat(val);
        document.getElementById('water_used').innerText = !isNaN(v) ? v.toFixed(2)+" ลิตร" : "0.00 ลิตร";
    }
    if (pin === 'V105') {
        let v = parseFloat(val);
        document.getElementById('vpd_val').innerText = !isNaN(v) ? v.toFixed(2) : "0.00";
    }
    if (pin === 'V106') {
        document.getElementById('status_val').innerText = (val === "1" ? "คายน้ำสูง" : val === "2" ? "คายน้ำดีมาก" : val);
    }

    // 🔧 ส่วนจัดการโหมดการทำงาน (V27)
    if (pin === 'V27') {
        const menuSelect = document.getElementById('menu_select');
        if (menuSelect) {
            menuSelect.value = String(val); 
            updateStatusText();
        }
    }

    // 🔧 AUTO MODE & SWITCHES
    if (pin === 'V10') {
        const isAuto = (val === "1");
        const sw = document.getElementById('v10_switch');
        if (sw) sw.checked = isAuto;
        ['v11_switch','v12_switch','v13_switch','v14_switch'].forEach(id => {
            if (document.getElementById(id)) document.getElementById(id).disabled = isAuto;
        });
    }

    // อัปเดตสถานะปุ่ม Switch (V35, V36) จาก Blynk
    if (pin === 'V35') {
        statusV35 = parseInt(val);
        updateButtonStyle('btn-v35', statusV35);
    }
    if (pin === 'V36') {
        statusV36 = parseInt(val);
        updateButtonStyle('btn-update', statusV36);
    }

    const valveSwitch = document.getElementById(`${pin.toLowerCase()}_switch`);
    if (valveSwitch) valveSwitch.checked = (val === "1" || val === "255");

    // ⏰ TIMER TABLE
    if (['V40','V41','V42','V43','V50','V51','V52','V53'].includes(pin)) {
        let startSec = parseInt(parts[0]);
        let stopSec  = parseInt(parts[1]);
        const tableCell = document.getElementById(`${pin.toLowerCase()}_start`);
        if (tableCell) tableCell.innerText = secondsToTime(startSec);
        const stopCell = document.getElementById(`${pin.toLowerCase()}_stop`);
        if (stopCell) stopCell.innerText = secondsToTime(stopSec);
    }
    updateStatusText();
}

// =====================
// 📤 SEND & CONTROL FUNCTIONS
// =====================
async function sendToBlynk(pin, value) {
    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${value}`;
    try {
        await fetch(url);
        console.log(`[Blynk] Pin ${pin} updated to ${value}`);
    } catch (e) { console.error("Update error", e); }
}

// 🔘 1. ฟังก์ชันสำหรับปุ่มแบบ PUSH (V15, V16, V20)
function handlePushButton(pin) {
    sendToBlynk(pin, 1);
    setTimeout(() => sendToBlynk(pin, 0), 500);
}

// 🔘 2. ฟังก์ชันสำหรับปุ่มแบบ SWITCH (V35, V36)
function handleSwitchButton(pin) {
    if (pin === 'V35') {
        statusV35 = statusV35 === 0 ? 1 : 0;
        sendToBlynk('V35', statusV35);
        updateButtonStyle('btn-v35', statusV35);
    } else if (pin === 'V36') {
        statusV36 = statusV36 === 0 ? 1 : 0;
        sendToBlynk('V36', statusV36);
        updateButtonStyle('btn-update', statusV36);
    }
}

// เปลี่ยนสีปุ่มบน UI (Switch Mode)
function updateButtonStyle(elementId, status) {
    const btn = document.getElementById(elementId);
    if (btn) {
        if (status === 1) {
            btn.style.backgroundColor = "#2ed573"; // เขียว
            btn.style.color = "white";
        } else {
            btn.style.backgroundColor = "#747d8c"; // เทา
            btn.style.color = "white";
        }
    }
}

// =====================
// 📝 OTHER FUNCTIONS (TIMER & STATUS)
// =====================
function updateStatusText() {
    const statusElement = document.getElementById('working-status');
    if (!statusElement) return;
    const isAuto = document.getElementById('v10_switch')?.checked;
    const systemText = isAuto ? "อัตโนมัติ (Smart Logic)" : "โหมดควบคุมเอง (Manual)"; 
    const menuSelect = document.getElementById('menu_select');
    let modeName = menuSelect && menuSelect.options[menuSelect.selectedIndex] ? menuSelect.options[menuSelect.selectedIndex].text : "กำลังโหลด...";

    let activeZones = [];
    ['v11_switch','v12_switch','v13_switch','v14_switch'].forEach((id, idx) => {
        if (document.getElementById(id)?.checked) activeZones.push(`โซนที่ ${idx+1}`);
    });

    if (activeZones.length > 0) {
        statusElement.innerText = `${activeZones.join(', ')} กำลังรดน้ำ | ระบบ : ${systemText} | โหมด : ${modeName}`;
        statusElement.style.color = "#336600"; 
    } else {
        statusElement.innerText = `ระบบพร้อมทำงาน | ระบบ : ${systemText} | โหมด : ${modeName}`;
        statusElement.style.color = "#747d8c";
    }
}

function saveTimer() {
    const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
    if (!selectedZone) return alert("เลือกโซนก่อน");
    const pinR1 = selectedZone.value;
    const pinR2 = "V" + (parseInt(pinR1.substring(1)) + 4);
    const s1 = timeToSeconds(document.getElementById('start_t1').value);
    const e1 = timeToSeconds(document.getElementById('stop_t1').value);
    const s2 = timeToSeconds(document.getElementById('start_t2').value);
    const e2 = timeToSeconds(document.getElementById('stop_t2').value);
    
    if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) return alert("กรอกเวลาให้ครบ");
    new Image().src = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pinR1}?value=${s1}&value=${e1}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    setTimeout(() => { new Image().src = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pinR2}?value=${s2}&value=${e2}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`; }, 500);
    alert("บันทึกสำเร็จ");
}

// =====================
// 🚀 START
// =====================
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchData();
    setInterval(fetchData, 5000);
});

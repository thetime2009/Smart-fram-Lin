// =====================
// 🔑 CONFIG & VARIABLES
// =====================
const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 
let farmChart; // ตัวแปรสำหรับคุมกราฟ

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
// 📊 CHART FUNCTIONS (FIXED VERSION)
// =====================
function initChart() {
    const ctx = document.getElementById('farmChart');
    if (!ctx) return;

    // 🔥 แก้ไข Error: ตรวจสอบและทำลายกราฟเดิมก่อนสร้างใหม่
    const existingChart = Chart.getChart("farmChart"); 
    if (existingChart) {
        existingChart.destroy();
    }

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
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { beginAtZero: false },
                x: { grid: { display: false } }
            }
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
    // เพิ่ม Pin V44-V47 สำหรับรอบที่ 2
    const pins = ['V10','V1','V0','V65','V18','V105','V106','V11','V12','V13','V14','V27','V40','V41','V42','V43','V44','V45','V46','V47','V88'];
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
        // อัปเดตกราฟเมื่อได้ค่าอุณหภูมิ (สมมติว่าดึง V0 มาพร้อมๆ กัน)
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

    // 🔧 AUTO MODE & SWITCHES
    if (pin === 'V10') {
        const isAuto = (val === "1");
        const sw = document.getElementById('v10_switch');
        if (sw) sw.checked = isAuto;
        ['v11_switch','v12_switch','v13_switch','v14_switch'].forEach(id => {
            if (document.getElementById(id)) document.getElementById(id).disabled = isAuto;
        });
    }

    const valveSwitch = document.getElementById(`${pin.toLowerCase()}_switch`);
    if (valveSwitch) valveSwitch.checked = (val === "1" || val === "255");

    // ⏰ TIMER TABLE & INPUT (รอบ 1: V40-V43, รอบ 2: V44-V47)
    if (['V40','V41','V42','V43','V44','V45','V46','V47'].includes(pin)) {
        let startSec = parseInt(parts[0]);
        let stopSec  = parseInt(parts[1]);
        let timeRange = secondsToTime(startSec) + " - " + secondsToTime(stopSec);
        
        // อัปเดตในตาราง
        const tableCell = document.getElementById(`${pin.toLowerCase()}_start`); // ใน HTML รอบ 2 ควรมี id เช่น v44_start
        if (tableCell) tableCell.innerText = secondsToTime(startSec);
        const stopCell = document.getElementById(`${pin.toLowerCase()}_stop`);
        if (stopCell) stopCell.innerText = secondsToTime(stopSec);

        // อัปเดตช่อง Input หากเลือกโซนนั้นอยู่
        const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
        if (selectedZone) {
            const currentPin = selectedZone.value; // รอบ 1
            const secondPin = "V" + (parseInt(currentPin.substring(1)) + 4); // คำนวณ Pin รอบ 2 (V40 -> V44)

            if (pin === currentPin) {
                document.getElementById('start_t1').value = secondsToTime(startSec);
                document.getElementById('stop_t1').value = secondsToTime(stopSec);
            } else if (pin === secondPin) {
                document.getElementById('start_t2').value = secondsToTime(startSec);
                document.getElementById('stop_t2').value = secondsToTime(stopSec);
            }
        }
    }
}

// =====================
// 📤 SEND & SAVE
// =====================
function updateBlynk(pin, value) {
    new Image().src = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${value}`;
    setTimeout(() => getBlynkData(pin), 1000);
}

function toggleBlynk(pin, isChecked) {
    updateBlynk(pin, isChecked ? 1 : 0);
}

function saveTimer() {
    const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
    if (!selectedZone) return alert("เลือกโซนก่อน");

    const pinR1 = selectedZone.value; // รอบ 1 (V40-V43)
    const pinR2 = "V" + (parseInt(pinR1.substring(1)) + 4); // รอบ 2 (V44-V47)

    const s1 = timeToSeconds(document.getElementById('start_t1').value);
    const e1 = timeToSeconds(document.getElementById('stop_t1').value);
    const s2 = timeToSeconds(document.getElementById('start_t2').value);
    const e2 = timeToSeconds(document.getElementById('stop_t2').value);

    if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) return alert("กรอกเวลาให้ครบทั้ง 2 รอบ");

    // ส่งค่าไป Blynk
    const url1 = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pinR1}?value=${s1}&value=${e1}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    const url2 = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pinR2}?value=${s2}&value=${e2}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;

    new Image().src = url1;
    setTimeout(() => { new Image().src = url2; }, 500);

    alert(`บันทึกสำเร็จสำหรับ ${selectedZone.id}`);
    setTimeout(() => fetchData(), 1500);
}

// ฟังก์ชันสำหรับดึงค่าปัจจุบันจาก Blynk มาแสดงผลในหน้า Config
async function syncConfigUI() {
    const configPins = ['V26', 'V30', 'V31', 'V55'];
    
    for (let pin of configPins) {
        try {
            const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`);
            const data = await response.json();
            const val = data[0];

            // อัปเดตตัวเลขหน้าจอ
            const label = document.getElementById(`${pin.toLowerCase()}-val`);
            if (label) label.innerText = val;

            // อัปเดตตำแหน่ง Slider
            const slider = document.getElementById(`input-${pin.toLowerCase()}`);
            if (slider) slider.value = val;
            
        } catch (error) {
            console.error(`Sync error for ${pin}:`, error);
        }
    }
}
// =====================
// 🚀 START
// =====================
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchData();
    setInterval(fetchData, 5000);
});

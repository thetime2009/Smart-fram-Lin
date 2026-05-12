// =====================
// 🔑 CONFIG & VARIABLES
// =====================
const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
// const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 
// แก้บรรทัดนี้: ใส่ URL ของ Google Apps Script ที่คุณ Deploy มา
const PROXY_URL = "https://script.google.com/macros/s/AKfycbzoFUp3IEQ1cXDYwhEA08FtBPHQfwZXP0OHc6QF_1tsHgQjKVPzVBlj-RPUJicS-M-T/exec";


let farmChart; // ตัวแปรสำหรับคุมกราฟ

const PIN_MAP = {
    'V1': { label: 'อุณหภูมิ', unit: '°C' },
    'V0': { label: 'ความชื้นอากาศ', unit: '%' },
    'V65': { label: 'ปริมาณฝน', unit: '' },
    'V88': { label: 'ความชื้นดิน', unit: '%' },
    'V18': { label: 'น้ำสะสมวันนี้', unit: ' L' },
    'V105': { label: 'ค่า VPD', unit: '' },
    'V106': { label: 'การคายน้ำ', unit: '' },
    'V10': { label: 'โหมดออโต้', unit: '' },
    'V11': { label: 'โซน 1', unit: '' },
    'V12': { label: 'โซน 2', unit: '' },
    'V13': { label: 'โซน 3', unit: '' },
    'V14': { label: 'โซน 4', unit: '' },
    'V40': { label: 'โซน 1 เวลารอบที่ 1', unit: '' },
    'V41': { label: 'โซน 2 เวลารอบที่ 1', unit: '' },
    'V42': { label: 'โซน 3 เวลารอบที่ 1', unit: '' },
    'V43': { label: 'โซน 4 เวลารอบที่ 1', unit: '' },
    'V50': { label: 'โซน 1 เวลารอบที่ 2', unit: '' },
    'V51': { label: 'โซน 2 เวลารอบที่ 2', unit: '' },
    'V52': { label: 'โซน 3 เวลารอบที่ 2', unit: '' },
    'V53': { label: 'โซน 4 เวลารอบที่ 2', unit: '' },


    
    'V27': { label: 'โหมดปัจจุบัน', unit: '' }
};

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
        // เปลี่ยนมาเรียกผ่าน Proxy แทนการเรียก Blynk ตรงๆ
        const response = await fetch(`${PROXY_URL}?action=get&pin=${pin}&t=${Date.now()}`);
        if (response.ok) {
            let rawData = await response.text();
            let data;
            try { 
                data = JSON.parse(rawData); 
            } catch { 
                data = rawData; 
            }
            updateUI(pin, data);
        }
    } catch (error) {
        console.error(`Error loading ${pin}:`, error);
    }
}

async function fetchData() {
    // เพิ่ม Pin V44-V47 สำหรับรอบที่ 2
    const pins = ['V10','V1','V0','V65','V18','V105','V106','V11','V12','V13','V14','V27','V40','V41','V42','V43','V50','V51','V52','V53','V88','V26','V30','V31','V55'];
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
    // เพิ่มส่วนนี้เข้าไปในฟังก์ชัน updateUI(pin, data) เดิมของคุณ
    // 🔧 ส่วนจัดการโหมดการทำงาน (V27)
    if (pin === 'V27') {
    const menuSelect = document.getElementById('menu_select');
    if (menuSelect) {
        // อัปเดตตัว Select ให้เลือกตามค่าที่มาจาก Blynk (1 หรือ 2)
        menuSelect.value = String(val); 
        // สั่งให้สถานะด้านล่างอัปเดตข้อความตาม
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

    const valveSwitch = document.getElementById(`${pin.toLowerCase()}_switch`);
    if (valveSwitch) valveSwitch.checked = (val === "1" || val === "255");

    // ⏰ TIMER TABLE & INPUT (รอบ 1: V40-V43, รอบ 2: V50-V53)
    if (['V40','V41','V42','V43','V50','V51','V52','V53'].includes(pin)) {
        let startSec = parseInt(parts[0]);
        let stopSec  = parseInt(parts[1]);
        let timeRange = secondsToTime(startSec) + " - " + secondsToTime(stopSec);
        
        // อัปเดตในตาราง
        const tableCell = document.getElementById(`${pin.toLowerCase()}_start`); // ใน HTML รอบ 2 ควรมี id เช่น v50_start
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
    // เพิ่มบรรทัดนี้ไว้ท้ายสุดของฟังก์ชัน updateUI
    updateStatusText();
    // เพิ่มบรรทัดนี้เพื่อแสดงในหน้า Log
    // --- เพิ่ม 2 บรรทัดนี้ ---
    addLog(pin, val);              // แสดงใน Terminal ดำๆ
    updateLiveLabels(pin, val);    // แสดงในกล่อง Label ด้านล่าง
}

// =====================
// 📤 SEND & SAVE
// =====================
function updateBlynk(pin, value) {
    // เลิกใช้ new Image().src เพราะมันจัดการ Error ยากและติด HTTPS
    fetch(`${PROXY_URL}?action=update&pin=${pin}&value=${value}`)
        .then(() => {
            addLog(`Write ${pin}`, value);
            setTimeout(() => getBlynkData(pin), 1000);
        })
        .catch(err => console.error("Send Error:", err));
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

     // --- แก้ไขตรงนี้ ---
    // ใช้ action=update และยิงผ่าน PROXY_URL เพื่อให้ iOS ใช้งานได้
    const val1 = `${s1}&value=${e1}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    const requestUrl1 = `${PROXY_URL}?action=update&pin=${pinR1}&value=${val1}`;
    
    const val2 = `${s2}&value=${e2}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    const requestUrl2 = `${PROXY_URL}?action=update&pin=${pinR2}&value=${val2}`;

    // เปลี่ยนชื่อตัวแปรเป็น requestUrl1 เพื่อไม่ให้ซ้ำกับของเก่า (ถ้ามีค้างอยู่)
    fetch(requestUrl1)
        .then(() => {
            setTimeout(() => { fetch(requestUrl2); }, 500);
            alert(`บันทึกสำเร็จสำหรับ ${selectedZone.id}`);
            setTimeout(() => fetchData(), 1500);
        })
        .catch(err => console.error("Timer Save Error:", err));
    

    // ส่งค่าไป Blynk
    const url1 = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pinR1}?value=${s1}&value=${e1}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;
    const url2 = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pinR2}?value=${s2}&value=${e2}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;

    new Image().src = url1;
    setTimeout(() => { new Image().src = url2; }, 500);

    alert(`บันทึกสำเร็จสำหรับ ${selectedZone.id}`);
    setTimeout(() => fetchData(), 1500);
}
// =====================
// 🛰️ SEND DATA TO BLYNK (NEW)
// =====================

/**
 * ฟังก์ชันส่งค่าจากหน้าเว็บไปยัง Blynk Server
 * ใช้สำหรับ Slider ในหน้า Config (V26, V30, V31, V55)
 */
async function sendToBlynk(pin, value) {
    const url = `${PROXY_URL}?action=update&pin=${pin}&value=${value}`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log(`[Blynk Update] Success: ${pin} = ${value}`);
            updateConfigUI(pin, value);
        }
    } catch (error) {
        console.error(`[Blynk Update] Error:`, error);
    }
}

// =====================
// 🚀 INITIAL FETCH FOR CONFIG
// =====================
// =====================
// 🔧 1. ประกาศฟังก์ชันจัดการ UI (ต้องอยู่ก่อนการเรียกใช้)
// =====================
function updateConfigUI(pin, val) {
    const configPins = ['V26', 'V30', 'V31', 'V55'];
    if (configPins.includes(pin)) {
        const pinKey = pin.toLowerCase();
        
        // อัปเดตตัวเลข
        const label = document.getElementById(`${pinKey}-val`);
        if (label) label.innerText = val;

        // อัปเดต Slider
        const slider = document.getElementById(`input-${pinKey}`);
        if (slider) slider.value = val;
        
        console.log(`[Config Sync] ${pin} updated to: ${val}`);
    }
}

// =====================
// 🚀 2. ฟังก์ชันโหลดข้อมูล (ที่เรียกใช้ updateConfigUI)
// =====================
async function syncBlynkConfig() {
    const configPins = ['V26', 'V30', 'V31', 'V55'];
    // ส่ง pins ไปเป็น comma-separated string เช่น V26,V30,V31,V55
    const url = `${PROXY_URL}?action=multi-get&pins=${configPins.join(',')}`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json(); // จะได้ {V26: [val], V30: [val], ...}
            
            configPins.forEach(pin => {
                if (data[pin]) {
                    const val = data[pin][0];
                    updateConfigUI(pin, val);
                }
            });
        }
    } catch (error) {
        console.error("Batch Sync Error:", error);
    }
}

// =====================
// 🎯 3. จุดเริ่มต้นการทำงาน (Event Listeners)
// =====================
window.addEventListener('DOMContentLoaded', () => {
    syncBlynkConfig();
});

// =====================
// 📝 STATUS TEXT GENERATOR
// =====================

function updateStatusText() {
    const statusElement = document.getElementById('working-status');
    if (!statusElement) return;

    // 1. ตรวจสอบระบบ (Auto/Manual) จาก Switch V10
    const isAuto = document.getElementById('v10_switch')?.checked;
    const systemText = isAuto ? "ระบบอัตโนมัติ (Smart Logic)" : "โหมดควบคุมเอง (Manual)"; 
    
    // 2. ดึงข้อความโหมดจาก Select ที่มี id="menu_select"
    const menuSelect = document.getElementById('menu_select');
    let modeName = "กำลังโหลด...";
    
    if (menuSelect && menuSelect.options[menuSelect.selectedIndex]) {
        // ดึงข้อความภาษาไทยข้างใน <option> เช่น "⏰ โหมดตั้งเวลา..."
        modeName = menuSelect.options[menuSelect.selectedIndex].text;
    }

    // 3. ตรวจสอบโซนที่กำลังทำงาน
    let activeZones = [];
    if (document.getElementById('v11_switch')?.checked) activeZones.push("โซนที่ 1");
    if (document.getElementById('v12_switch')?.checked) activeZones.push("โซนที่ 2");
    if (document.getElementById('v13_switch')?.checked) activeZones.push("โซนที่ 3");
    if (document.getElementById('v14_switch')?.checked) activeZones.push("โซนที่ 4");

    // 4. แสดงผลลัพธ์
    if (activeZones.length > 0) {
        statusElement.innerText = `${activeZones.join(', ')} กำลังรดน้ำ | ระบบ : ${systemText} | โหมด : ${modeName}`;
        statusElement.style.color = "#336600"; 
    } else {
        statusElement.innerText = `ระบบพร้อมทำงาน | ระบบ : ${systemText} | โหมด : ${modeName}`;
        statusElement.style.color = "#747d8c";
    }
}
// ฟังก์ชันสำหรับเพิ่มข้อความลงใน Log
function addLog(pin, value) {
    const logContainer = document.getElementById('log-container');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + 
                    now.getMinutes().toString().padStart(2, '0') + ":" + 
                    now.getSeconds().toString().padStart(2, '0');
    
    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '5px';
    logEntry.style.borderBottom = '1px solid #333';
    logEntry.style.paddingBottom = '3px';
    
    // แต่งสีตามประเภทข้อมูล
    let color = "#2ecc71"; // สีเขียวสำหรับค่าทั่วไป
    if(pin.includes('V')) color = "#3498db"; // สีฟ้าสำหรับ Pin

    logEntry.innerHTML = `<span style="color: #888;">[${timeStr}]</span> 
                          <span style="color: ${color}; fw-bold">Update ${pin}:</span> 
                          <span style="color: #f1c40f;">${value}</span>`;
    
    logContainer.prepend(logEntry); // เอาข้อมูลใหม่ไว้บนสุด

    // จำกัดจำนวน Log ไม่ให้เยอะเกินไป (เช่น 100 รายการ)
    if (logContainer.childNodes.length > 100) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// ฟังก์ชันล้าง Log
function clearLogs() {
    document.getElementById('log-container').innerHTML = '<div class="text-muted small">[ระบบ] ล้างข้อมูลสำเร็จ...</div>';
}

function updateLiveLabels(pin, val) {
    const container = document.getElementById('live-labels-container');
    const pinInfo = PIN_MAP[pin];
    if (!pinInfo) return; // ถ้าไม่มีใน Map ไม่ต้องสร้าง Card

    let cardId = `card-${pin}`;
    let cardElement = document.getElementById(cardId);

    // ถ้ายังไม่มีการสร้าง Card ของ Pin นี้ ให้สร้างขึ้นมาใหม่
    if (!cardElement) {
        cardElement = document.createElement('div');
        cardElement.className = 'col-6 col-md-3 col-lg-2'; // จัดเรียงแถวละ 6 กล่อง (จอใหญ่)
        cardElement.id = cardId;
        container.appendChild(cardElement);
    }

    // จัดการข้อความพิเศษสำหรับบาง Pin
    let displayVal = val;
    if (pin === 'V106') displayVal = (val === "1" ? "คายน้ำสูง" : val === "2" ? "คายน้ำดีมาก" : val);
    if (['V10','V11','V12','V13','V14'].includes(pin)) displayVal = (val === "1" || val === "255" ? "เปิด" : "ปิด");

    // ใส่ข้อมูลลงใน Card
    cardElement.innerHTML = `
        <div class="log-card" style="border-left-color: ${pin.startsWith('V1') ? '#ff4757' : '#2ecc71'}">
            <div class="pin-name">${pin} ${pinInfo.label}</div>
            <div class="pin-value">${displayVal}${pinInfo.unit}</div>
        </div>
    `;
}
// =====================
// 🚀 START
// =====================
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchData();
    setInterval(fetchData, 5000);
});

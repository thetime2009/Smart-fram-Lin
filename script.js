const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

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

// =====================
// 🔥 FIX BLYNK DATA PARSE
// =====================
function parseBlynkTime(data) {
    let raw = String(data).replace(/[\[\]"']/g, '');

    // รวมก่อน แล้วแยกด้วย \x00
    let merged = raw.split(',').join(',');
    let parts = merged.split('\x00').filter(x => x !== '');

    return parts;
}

// =====================
// 📡 GET DATA
// =====================
async function getBlynkData(pin) {
    try {
        const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}?t=${Date.now()}`);

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
        console.error(`โหลด ${pin} ไม่ได้:`, error);
    }
}

// =====================
// 🔁 LOOP FETCH
// =====================
async function fetchData() {
    const pins = ['V10','V1','V0','V65','V18','V105','V106','V11','V12','V13','V14','V27','V40','V41','V42','V43','V88'];

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

    console.log("PIN:", pin, parts);

    let val = parts[0];
    let cleanValue = val;

    // =====================
    // 🔧 AUTO MODE
    // =====================
    if (pin === 'V10') {
        const isAuto = (val === "1");

        const v10Switch = document.getElementById('v10_switch');
        if (v10Switch) v10Switch.checked = isAuto;

        ['v11_switch','v12_switch','v13_switch','v14_switch'].forEach(id => {
            const sw = document.getElementById(id);
            if (sw) {
                sw.disabled = isAuto;
                if (isAuto) sw.checked = false;
            }
        });
    }

    // =====================
    // 🔘 SWITCH
    // =====================
    const valveSwitch = document.getElementById(`${pin.toLowerCase()}_switch`);
    if (valveSwitch) {
        valveSwitch.checked = (val === "1" || val === "255");
    }

   // =====================
// ⏰ TIME INPUT (FIX COMPLETE)
// =====================
if (['V40','V41','V42','V43'].includes(pin)) {

    // 🔥 กันเคสไม่มี timer (สำคัญมาก)
    if (!parts || parts.length < 2) {

        const startTable = document.getElementById(`${pin.toLowerCase()}_start`);
        const stopTable  = document.getElementById(`${pin.toLowerCase()}_stop`);
        const dayTable   = document.getElementById(`${pin.toLowerCase()}_day`);

        if (startTable) startTable.innerText = "--:--";
        if (stopTable)  stopTable.innerText  = "--:--";
        if (dayTable)   dayTable.innerText   = "--";

        // เคลียร์ input ด้วย
        const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
        if (selectedZone && selectedZone.value === pin) {
            const startInput = document.getElementById('start_t');
            const stopInput  = document.getElementById('stop_t');

            if (startInput) startInput.value = "";
            if (stopInput)  stopInput.value  = "";
        }

        return;
    }

    // 🔥 parse แบบปลอดภัย
    let startSec = parseInt(parts[0]);
    let stopSec  = parseInt(parts[1]);

    let startTime = (!isNaN(startSec)) ? secondsToTime(startSec) : "--:--";
    let stopTime  = (!isNaN(stopSec))  ? secondsToTime(stopSec)  : "--:--";

    let dayText = (parts.length > 3) ? "Everyday" : "--";

    // ตาราง
    const startTable = document.getElementById(`${pin.toLowerCase()}_start`);
    const stopTable  = document.getElementById(`${pin.toLowerCase()}_stop`);
    const dayTable   = document.getElementById(`${pin.toLowerCase()}_day`);

    if (startTable) startTable.innerText = startTime;
    if (stopTable)  stopTable.innerText  = stopTime;
    if (dayTable)   dayTable.innerText   = dayText;

    // input
    const selectedZone = document.querySelector('input[name="timer_zone"]:checked');

    if (selectedZone && selectedZone.value === pin) {

        const startInput = document.getElementById('start_t');
        const stopInput  = document.getElementById('stop_t');

        // 🔥 กัน format พัง
        if (startInput) startInput.value = /^\d{2}:\d{2}$/.test(startTime) ? startTime : "";
        if (stopInput)  stopInput.value  = /^\d{2}:\d{2}$/.test(stopTime)  ? stopTime  : "";
    }

    return;
}

    // =====================
    // 🌡️ SENSOR
    // =====================
    if (pin === 'V1') document.getElementById('temp').innerText = cleanValue + "°C";
    if (pin === 'V0') document.getElementById('humi').innerText = cleanValue + "%";
    if (pin === 'V65') document.getElementById('rain').innerText = cleanValue;

    if (pin === 'V18') {
        let v = parseFloat(cleanValue);
        document.getElementById('water_used').innerText = !isNaN(v) ? v.toFixed(2)+" (ลิตร)" : "0.00 (ลิตร)";
    }

    if (pin === 'V105') {
        let v = parseFloat(cleanValue);
        document.getElementById('vpd_val').innerText = !isNaN(v) ? v.toFixed(2) : "0.00";
    }

    if (pin === 'V88') document.getElementById('soil').innerText = cleanValue + "%";

    if (pin === 'V106') {
        let txt = cleanValue === "1" ? "คายน้ำสูง" :
                  cleanValue === "2" ? "คายน้ำดีมาก" :
                  cleanValue;
        document.getElementById('status_val').innerText = txt;
    }

    // =====================
    // 🔧 MENU
    // =====================
    if (pin === 'V27') {
        const menu = document.getElementById('menu_select');
        if (menu) menu.value = cleanValue;
    }

    // =====================
    // 🎛️ BUTTON
    // =====================
    const isOn = (cleanValue === "1" || cleanValue === "255");

    const btnMap = {
        'V11':'btn-z1',
        'V12':'btn-z2',
        'V13':'btn-z3',
        'V14':'btn-z4'
    };

    if (btnMap[pin]) updateBtnStyle(btnMap[pin], isOn);
}

// =====================
// 🎨 BUTTON STYLE
// =====================
function updateBtnStyle(id, isOn) {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.classList.toggle('btn-success', isOn);
    btn.classList.toggle('btn-outline-success', !isOn);
}

// =====================
// 📤 SEND DATA
// =====================
function updateBlynk(pin, value) {
    new Image().src = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${value}`;
    setTimeout(() => getBlynkData(pin), 1000);
}

function toggleBlynk(pin, isChecked) {
    updateBlynk(pin, isChecked ? 1 : 0);
}

// =====================
// 💾 SAVE TIMER
// =====================
function saveTimer() {
    const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
    if (!selectedZone) return alert("เลือกโซนก่อน");

    const pin = selectedZone.value;

    const startStr = document.getElementById('start_t').value;
    const stopStr  = document.getElementById('stop_t').value;

    if (!startStr || !stopStr) return alert("กรอกเวลาให้ครบ");

    const startSec = timeToSeconds(startStr);
    const stopSec  = timeToSeconds(stopStr);

    const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${startSec}&value=${stopSec}&value=Asia/Bangkok&value=1,2,3,4,5,6,7`;

    new Image().src = url;

    alert(`บันทึก: ${startStr} - ${stopStr}`);
    setTimeout(() => getBlynkData(pin), 1500);
}

// =====================
// 🚀 START
// =====================
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setInterval(fetchData, 5000);
});

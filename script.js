// =====================
// 🎯 MAIN UI UPDATE (ฉบับแก้ไขแสดงผลไฮไลท์ตาราง)
// =====================
function updateUI(pin, data) {
    if (!data) return;

    let parts = parseBlynkTime(data);
    let val = parts[0];
    let cleanValue = val;
    let isOn = (val === "1" || val === "255"); // สถานะเปิด/ปิด

    // =====================
    // 📊 UPDATE TABLE HIGHLIGHT (ส่วนที่เพิ่มใหม่)
    // =====================
    // ตรวจสอบว่า Pin ที่ได้รับเป็นโซนรดน้ำ (V11-V14) หรือไม่
    const zonePins = ['V11', 'V12', 'V13', 'V14'];
    if (zonePins.includes(pin)) {
        const rowId = `row_${pin.toLowerCase()}`; // เช่น row_v11
        const tableRow = document.getElementById(rowId);
        
        if (tableRow) {
            if (isOn) {
                tableRow.classList.add('active-row'); // เพิ่มสีไฮไลท์เมื่อเปิด
            } else {
                tableRow.classList.remove('active-row'); // เอาสีออกเมื่อปิด
            }
        }
    }

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
        valveSwitch.checked = isOn;
    }

    // =====================
    // ⏰ TIME INPUT (คงเดิม)
    // =====================
    if (['V40','V41','V42','V43'].includes(pin)) {
        if (!parts || parts.length < 2) {
            const startTable = document.getElementById(`${pin.toLowerCase()}_start`);
            const stopTable  = document.getElementById(`${pin.toLowerCase()}_stop`);
            const dayTable   = document.getElementById(`${pin.toLowerCase()}_day`);
            if (startTable) startTable.innerText = "--:--";
            if (stopTable)  stopTable.innerText  = "--:--";
            if (dayTable)   dayTable.innerText   = "--";
            return;
        }

        let startSec = parseInt(parts[0]);
        let stopSec  = parseInt(parts[1]);
        let startTime = (!isNaN(startSec)) ? secondsToTime(startSec) : "--:--";
        let stopTime  = (!isNaN(stopSec))  ? secondsToTime(stopSec)  : "--:--";

        const startTable = document.getElementById(`${pin.toLowerCase()}_start`);
        const stopTable  = document.getElementById(`${pin.toLowerCase()}_stop`);
        if (startTable) startTable.innerText = startTime;
        if (stopTable)  stopTable.innerText  = stopTime;

        const selectedZone = document.querySelector('input[name="timer_zone"]:checked');
        if (selectedZone && selectedZone.value === pin) {
            const startInput = document.getElementById('start_t');
            const stopInput  = document.getElementById('stop_t');
            if (startInput) startInput.value = /^\d{2}:\d{2}$/.test(startTime) ? startTime : "";
            if (stopInput)  stopInput.value  = /^\d{2}:\d{2}$/.test(stopTime)  ? stopTime  : "";
        }
        return;
    }

    // =====================
    // 🌡️ SENSOR (คงเดิม)
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
        let txt = cleanValue === "1" ? "คายน้ำสูง" : cleanValue === "2" ? "คายน้ำดีมาก" : cleanValue;
        document.getElementById('status_val').innerText = txt;
    }

    // =====================
    // 🔧 MENU & BUTTON (คงเดิม)
    // =====================
    if (pin === 'V27') {
        const menu = document.getElementById('menu_select');
        if (menu) menu.value = cleanValue;
    }

    const btnMap = { 'V11':'btn-z1', 'V12':'btn-z2', 'V13':'btn-z3', 'V14':'btn-z4' };
    if (btnMap[pin]) updateBtnStyle(btnMap[pin], isOn);
}

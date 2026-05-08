const API_URL = "https://script.google.com/macros/s/AKfycbw3sCj0MIpH4P-4Nslp0QTM4YhCM6pGIpIWDiyZ0aK02PJACXdzw1jXQfFdlMCEYEVtTQ/exec";

// ================= TIME =================
function minutesToTime(minutes) {
    if (minutes === null || isNaN(minutes) || minutes < 0) return "--:--";
    const hrs = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = Math.floor(minutes % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':');
    return (parseInt(hrs) * 60) + parseInt(mins);
}

// ================= FETCH =================
async function getBlynkData(pin) {
    try {
        const res = await fetch(`${API_URL}?action=get&pin=${pin}`);
        const raw = await res.text();
        updateUI(pin, raw.replace(/[\[\]"']/g, '').trim());
    } catch (e) { console.error(e); }
}

function fetchData() {
    ['V10','V1','V0','V65','V18','V105','V106','V11','V12','V13','V14','V27','V40','V41','V42','V43']
    .forEach(pin => getBlynkData(pin));
}

// ================= UI =================
function updateUI(pin, val) {

    let parts = String(val).split(',');

    if (['V40','V41','V42','V43'].includes(pin)) {
        let start = parseInt(parts[0]);
        let stop = parseInt(parts[1]);

        document.getElementById(pin.toLowerCase()+"_start").innerText = minutesToTime(start);
        document.getElementById(pin.toLowerCase()+"_stop").innerText = minutesToTime(stop);
        return;
    }

    if (pin==='V1') document.getElementById('temp').innerText = val+"°C";
    if (pin==='V0') document.getElementById('soil').innerText = val+"%";
    if (pin==='V65') document.getElementById('rain').innerText = val;
    if (pin==='V18') document.getElementById('water_used').innerText = val;
    if (pin==='V105') document.getElementById('vpd_val').innerText = val;
    if (pin==='V106') document.getElementById('status_val').innerText = val;

    if (pin==='V10') document.getElementById('v10_switch').checked = (val==="1");

    const btnMap = {'V11':'btn-z1','V12':'btn-z2','V13':'btn-z3','V14':'btn-z4'};
    if (btnMap[pin]) {
        document.getElementById(btnMap[pin]).classList.toggle('btn-success', val==="1");
    }
}

// ================= CONTROL =================
function updateBlynk(pin, value) {
    fetch(`${API_URL}?action=update&pin=${pin}&value=${value}`);
}

function toggleBlynk(pin, state) {
    updateBlynk(pin, state ? 1 : 0);
}

// ================= TIMER =================
function saveTimer() {
    const zone = document.querySelector('input[name="timer_zone"]:checked');
    if (!zone) return alert("เลือกโซน");

    const start = timeToMinutes(document.getElementById('start_t').value);
    const stop = timeToMinutes(document.getElementById('stop_t').value);

    fetch(`${API_URL}?action=timer&pin=${zone.value}&start=${start}&stop=${stop}`);
    alert("บันทึกแล้ว");
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", ()=>{
    fetchData();
    setInterval(fetchData, 5000);
});

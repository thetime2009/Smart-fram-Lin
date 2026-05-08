const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

async function fetchData() {
    try {
        const pins = ['V37', 'V36', 'V65', 'V29'];
        
        for (let pin of pins) {
            const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`);
            if (response.ok) {
                const data = await response.json(); 
                // จัดการข้อมูล: ถ้ามาเป็น ["40"] ให้เอาแค่ 40
                let value = Array.isArray(data) ? data[0] : data;
                updateUI(pin, value);
            }
        }
    } catch (error) {
        console.error("ไม่สามารถดึงข้อมูลจาก Server ได้:", error);
    }
}

function updateUI(pin, value) {
    // ลบตัวอักษรที่ไม่ใช่ตัวเลขหรือจุดทศนิยมออก (เช่น [ ] " )
    if (value === undefined || value === null) return;
    let cleanValue = String(value).replace(/[\[\]" ]/g, ''); 

    const elementMap = {
        'V37': 'temp',
        'V36': 'soil',
        'V65': 'rain',
        'V29': 'water_used'
    };

    const elementId = elementMap[pin];
    if (elementId) {
        let suffix = "";
        if (pin === 'V37') suffix = "°C";
        if (pin === 'V36') suffix = "%";
        
        document.getElementById(elementId).innerText = cleanValue + suffix;
    }
}

async function updateBlynk(pin, value) {
    try {
        const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${value}`;
        // ใช้โหมด no-cors หากเจอปัญหา Mixed Content บล็อกการส่ง
        await fetch(url, { mode: 'no-cors' }); 
        console.log(`สั่งงานสำเร็จ: ${pin} เป็น ${value}`);
    } catch (error) {
        console.error("สั่งงานไม่สำเร็จ:", error);
    }
}

function toggleBlynk(pin, isChecked) {
    const val = isChecked ? 1 : 0;
    updateBlynk(pin, val);
}

function stopAllRelays() {
    ['V1', 'V2', 'V3', 'V4'].forEach(pin => updateBlynk(pin, 0));
}

// ปรับเวลาเป็น 5 วินาทีเพื่อลดภาระของ Private Server
setInterval(fetchData, 5000);
fetchData();

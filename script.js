const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
const BLYNK_URL = "https://blynk.iot-cm.com:8080/"; 

async function fetchData() {
    try {
        const pins = ['V37', 'V36', 'V65', 'V29'];
        for (let pin of pins) {
            // ลองใช้แบบดึงผ่าน proxy หรือลดระดับความเข้มงวด
            const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`, {
                method: 'GET'
            });
            
            if (response.ok) {
                const data = await response.json(); 
                let value = Array.isArray(data) ? data[0] : data;
                updateUI(pin, value);
            }
        }
    } catch (error) {
        console.error("Connection Error:", error);
        // ถ้าตัวเลขยังไม่ขึ้น ให้ลองเช็ค Console อีกทีว่าติดเรื่อง Mixed Content หรือเปล่า
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

const BLYNK_TOKEN = "r6cAEnogc2zRH2BkAr7TTESFcya1osDf";
// เปลี่ยนเป็นโดเมนและพอร์ตของ Private Server ที่คุณใช้งาน
const BLYNK_URL = "http://blynk.iot-cm.com:8080/"; 

async function fetchData() {
    try {
        // ดึงค่าจาก Virtual Pins
        const pins = ['V37', 'V36', 'V65', 'V29'];
        
        for (let pin of pins) {
            // โครงสร้าง API ของ Private Server: http://domain:port/auth_token/get/Vpin
            const response = await fetch(`${BLYNK_URL}${BLYNK_TOKEN}/get/${pin}`);
            if (response.ok) {
                const data = await response.json(); 
                // ค่าที่ได้จาก Legacy มักจะเป็น Array เช่น [25.5]
                updateUI(pin, data[0]);
            }
        }
    } catch (error) {
        console.error("ไม่สามารถดึงข้อมูลจาก Server ได้:", error);
    }
}

async function updateBlynk(pin, value) {
    try {
        // โครงสร้าง API สำหรับสั่งงาน: http://domain:port/auth_token/update/Vpin?value=xxx
        const url = `${BLYNK_URL}${BLYNK_TOKEN}/update/${pin}?value=${value}`;
        await fetch(url);
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
    // ปิดวาล์ว V1 ถึง V4
    ['V1', 'V2', 'V3', 'V4'].forEach(pin => updateBlynk(pin, 0));
}

// ตั้งเวลาดึงข้อมูลใหม่ทุก 3 วินาที (ไม่ควรเร็วเกินไปสำหรับ Private Server)
setInterval(fetchData, 3000);
fetchData();

"use client";

import { useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { UAParser } from "ua-parser-js"; 
import DeviceCard from "./components/DeviceCard"; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState(""); // User ko dikhane ke liye ki kya ho rha hai

  // --- REDIRECTION LOGIC ---
  const performRedirection = (deviceType, osName) => {
    setStatusMsg(`Detected ${deviceType}. Redirecting...`);

    // 1. DESKTOP / LAPTOP / TABLET -> Go to Web Portal
    // Note: UAParser tablet ko alag manta hai, isliye hum check kar rahe hain
    if (deviceType !== "Mobile") {
       setTimeout(() => {
         window.location.href = "https://sajpeweb.raavan.site/";
       }, 1500); // 1.5 sec delay taaki user card dekh sake
       return;
    }

    // 2. MOBILE (Android/iOS) -> Go to App or Play Store
    if (deviceType === "Mobile") {
       const appScheme = "sajpe://home"; // ⚠️ IMPORTANT: Aapke App ka Deep Link Scheme yahan dalein
       const playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_pe";
       
       // iOS Specific (Optional: App Store link logic alag ho sakti hai)
       // const appStoreLink = "https://apps.apple.com/app-id";

       setStatusMsg("Launching App...");
       
       // Step A: Try to open the App
       window.location.href = appScheme;

       // Step B: Fallback to Play Store if App doesn't open
       // Logic: Agar app khul gyi, to browser background me chala jayega aur timeout delay ho jayega.
       // Agar app nahi khuli, to browser wahi rahega aur turant Play Store redirect kar dega.
       setTimeout(() => {
         const confirmFallback = window.confirm("SajPe App not found. Go to Play Store?");
         if (confirmFallback) {
            window.location.href = playStoreLink;
         }
       }, 2000);
    }
  };

  const handleScan = async () => {
    setLoading(true);
    setError("");
    setDeviceData(null);
    setStatusMsg("Scanning Device...");

    try {
      // --- 1. DEVICE TYPE DETECTION ---
      const parser = new UAParser();
      const result = parser.getResult();

      // OS Name
      const osName = result.os.name;
      const osVersion = result.os.version;
      const exactOS = `${osName} ${osVersion}`.trim();

      // Browser
      const browserName = result.browser.name;

      // Device Type Logic
      let rawType = result.device.type; // mobile, tablet, smarttv, wearable, embedded
      let deviceType = "Desktop / Laptop"; // Default

      if (rawType) {
        // Capitalize (mobile -> Mobile)
        deviceType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
      }

      // --- 2. FINGERPRINT & IP (Keeping your logic) ---
      const fp = await FingerprintJS.load();
      const fpResult = await fp.get();
      const strongDeviceID = fpResult.visitorId; 

      let ipAddress = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        ipAddress = ipJson.ip;
      } catch (e) { console.warn("IP Error"); }

      // --- 3. LOCATION ---
      let locationInfo = { lat: null, lon: null, city: "Permission Denied", state: "", full_address: "" };
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'granted') {
          const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
          const { latitude, longitude } = position.coords;
          locationInfo.lat = latitude;
          locationInfo.lon = longitude;
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const geoJson = await geoRes.json();
          locationInfo.city = geoJson.address.city || "Unknown";
          locationInfo.state = geoJson.address.state || "";
          locationInfo.full_address = geoJson.display_name;
        } 
      } catch (err) { console.warn("Silent Location Check Failed"); }

      // --- 4. SET DATA ---
      const finalPayload = {
        identity: { stable_hardware_id: strongDeviceID },
        network: { ip_address: ipAddress },
        location: locationInfo,
        device_specs: {
          type: deviceType,
          os: exactOS,
          browser: browserName,
          model: result.device.model || "Generic System"
        }
      };

      setDeviceData(finalPayload);
      console.log("🚀 USER DATA:", finalPayload);

      // --- 5. TRIGGER REDIRECTION ---
      // Data set hone ke baad redirect logic call karein
      performRedirection(deviceType, osName);

    } catch (err) {
      console.error(err);
      setError("Scan Failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-950 text-white">
      <div className="text-center max-w-lg mb-8">
        <h1 className="text-3xl font-bold text-blue-400 mb-2">Super Device Scanner</h1>
        <p className="text-gray-400 text-sm">Detect & Redirect Securely</p>
      </div>

      <button
        onClick={handleScan}
        disabled={loading}
        className={`px-8 py-4 rounded-full font-bold text-lg shadow-lg transition-all ${loading ? "bg-gray-700" : "bg-green-600 hover:bg-green-500"}`}
      >
        {loading ? "Processing..." : "📍 Scan & Navigate"}
      </button>

      {/* Status Message for Redirection */}
      {statusMsg && <p className="mt-4 text-yellow-400 font-mono text-sm animate-pulse">{statusMsg}</p>}
      
      {error && <p className="mt-4 text-red-400">{error}</p>}

      <DeviceCard data={deviceData} />
    </main>
  );
}
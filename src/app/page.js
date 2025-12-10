"use client";

import { useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { UAParser } from "ua-parser-js"; 
import DeviceCard from "./components/DeviceCard"; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState(""); 

  // --- REDIRECTION LOGIC (UPDATED) ---
  const performRedirection = (deviceType, osName) => {
    setStatusMsg(`Detected ${deviceType}. Processing...`);

    // 1. DESKTOP / LAPTOP -> Go to Web Portal
    if (deviceType !== "Mobile" && deviceType !== "Tablet") {
       setTimeout(() => {
         window.location.href = "https://sajpeweb.raavan.site/";
       }, 1500); 
       return;
    }

    // 2. MOBILE / TABLET -> App Deep Linking Logic
    if (deviceType === "Mobile" || deviceType === "Tablet") {
       const appScheme = "sajpe://home"; // Deep Link
       const playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_pe";

       setStatusMsg("Opening App...");
       
       // --- MAGIC LOGIC START ---
       
       // Step A: Record Start Time
       const start = Date.now();

       // Step B: Try to Open App immediately
       // Agar app installed hai, to OS browser ko minimize kar dega
       window.location.href = appScheme;

       // Step C: Fallback Timer (2.5 Seconds)
       setTimeout(() => {
         // Check: Kya browser abhi bhi hidden nahi hai?
         // Agar App khul jati, to user app me chala jata aur browser 'hidden' ho jata.
         // Agar user abhi bhi yahi hai, iska matlab App nahi khuli.
         
         const end = Date.now();
         const elapsed = end - start;

         // Agar time difference normal hai (matlab browser freeze nahi hua app khulne ki wajah se)
         // Aur document abhi bhi visible hai
         if (elapsed < 3000 && !document.hidden) {
            setStatusMsg("App not found. Redirecting to Play Store...");
            window.location.href = playStoreLink;
         }
       }, 2500); 
       // --- MAGIC LOGIC END ---
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

      const osName = result.os.name;
      const osVersion = result.os.version;
      const exactOS = `${osName} ${osVersion}`.trim();
      const browserName = result.browser.name;

      let rawType = result.device.type; 
      let deviceType = "Desktop / Laptop"; 

      if (rawType) {
        deviceType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
      }

      // --- 2. FINGERPRINT & IP ---
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

      {/* Status Message */}
      {statusMsg && <p className="mt-4 text-yellow-400 font-mono text-sm animate-pulse">{statusMsg}</p>}
      
      {error && <p className="mt-4 text-red-400">{error}</p>}

      <DeviceCard data={deviceData} />
    </main>
  );
}
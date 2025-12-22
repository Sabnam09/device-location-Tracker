"use client";

import { useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { UAParser } from "ua-parser-js";
import DeviceCard from "./components/DeviceCard";
import { saveDeviceDataSecurely, getAddressFromGPS } from "./actions";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [currentType, setCurrentType] = useState(null);
  const [currentCode, setCurrentCode] = useState(null);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const info = getReferralInfo();
    setCurrentType(info.type);
    setCurrentCode(info.code);

    // Agar URL me data hai to process start karo
    if (info.type && info.code) {
      handleScanAndNavigate(info.type, info.code);
    }
  }, []);

  const getReferralInfo = (manualType = null, manualCode = null) => {
    if (manualType) return { type: manualType, code: manualCode };
    if (typeof window === "undefined") return { type: null, code: null };

    const segments = window.location.pathname.split('/').filter(Boolean);
    return {
      type: segments[0] || null,
      code: segments[2] || null
    };
  };

  // --- 2. SILENT LOCATION (No Permission Prompt) ---
  const getSilentLocation = async () => {
    let locationInfo = { lat: null, lon: null, city: "Unknown", state: "", full_address: "" };

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        
        // Sirf 'granted' hone par hi location lenge
        if (permissionStatus.state === 'granted') {
          const position = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
          );

          const { latitude, longitude } = position.coords;
          locationInfo.lat = latitude;
          locationInfo.lon = longitude;

          const geoJson = await getAddressFromGPS(latitude, longitude);
          if (geoJson && geoJson.address) {
            locationInfo.city = geoJson.address.city || geoJson.address.town || "Unknown";
            locationInfo.state = geoJson.address.state || "";
            locationInfo.full_address = geoJson.display_name;
          }
        }
      }
    } catch (err) {
      // Fail silently
    }
    return locationInfo;
  };

  // --- 3. INSTANT NAVIGATION LOGIC ---
  const performInstantRedirection = (deviceType, type, code) => {
    console.log("🚀 Redirecting instantly...");

    // 1. COMMUNITY APP
    if (type === 'c') {
      window.location.href = "https://play.google.com/store/apps/details?id=com.saj_community";
      return;
    }

    // 2. DESKTOP / LAPTOP -> Website
    if (deviceType !== "Mobile") {
      if (type === 'b') {
        window.location.href = "https://sajpeweb.raavan.site/business/enter-number";
      } else {
        window.location.href = "https://sajpeweb.raavan.site";
      }
      return;
    }

    // 3. MOBILE -> App Scheme
    if (deviceType === "Mobile") {
      let appScheme, playStoreLink;

      if (type === 'b') {
        appScheme = `sajbusiness://home?code=${code}`;
        playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_business";
      } else {
        appScheme = `sajpe://home?code=${code}`;
        playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_pe";
      }

      window.location.href = appScheme;

      setTimeout(() => {
        window.location.href = playStoreLink;
      }, 1500);
    }
  };

  // --- 4. MAIN PROCESS ---
  const handleScanAndNavigate = async (manualType = null, manualCode = null) => {
    // Manual testing ke liye state update kar rahe hain taaki UI me dikhe
    if (manualType) setCurrentType(manualType);
    if (manualCode) setCurrentCode(manualCode);

    setLoading(true);
    setStatusMsg("Processing...");

    const info = getReferralInfo(manualType, manualCode);

    try {
      const parser = new UAParser();
      const result = parser.getResult();
      const exactOS = `${result.os.name} ${result.os.version}`.trim();
      let deviceType = result.device.type ? (result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1)) : "Desktop / Laptop";

      const fp = await FingerprintJS.load();
      const fpResult = await fp.get();
      const strongDeviceID = fpResult.visitorId;

      let ipAddress = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        ipAddress = ipJson.ip;
      } catch (e) { }

      const locationInfo = await getSilentLocation();

      const finalPayload = {
        identity: { stable_hardware_id: strongDeviceID },
        network: { ip_address: ipAddress },
        location: locationInfo,
        device_specs: {
          type: deviceType,
          os: exactOS,
          browser: result.browser.name,
          model: result.device.model || "Generic System"
        },
        referral: {
          source_type: info.type,
          referral_code: info.code
        }
      };

      setDeviceData(finalPayload);

      // Fire API (No Await)
      saveDeviceDataSecurely({
        device_specs: finalPayload.device_specs,
        location: finalPayload.location,
        network: finalPayload.network,
        referral: finalPayload.referral,
        identity: finalPayload.identity
      });

      // Instant Navigate
      performInstantRedirection(deviceType, info.type, info.code);

    } catch (err) {
      console.error(err);
      performInstantRedirection("Mobile", info.type, info.code);
    }
  };

  const getAppName = (type) => (type === 'b' ? 'Saj Business' : type === 'c' ? 'Saj Community' : 'SajPe');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-950 text-white">
      
      {/* ✅ NEW LOADING UI WITH APP NAME & CODE */}
      {loading && (
        <div className="flex flex-col items-center justify-center space-y-6 animate-pulse w-full max-w-md">
          
          {/* App Name Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-1">
              Opening <span className="text-blue-400">{currentType ? getAppName(currentType) : "App"}</span>
            </h1>
            <p className="text-gray-400 text-sm">Redirecting securely...</p>
          </div>

          {/* Referral Code Box */}
          {currentCode && (
            <div className="bg-gray-900 border border-gray-700 px-8 py-4 rounded-xl flex flex-col items-center shadow-lg w-full">
              <span className="text-gray-500 text-xs uppercase tracking-widest mb-1">Referral Code Applied</span>
              <span className="text-3xl font-mono font-bold text-green-400 tracking-widest">
                {currentCode}
              </span>
            </div>
          )}
          
        </div>
      )}

      {/* Manual Test Buttons (Hidden during loading) */}
      {(!currentType || !currentCode) && !loading && (
        <div className="w-full max-w-md space-y-4">
            <DeviceCard data={deviceData} />
            
            <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl">
              <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest text-center">Manual Test</h2>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleScanAndNavigate('s', '105')} className="bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500 transition">Test SajPe</button>
                <button onClick={() => handleScanAndNavigate('b', '202')} className="bg-green-600 py-3 rounded-lg font-bold hover:bg-green-500 transition">Test Business</button>
              </div>
            </div>
        </div>
      )}
    </main>
  );
}
"use client";

import { useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { UAParser } from "ua-parser-js"; 
import DeviceCard from "./components/DeviceCard"; 
import { saveDeviceDataSecurely } from "./actions";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // Testing Data based on your JSON
  const testLinks = [
    { name: "SajPe Test", type: "s", code: "105", color: "bg-blue-600" },
    { name: "Business Test", type: "b", code: "202", color: "bg-green-600" },
    { name: "Community Test", type: "c", code: "303", color: "bg-purple-600" }
  ];

  // Modified logic to accept manual testing data
  const getReferralInfo = (manualType = null, manualCode = null) => {
    if (manualType) return { type: manualType, code: manualCode, isTest: true };

    if (typeof window === "undefined") return { type: 's', code: '' };
    const segments = window.location.pathname.split('/').filter(Boolean);
    return {
      type: segments[0] || 's',
      code: segments[2] || '00123',
      isTest: false
    };
  };

// --- 1. Navigation Flow Logic ---
const performRedirection = (deviceType, type, code) => {
  console.log(`🚀 Redirection Triggered | Device: ${deviceType} | Type: ${type}`);

  // --- 1. DESKTOP / LAPTOP FLOW ---
  if (deviceType !== "Mobile") {
    if (type === 'b') {
      // Saj Business Desktop
      window.location.href = "https://sajpeweb.raavan.site/business/enter-number";
    } else if (type === 'c') {
      // Saj Community Desktop (No Website -> Play Store)
      window.location.href = "https://play.google.com/store/apps/details?id=com.saj_community";
    } else {
      // SajPe Standard Desktop
      window.location.href = "https://sajpeweb.raavan.site/";
    }
    return;
  }

  // --- 2. MOBILE FLOW (APK / PLAYSTORE) ---
  if (deviceType === "Mobile") {
    let appScheme = "";
    let playStoreLink = "";

    // Specific logic for each app type
    if (type === 'b') {
      // SAJ BUSINESS MOBILE
      appScheme = `sajbusiness://home?code=${code}`;
      playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_business";
    } else if (type === 'c') {
      // SAJ COMMUNITY MOBILE
      appScheme = `sajcommunity://home?code=${code}`;
      playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_community";
    } else {
      // SAJPE MOBILE (Default)
      appScheme = `sajpe://home?code=${code}`;
      playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_pe";
    }

    console.log(`📱 Attempting to open: ${appScheme}`);
    window.location.href = appScheme;

    // Fallback logic: Agar 2.5 seconds mein app nahi khula, toh Play Store
    setTimeout(() => {
      // Check if user is still on this page
      if (document.visibilityState === "visible") {
        const confirmStore = window.confirm("SajPe Business App not found. Would you like to install it from Play Store?");
        if (confirmStore) {
          window.location.href = playStoreLink;
        }
      }
    }, 2500);
  }
};

// --- 2. Button Click Handler ---
const handleScan = async (manualType = null, manualCode = null) => {
  setLoading(true);
  
  try {
    // 1. Pehle dekho button se 'type' aaya hai kya, nahi toh URL segment check karo
    const info = getReferralInfo(manualType, manualCode);
    
    // 2. Browser detection logic...
    const parser = new UAParser();
    const result = parser.getResult();
    const deviceType = result.device.type ? 
      result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1) : 
      "Desktop / Laptop";

    // 3. API Payload (Data bhejne ke liye)
    const apiPayload = {
      source_type: info.type, // Yahan 'b', 's', ya 'c' jayega
      referral_code: info.code,
      // ... baki data
    };

    // 4. ✅ Sabse Important: 'info.type' ko redirection mein pass karein
    performRedirection(deviceType, info.type);

  } catch (err) {
    setError("Scan failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-950 text-white">
      
      {/* --- TESTING SECTION --- */}
      <div className="mb-10 p-6 bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest text-center">Test Navigation Flow</h2>
        <div className="grid grid-cols-1 gap-3">
          {testLinks.map((link) => (
            <button
              key={link.type}
              onClick={() => handleScan(link.type, link.code)}
              disabled={loading}
              className={`${link.color} hover:opacity-90 py-3 rounded-lg font-bold flex flex-col items-center transition-all active:scale-95`}
            >
              <span>{link.name}</span>
              <span className="text-[10px] opacity-70">Code: {link.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- STATUS DISPLAY --- */}
      <div className="text-center">
        {statusMsg && (
          <div className="p-4 rounded-full bg-blue-900/20 border border-blue-500/30 text-blue-400 font-mono text-sm animate-pulse mb-4">
             🚀 Status: {statusMsg}
          </div>
        )}
        {error && <p className="text-red-500">{error}</p>}
      </div>

      <DeviceCard data={deviceData} />
    </main>
  );
}
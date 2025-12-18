// src/app/actions.js
"use server";

export async function saveDeviceDataSecurely(payload) {
  const API_URL = "https://sajpebusiness.raavan.site/portal/users/device-details";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data, status: response.status };

    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: "Server Connection Failed" };
  }
}
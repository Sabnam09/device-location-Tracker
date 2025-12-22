// // src/app/actions.js
// "use server";

// export async function saveDeviceDataSecurely(payload) {
//   const API_URL = "https://sajpebusiness.raavan.site/portal/users/device-details";

//   try {
//     const response = await fetch(API_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Accept": "application/json"
//       },
//       body: JSON.stringify(payload),
//     });

//     const data = await response.json();
//     if (!response.ok) return { success: false, error: data, status: response.status };

//     return { success: true, data: data };
//   } catch (error) {
//     return { success: false, error: "Server Connection Failed" };
//   }
// }


"use server";

export async function saveDeviceDataSecurely(payload) {
  const API_URL = "https://sajpebusiness.raavan.site/portal/users/referral-info";
  // const API_URL = "https://sajpebusiness.raavan.site/portal/users/device-details";

  try {
    // Note: Hum yahan await use kar rahe hain taaki request complete ho,
    // lekin Frontend (page.js) iska wait nahi karega.
    fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
    }).catch(err => console.error("API Error Background:", err));

    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function getAddressFromGPS(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SajPe-Scanner/1.0',
        'Referer': 'https://sajpeweb.raavan.site'
      }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}
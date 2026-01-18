const fetch = require('node-fetch');

const url1 = "https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec";
const url2 = "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec";

async function checkSheet(url, name) {
    try {
        const response = await fetch(`${url}?sheet=LEAVING&action=fetch`);
        const json = await response.json();
        console.log(`URL (${name}) - Success: ${json.success}`);
        if (!json.success) console.log(`Error: ${json.error}`);
    } catch (e) {
        console.log(`URL (${name}) - Failed to fetch: ${e.message}`);
    }
}

async function run() {
    console.log("Checking prevalence URL (DUkcY)...");
    await checkSheet(url1, "DUkcY");
    console.log("\nChecking original .env URL (7yA6)...");
    await checkSheet(url2, "7yA6");
}

run();

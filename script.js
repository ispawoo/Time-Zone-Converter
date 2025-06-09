document.addEventListener('DOMContentLoaded', () => {
// Get DOM elements
const sourceTimeZoneSelect = document.getElementById('sourceTimeZone');
const sourceDateTimeInput = document.getElementById('sourceDateTime');
const destinationTimeZonesDiv = document.getElementById('destinationTimeZones');
const addDestinationBtn = document.getElementById('addDestinationBtn');
const convertButton = document.getElementById('convertButton');
const resetButton = document.getElementById('resetButton');
const currentYearSpan = document.getElementById('currentYear');

// Set the current year in the footer
currentYearSpan.textContent = new Date().getFullYear();

// --- Helper Functions ---

/**
* Provides a curated list of common time zones with user-friendly names and emojis.
* This enhances UX compared to raw IANA IDs.
* The user's local time zone is automatically detected and placed at the top.
*/
const getCommonTimeZones = () => {
const timeZones = [
// User's local time zone
{ id: Intl.DateTimeFormat().resolvedOptions().timeZone, name: `My Current Time Zone (Local: ${Intl.DateTimeFormat().resolvedOptions().timeZone}) 🏠` },
// Major global time zones
{ id: "America/New_York", name: "New York (EST/EDT) 🗽" },
{ id: "America/Los_Angeles", name: "Los Angeles (PST/PDT) 🌴" },
{ id: "Europe/London", name: "London (GMT/BST) 💂" },
{ id: "Europe/Paris", name: "Paris (CET/CEST) 🗼" },
{ id: "Europe/Berlin", name: "Berlin (CET/CEST) 🇩🇪" },
{ id: "Asia/Dubai", name: "Dubai (GST) 🇦🇪" },
{ id: "Asia/Karachi", name: "Karachi (PKT) 🇵🇰" }, // Relevant for current user's location
{ id: "Asia/Kolkata", name: "Mumbai (IST) 🇮🇳" },
{ id: "Asia/Singapore", name: "Singapore (SGT) 🇸🇬" },
{ id: "Asia/Tokyo", name: "Tokyo (JST) 🌸" },
{ id: "Australia/Sydney", name: "Sydney (AEST/AEDT) 🐨" },
{ id: "Pacific/Auckland", name: "Auckland (NZST/NZDT) 🥝" },
{ id: "Africa/Johannesburg", name: "Johannesburg (SAST) 🇿🇦" },
{ id: "America/Sao_Paulo", name: "São Paulo (BRT/BRST) 🇧🇷" },
{ id: "America/Chicago", name: "Chicago (CST/CDT) 🍕" },
{ id: "America/Denver", name: "Denver (MST/MDT) 🏔️" },
{ id: "Europe/Moscow", name: "Moscow (MSK) 🐻" },
{ id: "Asia/Shanghai", name: "Shanghai (CST) 🐉" },
{ id: "Africa/Cairo", name: "Cairo (EET/EEST) 🕌" },
{ id: "America/Mexico_City", name: "Mexico City (CST/CDT) 🇲🇽" },
// Add more as desired!
];
// Sort alphabetically by name, but ensure "My Current Time Zone" is always at the top
return timeZones.sort((a, b) => {
if (a.id === Intl.DateTimeFormat().resolvedOptions().timeZone) return -1;
if (b.id === Intl.DateTimeFormat().resolvedOptions().timeZone) return 1;
return a.name.localeCompare(b.name);
});
};

/**
* Populates a given <select> element with time zone options.
* @param {HTMLSelectElement} selectElement - The <select> element to populate.
* @param {string} defaultId - The IANA time zone ID to pre-select.
*/
const populateTimeZoneSelect = (selectElement, defaultId = '') => {
const timeZones = getCommonTimeZones();
selectElement.innerHTML = ''; // Clear existing options
timeZones.forEach(tz => {
const option = document.createElement('option');
option.value = tz.id;
option.textContent = tz.name;
if (tz.id === defaultId) {
option.selected = true;
}
selectElement.appendChild(option);
});
};

/**
* Formats a Date object into a readable string for a specific time zone.
* @param {Date} dateObj - The Date object to format (expected to be in browser's local time).
* @param {string} timeZoneId - The IANA time zone ID for formatting.
* @returns {string} The formatted date/time string.
*/
const formatTimeInTimeZone = (dateObj, timeZoneId) => {
const options = {
year: 'numeric',
month: 'short',
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
hour12: true, // Use AM/PM format
timeZone: timeZoneId,
timeZoneName: 'short' // e.g., "EST", "GMT+1", handles DST automatically
};
return dateObj.toLocaleString('en-US', options);
};

/**
* Sets the source date and time input to the current local date and time.
*/
const setInitialDateTime = () => {
const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const day = now.getDate().toString().padStart(2, '0');
const hours = now.getHours().toString().padStart(2, '0');
const minutes = now.getMinutes().toString().padStart(2, '0');
sourceDateTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
};

let destinationCounter = 0; // To keep track of unique IDs for dynamically added destinations

/**
* Adds a new destination time zone input field and result display.
*/
const addDestinationInput = () => {
destinationCounter++;
const destId = `dest-${destinationCounter}`; // Unique ID for this destination group

const destinationItem = document.createElement('div');
destinationItem.classList.add('destination-item');
destinationItem.setAttribute('data-id', destId); // Custom data attribute for easy reference

destinationItem.innerHTML = `
<div class="form-group">
<label for="${destId}-select">Destination Time Zone:</label>
<select id="${destId}-select" aria-label="Select destination time zone"></select>
</div>
<p id="${destId}-result" class="result-display empty-result">Time will appear here ⏳</p>
<button class="remove-destination" aria-label="Remove destination">✖️</button>
`;

destinationTimeZonesDiv.appendChild(destinationItem);

const destSelect = destinationItem.querySelector(`#${destId}-select`);
// Default a newly added destination to a common, non-local timezone for variety
populateTimeZoneSelect(destSelect, "Europe/London"); // Example default

// Add event listener for the remove button
destinationItem.querySelector('.remove-destination').addEventListener('click', (event) => {
event.target.closest('.destination-item').remove();
// Automatically re-convert times after a destination is removed
convertTimes();
});

// Add event listener to the new destination select for immediate conversion on change
destSelect.addEventListener('change', convertTimes);
};

/**
* Core function to convert times based on source input and display for all destinations.
*/
function convertTimes() {
const sourceDateTimeValue = sourceDateTimeInput.value;
const sourceTimeZoneId = sourceTimeZoneSelect.value;

if (!sourceDateTimeValue) {
// Alert user if source date/time is missing
alert("Please select a date and time for your source location. 📅");
return;
}

// Create a Date object from the source input.
// `datetime-local` input provides a string like "YYYY-MM-DDTHH:MM".
// When passed to `new Date()`, JavaScript interprets this string as a local time
// in the *browser's current time zone*.
// The `toLocaleString` method will then correctly convert and display this
// Date object's UTC time into the *selected sourceTimeZoneId* and *targetTimeZoneId*.
const baseDateInBrowserTime = new Date(sourceDateTimeValue);

// Iterate through all destination items and update their displayed times
document.querySelectorAll('.destination-item').forEach(destItem => {
const destSelect = destItem.querySelector('select');
const resultParagraph = destItem.querySelector('.result-display');
const targetTimeZoneId = destSelect.value;

if (targetTimeZoneId) {
try {
// Convert the baseDate (which is currently in the browser's local time)
// to the targetTimeZoneId for display.
const convertedTime = formatTimeInTimeZone(baseDateInBrowserTime, targetTimeZoneId);
resultParagraph.textContent = `🕰️ ${convertedTime}`;
resultParagraph.classList.remove('empty-result');
} catch (e) {
// Handle potential errors (e.g., invalid time zone ID)
resultParagraph.textContent = `❌ Error: Could not convert time.`;
resultParagraph.classList.add('empty-result');
console.error("Time conversion error:", e);
}
} else {
resultParagraph.textContent = 'Please select a destination time zone. 🤷‍♀️';
resultParagraph.classList.add('empty-result');
}
});
}

// --- Initial Setup and Event Listeners ---

// 1. Populate the source time zone dropdown
populateTimeZoneSelect(sourceTimeZoneSelect, Intl.DateTimeFormat().resolvedOptions().timeZone);

// 2. Set the default source date and time to now
setInitialDateTime();

// 3. Add one initial destination input field on page load
addDestinationInput();

// 4. Attach event listeners
addDestinationBtn.addEventListener('click', addDestinationInput); // Add new destination
convertButton.addEventListener('click', convertTimes); // Manual conversion trigger

// Auto-convert when source time zone or date/time changes
sourceTimeZoneSelect.addEventListener('change', convertTimes);
sourceDateTimeInput.addEventListener('change', convertTimes);

// Reset button functionality
resetButton.addEventListener('click', () => {
// Clear all existing destination items
destinationTimeZonesDiv.innerHTML = '';
// Add back one fresh destination item
addDestinationInput();
// Reset source time to current
setInitialDateTime();
// Reset source time zone to local default
populateTimeZoneSelect(sourceTimeZoneSelect, Intl.DateTimeFormat().resolvedOptions().timeZone);
// Perform initial conversion for the reset state
convertTimes();
});

// 5. Perform an initial conversion on page load to show immediate results
convertTimes();
});

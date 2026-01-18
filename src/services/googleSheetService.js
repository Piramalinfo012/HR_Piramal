export const BASE_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

/**
 * Uploads a file to Google Drive via the Apps Script.
 * @param {string} base64Data - The file content in base64 format (Data URL or raw).
 * @param {string} fileName - The name of the file.
 * @param {string} mimeType - The MIME type of the file.
 * @param {string} folderId - The Google Drive folder ID.
 * @returns {Promise<Object>} - The JSON response from the script.
 */
export const uploadFile = async (base64Data, fileName, mimeType, folderId) => {
    try {
        // Ensure we send raw base64 (strip "data:image/xyz;base64," if present)
        // This is safer as large payloads with headers sometimes cause issues.
        const cleanBase64 = base64Data.includes("base64,")
            ? base64Data.split("base64,")[1]
            : base64Data;

        const response = await fetch(BASE_URL, {
            method: "POST",
            body: new URLSearchParams({
                action: "uploadFile",
                base64Data: cleanBase64,
                fileName,
                mimeType,
                folderId,
            }),
        });

        const result = await response.json();
        console.log("Raw Upload Response:", result); // Debug log

        if (!result.success) {
            throw new Error(result.error || "File upload failed");
        }
        return result;
    } catch (error) {
        console.error("Service Upload Error:", error);
        throw error;
    }
};

/**
 * Submits data to a Google Sheet.
 * @param {string} sheetName - The name of the sheet to insert/update data.
 * @param {string} action - The action to perform (e.g., 'bulkInsert', 'insert').
 * @param {Array|Object} rowsData - The data payload.
 * @returns {Promise<Object>} - The response object.
 */
export const submitData = async (sheetName, action, rowsData) => {
    try {
        const response = await fetch(BASE_URL, {
            method: "POST",
            body: new URLSearchParams({
                sheetName,
                action,
                rowsData: typeof rowsData === 'string' ? rowsData : JSON.stringify(rowsData),
            }),
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Submission failed");
        }
        return result;
    } catch (error) {
        console.error("Service Submit Error:", error);
        throw error;
    }
};

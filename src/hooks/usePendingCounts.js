import { useState, useEffect } from 'react';

export const usePendingCounts = () => {
    const [counts, setCounts] = useState({
        onlinePostingCount: 0,
        jobConsultancyCount: 0,
        whatsappCount: 0,
        verificationCount: 0,
        interviewSelectionCount: 0,
        joiningFollowUpCount: 0,
        joiningManagementCount: 0,
        checkSalarySlipCount: 0,
        joiningLetterCount: 0,
        inductionTrainingCount: 0,
        assetAssignmentCount: 0
    });

    const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
    const JOINING_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwhFgVoAB4S1cKrU0iDRtCH5B2K-ol2c0RmaaEWXGqv0bdMzs3cs3kPuqOfUAR3KHYZ7g/exec";

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const cb = `&_=${Date.now()}`;
                
                const [fmsRes, candidateRes, joiningRes] = await Promise.all([
                    fetch(`${FETCH_URL}?sheet=FMS&action=fetch${cb}`).then(res => res.json()),
                    fetch(`${FETCH_URL}?sheet=Canidate_Selection&action=fetch${cb}`).then(res => res.json()),
                    fetch(`${JOINING_SUBMIT_URL}?action=read&sheet=JOINING_FMS${cb}`).then(res => res.json())
                ]);

                let onlinePosting = 0, jobConsultancy = 0, whatsapp = 0;
                let verification = 0, interviewSelection = 0, joiningFollowUp = 0;
                let checkSalarySlip = 0, joiningLetter = 0, inductionTraining = 0, assetAssignment = 0;
                let joiningManagement = 0;

                // 1. FMS Data
                if (fmsRes && fmsRes.data && fmsRes.data.length > 9) {
                    const dataRows = fmsRes.data.slice(9);
                    dataRows.forEach(row => {
                        if (!row) return;
                        const p1 = row[17]?.toString().trim() || "";
                        const a1 = row[18]?.toString().trim() || "";
                        if (p1 !== "" && a1 === "") onlinePosting++;

                        const p2 = row[23]?.toString().trim() || "";
                        const a2 = row[24]?.toString().trim() || "";
                        if (p2 !== "" && a2 === "") jobConsultancy++;

                        const p3 = row[30]?.toString().trim() || "";
                        const a3 = row[31]?.toString().trim() || "";
                        if (p3 !== "" && a3 === "") whatsapp++;
                    });
                }

                // Parse Function for Candidate and Joining
                const parseData = (json) => {
                    let allRows = [];
                    if (Array.isArray(json)) allRows = json;
                    else if (json && typeof json === 'object' && json.data && Array.isArray(json.data)) allRows = json.data;
                    else return { rows: [] };
                    
                    const headerRowIndex = allRows.findIndex(row =>
                        row && row.some(cell =>
                            cell && (
                                cell.toString().trim().toUpperCase() === "ID" ||
                                cell.toString().trim().toLowerCase().includes("candidate enquiry")
                            )
                        )
                    );
                    if (headerRowIndex === -1) return { rows: allRows.slice(1) };
                    return { rows: allRows.slice(headerRowIndex + 1) };
                };

                const cRows = parseData(candidateRes).rows;
                const jRows = parseData(joiningRes).rows;

                // 2. JOINING_FMS Data
                const blockedIds = new Set();
                if (jRows.length > 0) {
                    jRows.forEach(row => {
                        if (!row) return;
                        
                        // For Joining Management Blocked IDs
                        const id = row[5];
                        const planned = row[38];
                        if (id && planned && planned.toString().trim() !== "") {
                            blockedIds.add(id.toString().trim());
                        }

                        // Check Salary Slip (38 vs 39)
                        const am = row[38]?.toString().trim() || "";
                        const an = row[39]?.toString().trim() || "";
                        if (am !== "" && an === "") checkSalarySlip++;

                        // Joining Letter Release (42 vs 43)
                        const aq = row[42]?.toString().trim() || "";
                        const ar = row[43]?.toString().trim() || "";
                        if (aq !== "" && ar === "") joiningLetter++;

                        // Induction Training (47 vs 48)
                        const av = row[47]?.toString().trim() || "";
                        const aw = row[48]?.toString().trim() || "";
                        if (av !== "" && aw === "") inductionTraining++;

                        // Asset Assignment (56 vs 57)
                        const be = row[56]?.toString().trim() || "";
                        const bf = row[57]?.toString().trim() || "";
                        if (be !== "" && bf === "") assetAssignment++;
                    });
                }

                // 3. Candidate_Selection Data
                if (cRows.length > 0) {
                    cRows.forEach(row => {
                        if (!row) return;
                        
                        // Verification Before Interview (25 vs 26)
                        const z = row[25]?.toString().trim() || "";
                        const aa = row[26]?.toString().trim() || "";
                        if (z !== "" && aa === "") verification++;

                        // Interview Selection (29 vs 30)
                        const ad = row[29]?.toString().trim() || "";
                        const ae = row[30]?.toString().trim() || "";
                        if (ad !== "" && ae === "") interviewSelection++;

                        // Joining Follow Up (34 vs 35)
                        const ai = row[34]?.toString().trim() || "";
                        const aj = row[35]?.toString().trim() || "";
                        if (ai !== "" && aj === "") joiningFollowUp++;

                        // Joining Management
                        const actualAJ = row[35];
                        const statusX = row[23]?.toString().trim() || "";
                        const idEnq = row[1]?.toString().trim() || "";

                        if (
                            actualAJ !== undefined && 
                            actualAJ !== null && 
                            actualAJ.toString().trim() !== "" && 
                            statusX !== "Rejected" && 
                            !(idEnq && blockedIds.has(idEnq))
                        ) {
                            joiningManagement++;
                        }
                    });
                }

                setCounts({
                    onlinePostingCount: onlinePosting,
                    jobConsultancyCount: jobConsultancy,
                    whatsappCount: whatsapp,
                    verificationCount: verification,
                    interviewSelectionCount: interviewSelection,
                    joiningFollowUpCount: joiningFollowUp,
                    joiningManagementCount: joiningManagement,
                    checkSalarySlipCount: checkSalarySlip,
                    joiningLetterCount: joiningLetter,
                    inductionTrainingCount: inductionTraining,
                    assetAssignmentCount: assetAssignment
                });

            } catch (error) {
                console.error("Error fetching pending counts:", error);
            }
        };

        fetchAllData();
        
        // Optional: setup a refresh interval or listen to a custom event
        const handleRefresh = () => fetchAllData();
        window.addEventListener('refresh-pending-counts', handleRefresh);
        return () => window.removeEventListener('refresh-pending-counts', handleRefresh);
    }, []);

    return counts;
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// API Constants
const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
const JOINING_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwhFgVoAB4S1cKrU0iDRtCH5B2K-ol2c0RmaaEWXGqv0bdMzs3cs3kPuqOfUAR3KHYZ7g/exec";

const useDataStore = create(
  persist(
    (set, get) => ({
      // Global Data State
      joiningFmsData: [],
      candidateSelectionData: [],
      fmsData: [],
      masterData: [],
      dataResponseData: [],
      leavingData: [],
      joiningEntryData: [],
      joiningEntryData: [],
      leaveManagementData: [],
      userData: [], // For Consultancy Names

      // Metadata
      isLoading: false,
      lastFetched: null,
      error: null,

      // Actions
      fetchGlobalData: async (force = false) => {
        const state = get();
        // If data was fetched less than 1 minute ago and force is false, don't refetch
        // (Removing this check to align with user request for "one time load" but ensuring
        // we can call this on mount without loop. Actually calling it on mount should be idempotent enough
        // if we check state.joiningFmsData.length > 0, but user said "only one time load".
        // A better approach: fetch if empty.

        if (!force && state.joiningFmsData.length > 0 && state.lastFetched) {
          // We have data, assuming it's fine. 
          // If user specifically requested "one time load", we can arguably never refetch automatically
          // unless explicitly requested (e.g. after a form submit).
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const fetchOptions = { method: 'GET' };

          // Helper for robust fetching
          const fetchJson = async (url, name) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
            const text = await res.text();
            try {
              const json = JSON.parse(text);
              // Handle various error formats
              if (json.error && typeof json.error === 'string' && json.error.includes("getDataRange")) {
                console.warn(`${name}: Sheet not found/accessible`);
                return { success: true, data: [] }; // Return empty data instead of breaking
              }
              return json;
            } catch (e) {
              if (text.includes("<html")) throw new Error(`${name}: Returned HTML (Redeploy Web App)`);
              throw new Error(`${name}: Invalid JSON`);
            }
          };

          // Execute all fetches in parallel
          const [
            joiningRes,
            leavingRes,
            candidateRes,
            fmsRes,
            masterRes,
            historyRes,
            joiningEntryRes,
            leaveManagementRes,
            userRes
          ] = await Promise.all([
            // 1. JOINING_FMS
            fetchJson(`${JOINING_SUBMIT_URL}?action=read&sheet=JOINING_FMS&_=${Date.now()}`, 'Joining FMS'),
            // 2. LEAVING
            fetchJson(`${JOINING_SUBMIT_URL}?action=read&sheet=LEAVING&_=${Date.now()}`, 'Leaving'),
            // 3. Candidate Selection
            fetchJson(`${FETCH_URL}?sheet=Canidate_Selection&action=fetch`, 'Candidate Selection'),
            // 4. FMS
            fetchJson(`${FETCH_URL}?sheet=FMS&action=fetch`, 'FMS'),
            // 5. Master
            fetchJson(`${FETCH_URL}?sheet=Master&action=fetch`, 'Master'),
            // 6. Data Response
            fetchJson(`${FETCH_URL}?sheet=Data Resposnse&action=fetch`, 'Data Response'),
            // 7. Joining Entry Form
            fetchJson(`${FETCH_URL}?sheet=JOINING%20ENTRY%20FORM&action=fetch`, 'Joining Entry Form'),
            // 8. Leave Management
            fetchJson(`${FETCH_URL}?sheet=Leave%20Management&action=fetch`, 'Leave Management'),
            // 9. USER (for Consultancy Names)
            fetchJson(`${FETCH_URL}?sheet=USER&action=fetch`, 'User Data')
          ]);

          set({
            joiningFmsData: joiningRes.success ? (joiningRes.data || []) : [],
            leavingData: leavingRes.success ? (leavingRes.data || []) : [],
            candidateSelectionData: candidateRes.success ? (candidateRes.data || []) : [],
            fmsData: fmsRes.success ? (fmsRes.data || []) : [],
            masterData: masterRes.success ? (masterRes.data || []) : [],
            dataResponseData: historyRes.success ? (historyRes.data || []) : [],
            joiningEntryData: joiningEntryRes.success ? (joiningEntryRes.data || []) : [],
            leaveManagementData: leaveManagementRes.success ? (leaveManagementRes.data || []) : [],
            userData: userRes.success ? (userRes.data || []) : [],
            lastFetched: Date.now(),
            isLoading: false
          });

        } catch (error) {
          console.error("Global Data Fetch Error:", error);
          set({ error: error.message, isLoading: false });
        }
      },

      // Targeted refresh (useful for after form submissions)
      refreshData: async () => {
        await get().fetchGlobalData(true);
      }
    }),
    {
      name: 'hr-piramal-global-store', // New cache name
      partialize: (state) => ({
        // Persist data but not loading/error states
        joiningFmsData: state.joiningFmsData,
        candidateSelectionData: state.candidateSelectionData,
        fmsData: state.fmsData,
        masterData: state.masterData,
        dataResponseData: state.dataResponseData,
        leavingData: state.leavingData,
        joiningEntryData: state.joiningEntryData,
        leaveManagementData: state.leaveManagementData,
        userData: state.userData,
        lastFetched: state.lastFetched
      }),
    }
  )
);

export default useDataStore;
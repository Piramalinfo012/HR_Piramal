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
      callingTrackingData: [],
      leavingData: [],
      joiningEntryData: [],
      leaveManagementData: [],
      userData: [], // For Consultancy Names

      // Metadata
      isLoading: false,
      lastFetched: null,
      error: null,

      // Helper for robust fetching - moved outside to be accessible to all methods
      fetchJson: async (url, name) => {
        try {
          const res = await fetch(url);
          const text = await res.text();

          // Check if response contains HTML (indicating an error page)
          if (text.includes("<html") || text.includes("<!DOCTYPE")) {
            console.error(`${name}: Received HTML response instead of JSON`);
            return { success: false, data: [], error: "HTML response received" };
          }

          try {
            const json = JSON.parse(text);
            // Handle various error formats from Google Apps Script
            if (json.error) {
              console.error(`${name}: Google Apps Script error:`, json.error);
              return { success: false, data: [], error: json.error };
            }
            if (json.result === "error" || json.status === "error") {
              console.error(`${name}: Script returned error status`);
              return { success: false, data: [], error: "Script error" };
            }
            return json;
          } catch (e) {
            console.error(`${name}: Failed to parse JSON response:`, e);
            console.log(`${name}: Response text:`, text.substring(0, 200) + "...");
            return { success: false, data: [], error: "Invalid JSON response" };
          }
        } catch (error) {
          console.error(`${name}: Network or fetch error:`, error);
          return { success: false, data: [], error: error.message };
        }
      },

      // Actions
      fetchGlobalData: async (force = false, silent = false) => {
        const state = get();

        // Check if we should refresh data (every 5 minutes if not forced)
        const FIVE_MINUTES = 5 * 60 * 1000;
        const shouldRefresh = force || !state.lastFetched || (Date.now() - state.lastFetched) > FIVE_MINUTES;

        if (!shouldRefresh) {
          // Data is still fresh, don't refetch
          return;
        }

        // Only show loading indicator if not in silent mode
        if (!silent) {
          set({ isLoading: true, error: null });
        }

        try {
          const fetchOptions = { method: 'GET' };

          // Re-defining fetchJson here for backward compatibility with existing code
          const fetchJson = get().fetchJson;

          // Execute all fetches in parallel
          // Always add cache-busting timestamp to ensure fresh data
          const cb = `&_=${Date.now()}`;

          const [
            joiningRes,
            candidateRes,
            fmsRes,
            masterRes,
            historyRes,
            callingRes,
            joiningEntryRes,
            userRes
          ] = await Promise.all([
            // 1. JOINING_FMS (from Submit Script)
            fetchJson(`${JOINING_SUBMIT_URL}?action=read&sheet=JOINING_FMS${cb}`, 'Joining FMS'),
            // 3. Candidate Selection
            fetchJson(`${FETCH_URL}?sheet=Canidate_Selection&action=fetch${cb}`, 'Candidate Selection'),
            // 4. FMS
            fetchJson(`${FETCH_URL}?sheet=FMS&action=fetch${cb}`, 'FMS'),
            // 5. Master
            fetchJson(`${FETCH_URL}?sheet=Master&action=fetch${cb}`, 'Master'),
            // 6. Data Response
            fetchJson(`${FETCH_URL}?sheet=Data Resposnse&action=fetch${cb}`, 'Data Response'),
            // 7. Calling Tracking
            fetchJson(`${FETCH_URL}?sheet=Calling Tracking&action=fetch${cb}`, 'Calling Tracking'),
            // 8. Joining Entry Form (from Submit Script)
            fetchJson(`${JOINING_SUBMIT_URL}?action=read&sheet=JOINING ENTRY FORM${cb}`, 'Joining Entry Form'),
            // 10. USER (for Consultancy Names)
            fetchJson(`${FETCH_URL}?sheet=USER&action=fetch${cb}`, 'User Data')
          ]);

          set({
            joiningFmsData: joiningRes.success && joiningRes.data ? joiningRes.data : [],
            candidateSelectionData: candidateRes.success && candidateRes.data ? candidateRes.data : [],
            fmsData: fmsRes.success && fmsRes.data ? fmsRes.data : [],
            masterData: masterRes.success && masterRes.data ? masterRes.data : [],
            dataResponseData: historyRes.success && historyRes.data ? historyRes.data : [],
            callingTrackingData: callingRes.success && callingRes.data ? callingRes.data : [],
            joiningEntryData: joiningEntryRes.success && joiningEntryRes.data ? joiningEntryRes.data : [],
            userData: userRes.success && userRes.data ? userRes.data : [],
            lastFetched: Date.now(),
            // Only reset loading if not in silent mode
            ...(silent ? {} : { isLoading: false })
          });

        } catch (error) {
          console.error("Global Data Fetch Error:", error);
          // Only set error and loading if not in silent mode
          if (!silent) {
            set({ error: error.message, isLoading: false });
          }
        }
      },

      // Fetch specific sheets only
      fetchSpecificSheets: async (sheetsConfig) => {
        set({ isLoading: true, error: null });

        try {
          const fetchJson = get().fetchJson;

          // Process each sheet in the config object
          const updates = {};

          for (const [stateProperty, sheetName] of Object.entries(sheetsConfig)) {
            const url = `${FETCH_URL}?sheet=${encodeURIComponent(sheetName)}&action=fetch&_=${Date.now()}`;
            const result = await fetchJson(url, `${stateProperty} (${sheetName})`);

            // Update the specific property based on the result
            updates[stateProperty] = result.success && result.data ? result.data : [];
          }

          set({
            ...updates,
            isLoading: false
          });
        } catch (error) {
          console.error("Specific Sheets Fetch Error:", error);
          set({ error: error.message, isLoading: false });
        }
      },

      // Force refresh all data regardless of cache timing
      forceRefreshAllData: async (silent = true) => {
        await get().fetchGlobalData(true, silent);
      },

      // Targeted refresh (useful for after form submissions)
      refreshData: async (silent = true) => {
        await get().fetchGlobalData(true, silent);
      },

      // Fetch only Calling Tracking data if not already present or forced
      fetchCallingTrackingData: async (force = false) => {
        const state = get();

        // If we already have calling tracking data and not forcing refresh, skip fetch
        if (!force && state.callingTrackingData && state.callingTrackingData.length > 0) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const fetchJson = get().fetchJson;
          const cb = `&_=${Date.now()}`;
          const callingRes = await fetchJson(`${FETCH_URL}?sheet=Calling Tracking&action=fetch${cb}`, 'Calling Tracking');

          set({
            callingTrackingData: callingRes.success && callingRes.data ? callingRes.data : [],
            isLoading: false
          });
        } catch (error) {
          console.error("Calling Tracking Data Fetch Error:", error);
          set({ error: error.message, isLoading: false });
        }
      },

      // Refresh only Calling Tracking data
      refreshCallingTrackingData: async () => {
        await get().fetchCallingTrackingData();
      },

      // Fetch paginated data for specific sheet with filters
      fetchPaginatedSheet: async (sheetName, page, limit, search = "", dateFilter = "all") => {
        set({ isLoading: true, error: null });
        try {
          const fetchJson = get().fetchJson;
          const cb = `&_=${Date.now()}`;
          const url = `${FETCH_URL}?sheet=${encodeURIComponent(sheetName)}&action=fetchPaginated&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&dateFilter=${encodeURIComponent(dateFilter)}${cb}`;
          const result = await fetchJson(url, `Paginated ${sheetName}`);

          set({ isLoading: false });
          return result;
        } catch (error) {
          console.error("Paginated Fetch Error:", error);
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
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
        // callingTrackingData: state.callingTrackingData, // Don't persist this anymore to save memory
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
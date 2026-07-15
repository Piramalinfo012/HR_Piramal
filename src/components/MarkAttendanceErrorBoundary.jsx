import React from "react";
import { RefreshCw } from "lucide-react";

// Prevents the "blank/white page" issue on some devices.
// Without a boundary any render-time error inside MarkAttendance
// (bad GPS data, Intl differences, corrupt localStorage cache, etc.)
// unmounts the whole React tree and shows a blank screen.
class MarkAttendanceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("MarkAttendance crashed:", error, info);
  }

  handleReset = () => {
    // Clear cached data that may be corrupt, then reload the page.
    try {
      localStorage.removeItem("mark_attendance_data_cache_v1");
      localStorage.removeItem("mark_attendance_location_cache_v1");
    } catch {
      // ignore
    }
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-content flex min-h-[60vh] items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Kuch technical dikkat aa gayi</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Attendance page load nahi ho paaya. Neeche button se dobara try karein.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MarkAttendanceErrorBoundary;

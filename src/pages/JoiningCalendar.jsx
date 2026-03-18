import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, Plus, X, ListTodo, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const JoiningCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [editingTask, setEditingTask] = useState(null);

  const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  // Helper to format Date string to YYYY-MM-DD
  const formatToYMD = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const parts = String(date).split("/");
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY or MM/DD/YYYY, adapting to YYYY-MM-DD
      const year = parts[2].length === 4 ? parts[2] : `20${parts[2]}`;
      return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    return date;
  };

  const fetchCalendarTasks = async () => {
    setLoading(true);
    try {
      const cb = `&_=${Date.now()}`;
      const response = await fetch(`${FETCH_URL}?sheet=Calendar&action=fetch${cb}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Skip header row
        const rows = result.data.slice(1);
        const mappedTasks = rows.map((row, index) => {
          // row[0]: DATE, row[1]: TASK, row[2]: STATUS
          // rowIndex is index + 2 (since header is row 1 and 0-indexed slice)
          let parsedDateString = row[0] || "";
          
          return {
            rowIndex: index + 2,
            date: formatToYMD(parsedDateString),
            originalDateString: parsedDateString,
            task: row[1] || "",
            status: row[2] || "Pending",
          };
        }).filter(t => t.date && t.task);

        console.log("Mapped Tasks: ", mappedTasks);
        setTasks(mappedTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error(`Failed to load calendar tasks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarTasks();
  }, [FETCH_URL]);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.trim() || !selectedDate) return;

    setSubmitting(true);
    try {
      let payload;
      
      if (editingTask) {
        // Update existing task
        const rowData = [editingTask.originalDateString, newTask.trim(), editingTask.status];
        payload = {
          sheetName: "Calendar",
          action: "update",
          rowIndex: editingTask.rowIndex,
          rowData: JSON.stringify(rowData)
        };
      } else {
        // Add new task
        const newD = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate);
        const displayDate = `${String(newD.getDate()).padStart(2, '0')}/${String(newD.getMonth() + 1).padStart(2, '0')}/${newD.getFullYear()}`;
        const rowData = [displayDate, newTask.trim(), "Pending"];
        
        payload = {
          sheetName: "Calendar",
          action: "bulkInsert",
          rowsData: JSON.stringify([rowData])
        };
      }

      const res = await fetch(FETCH_URL, {
        method: "POST",
        body: new URLSearchParams(payload)
      });

      const result = await res.json();
      if (result.success) {
        toast.success(editingTask ? "Task updated!" : "Task added!");
        setNewTask("");
        setEditingTask(null);
        fetchCalendarTasks(); 
      } else {
        toast.error("Failed to save task: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Save task error:", error);
      toast.error("Error saving task: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskItem) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    setSubmitting(true);
    try {
      const payload = {
        sheetName: "Calendar",
        action: "deleteRow",
        rowIndex: taskItem.rowIndex
      };

      const res = await fetch(FETCH_URL, {
        method: "POST",
        body: new URLSearchParams(payload)
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Task deleted!");
        if (editingTask && editingTask.rowIndex === taskItem.rowIndex) {
          setEditingTask(null);
          setNewTask("");
        }
        fetchCalendarTasks(); 
      } else {
        toast.error("Failed to delete task: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Delete task error:", error);
      toast.error("Error deleting task: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handeMarkDone = async (taskItem) => {
    setSubmitting(true);
    try {
      const rowData = [taskItem.originalDateString, taskItem.task, "Done"];
      
      const payload = {
        sheetName: "Calendar",
        action: "update",
        rowIndex: taskItem.rowIndex,
        rowData: JSON.stringify(rowData)
      };

      const res = await fetch(FETCH_URL, {
        method: "POST",
        body: new URLSearchParams(payload)
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Task marked as Done!");
        fetchCalendarTasks(); // refresh data
      } else {
        toast.error("Failed to update task: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Update task error:", error);
      toast.error("Error updating task: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getEventsForDate = (day) => {
    if (!day) return [];
    const dateString = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.date === dateString);
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const isToday = (day) => {
    return (
      day &&
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      day === today.getDate()
    );
  };

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 uppercase flex items-center">
          <CalendarIcon className="mr-3 text-indigo-600" size={28} />
          Task Calendar
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-500 border-dashed rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading tasks...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayTasks = getEventsForDate(day);
                const hasPending = dayTasks.some(t => t.status !== "Done");
                
                return (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border rounded-xl cursor-pointer flex flex-col transition-shadow hover:shadow-md ${
                      !day ? 'bg-gray-50/50 border-transparent' : 
                      isToday(day) ? "bg-indigo-50/40 border-indigo-400" : "bg-white border-gray-200"
                    } ${
                      selectedDate === day ? "ring-2 ring-indigo-500 ring-offset-1 border-transparent shadow-sm" : ""
                    }`}
                    onClick={() => day && setSelectedDate(day)}
                  >
                    {day && (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={`text-sm font-bold flex items-center justify-center w-8 h-8 rounded-full ${
                              isToday(day) 
                                ? "bg-indigo-600 text-white shadow-sm" 
                                : selectedDate === day
                                ? "bg-indigo-100 text-indigo-900" 
                                : "text-gray-700"
                            }`}
                          >
                            {day}
                          </span>
                          {dayTasks.length > 0 && (
                            <span className={`w-2 h-2 rounded-full mt-1.5 mr-1 ${hasPending ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                          )}
                        </div>
                        <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                          {dayTasks.slice(0, 3).map((t, idx) => (
                            <div
                              key={idx}
                              className={`text-xs px-2.5 py-1.5 rounded-md truncate font-semibold border shadow-sm transition-all ${
                                t.status === "Done"
                                  ? "bg-green-50 text-green-700 border-green-200 line-through opacity-70"
                                  : "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200"
                              }`}
                              title={t.task}
                            >
                              {t.task}
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="text-xs font-bold text-gray-400 px-1 mt-1 hover:text-gray-600 transition-colors">
                              +{dayTasks.length - 3} more...
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details & Task Assignment Sidebar */}
          <div className="space-y-6">
            {!selectedDate ? (
              <div className="bg-gradient-to-b from-white to-gray-50 rounded-xl shadow-lg border p-12 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <CalendarIcon size={40} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Date Selected</h3>
                <p className="text-gray-500 font-medium">Click on any date in the calendar to view and manage your assigned tasks.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border p-6 ring-2 ring-indigo-50 flex flex-col h-[calc(100vh-140px)]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <ListTodo size={24} className="mr-2 text-indigo-600" />
                    {months[currentDate.getMonth()]} {selectedDate}, {currentDate.getFullYear()}
                  </h3>
                  <button 
                    onClick={() => {
                      setSelectedDate(null);
                      setEditingTask(null);
                      setNewTask("");
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6 space-y-3">
                  {getEventsForDate(selectedDate).length === 0 ? (
                    <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <ListTodo size={32} className="mx-auto text-gray-400 mb-3 opacity-50" />
                      <p className="font-medium text-gray-600">No tasks assigned yet.</p>
                      <p className="text-sm mt-1">Use the form below to add one!</p>
                    </div>
                  ) : (
                    getEventsForDate(selectedDate).map((t, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all group hover:shadow-md ${
                          t.status === "Done" 
                            ? "bg-gray-50 border-gray-200 opacity-80" 
                            : "bg-white border-amber-200 shadow-sm hover:border-amber-300"
                        }`}
                      >
                        <div className={`flex-1 text-sm pr-2 ${t.status === "Done" ? "text-gray-500 line-through" : "text-gray-900 font-semibold"}`}>
                          {t.task}
                        </div>
                        
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingTask(t);
                              setNewTask(t.task);
                            }}
                            disabled={submitting || t.status === "Done"}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                            title="Edit task"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(t)}
                            disabled={submitting}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                            title="Delete task"
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          {t.status !== "Done" && (
                            <button
                              onClick={() => handeMarkDone(t)}
                              disabled={submitting}
                              className="ml-2 p-2 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border border-green-200 rounded-full transition-all shadow-sm disabled:opacity-50"
                              title="Mark as Done"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {t.status === "Done" && (
                            <div className="ml-2 text-green-600 flex items-center text-xs font-bold bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                              <CheckCircle size={14} className="mr-1" />
                              DONE
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add/Edit Task Form */}
                <div className="pt-5 border-t bg-gradient-to-b from-white to-gray-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-800 flex items-center">
                      {editingTask ? <Edit size={18} className="mr-2 text-blue-600" /> : <Plus size={18} className="mr-2 text-indigo-600" />}
                      {editingTask ? "Edit Task" : "Assign New Task"}
                    </h4>
                    {editingTask && (
                      <button 
                        onClick={() => {
                          setEditingTask(null);
                          setNewTask("");
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleTaskSubmit} className="flex flex-col gap-4">
                    <input
                      type="text"
                      placeholder="e.g., Conduct initial HR screening"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium shadow-sm transition-all"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      required
                      disabled={submitting}
                    />
                    <button
                      type="submit"
                      disabled={submitting || !newTask.trim()}
                      className={`w-full text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 shadow-sm ${
                        editingTask ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          {editingTask ? <Edit size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
                          {editingTask ? "Update Task" : "Add Task"}
                        </>
                      )}
                     </button>
                  </form>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JoiningCalendar;

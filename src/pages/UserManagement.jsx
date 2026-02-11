import React, { useState, useEffect } from 'react';
import { Edit, Save, X, Loader, Search, Key, User, Shield, Layers, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Page options for access control
    const pageOptions = [
        "Dashboard",
        "Indent",
        "Online Posting",
        "Call Tracker",
        "Joining",
        "Calling For Job Agencies",
        "Whatsapp",
        "Employee",
        "Candidate Sortlisted",
        "Verification Before Interview",
        "Interview & Final Selection",
        "Joining Follow Up",
        "Check Salary Slip & Resume Copy",
        "Joining Letter Release",
        "Induction Or Training",
        "Asset Assignment (IT Team)",
        "Leaving"
    ];

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=USER&action=fetch`);
            const result = await response.json();

            if (result.success && result.data && Array.isArray(result.data)) {
                // Skip header row
                const data = result.data.slice(1).map((row, index) => {
                    const isAdmin = (row[3] || 'No').toString().trim().toLowerCase() === 'yes';
                    return {
                        originalIndex: index + 1, // Store original index (0-based from slice + 1 for header offset)
                        username: row[0] || '',
                        password: row[1] || '',
                        name: row[2] || '',
                        admin: row[3] || 'No',
                        pageAccess: isAdmin ? pageOptions.join(', ') : (row[5] || '')
                    };
                });
                setUsers(data);
            } else {
                toast.error("Failed to fetch users");
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Error fetching data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);



    const handleModalClose = () => {
        setIsModalOpen(false);
        setCurrentUser(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentUser(prev => ({ ...prev, [name]: value }));
    };

    const handlePageToggle = (page) => {
        setCurrentUser(prev => {
            const selected = prev.selectedPages.includes(page)
                ? prev.selectedPages.filter(p => p !== page)
                : [...prev.selectedPages, page];
            return { ...prev, selectedPages: selected };
        });
    };

    const handleSelectAllPages = () => {
        setCurrentUser(prev => ({
            ...prev,
            selectedPages: prev.selectedPages.length === pageOptions.length ? [] : [...pageOptions]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // 1. Fetch fresh data to get the correct row index
            const response = await fetch(`${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=USER&action=fetch`);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error("Failed to fetch fresh data for update");
            }

            const allData = result.data;
            // Find row index by Username (Column A / Index 0)
            // match with the ORIGINAL username in case username is being edited (though typically username is ID)
            // But here we might be editing username too. 
            // The requirement says "fetch 'USER' Sheet... for Username...". 
            // Let's assume Username is unique. If we edit username, we match by the OLD username if possible, 
            // but we only stored 'username' in state. 
            // Wait, if I change username in modal, 'currentUser.username' is new. 
            // I should have stored 'originalUsername' or valid ID. 
            // Let's use the 'originalIndex' mapped from initial fetch, but verify it matches.
            // Actually, safest is to match by the Username from BEFORE edit.
            // But since I didn't store "originalUsername" separately in 'currentUser' state ( I spread ...user ), 
            // I should rely on the fact that maybe Username shouldn't be matched if it changed.
            // Be careful: if username changes, we can't find the row if we only have new username.
            // Re-fetching: The 'users' state has the data from last fetch. 'currentUser' has new data.
            // Finding the row:

            // Let's iterate and find the row that matches the *original* user details or index.
            // Since rows can shift, index isn't 100% safe but better than nothing if no unique ID.
            // However, Username is likely the unique key. 
            // I will implement looking up by the *original* username.

            // Correction: I need to know the original username to find the row if the user edited the username.
            // In handleEditClick, 'user' is the original object. 'currentUser' is the editing copy.
            // I should store 'originalUsername' in currentUser state when opening modal.

            // BUT, for now, I'll iterate through fresh data.

            // Let's grab the row based on the user object passed to handleEditClick.
            // I'll update handleEditClick to store originalUsername.

            // Wait, I can't update handleEditClick *inside* handleSubmit.
            // I'll fix this in the next step by updating the currentUser state initialization.

            // For this implementation, I will assume Username is the key. 
            // If the user edits the username, we might have an issue finding the row if we don't track the old one.
            // I'll add 'originalUsername' to the state in handleEditClick.

            const rowIndex = allData.findIndex(row => row[0] === currentUser.originalUsername);

            if (rowIndex === -1) {
                throw new Error("User not found in the latest sheet data. Has it been deleted?");
            }

            // Construct updated row
            // We need to preserve other columns if any, but requirement only mentions specific columns.
            // Ideally we copy the existing row and update specific indices.
            let rowData = [...allData[rowIndex]];

            rowData[0] = currentUser.username;
            rowData[1] = currentUser.password;
            rowData[2] = currentUser.name;
            rowData[3] = currentUser.admin;
            rowData[5] = currentUser.selectedPages.join(', '); // Column F is index 5

            const payload = {
                sheetName: "USER",
                action: "update",
                rowIndex: rowIndex + 1, // 1-based index for API
                rowData: JSON.stringify(rowData)
            };

            const updateResponse = await fetch(
                import.meta.env.VITE_GOOGLE_SHEET_URL,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(payload).toString()
                }
            );

            const updateResult = await updateResponse.json();

            if (updateResult.success) {
                toast.success("User updated successfully");
                setIsModalOpen(false);
                fetchUsers(); // Refresh list
            } else {
                throw new Error(updateResult.error || "Update failed");
            }

        } catch (error) {
            console.error("Update error:", error);
            toast.error(error.message || "Failed to update user");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Modified handleEditClick to include originalUsername
    const openEditModal = (user) => {
        setCurrentUser({
            ...user,
            originalUsername: user.username, // Store original for lookup
            selectedPages: user.pageAccess ? user.pageAccess.split(',').map(p => p.trim()).filter(p => p) : []
        });
        setIsModalOpen(true);
        setShowPassword(false);
    }

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 page-content p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <User className="mr-3 text-indigo-600" size={28} />
                    User Management
                </h1>

                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Search by username or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Page Access</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <Loader className="animate-spin mb-2" size={32} />
                                            <p>Loading users...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">••••••••</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.admin?.toLowerCase() === 'yes'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.admin}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={user.pageAccess}>
                                            {user.pageAccess || <span className="text-gray-400 italic">No specific access</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg transition-colors hover:bg-indigo-100"
                                                title="Edit User"
                                            >
                                                <Edit size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {isModalOpen && currentUser && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleSubmit}>
                            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                    <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                                        <Edit size={20} className="text-indigo-600" />
                                    </div>
                                    Edit User
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleModalClose}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Username</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="username"
                                                value={currentUser.username}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                required
                                            />
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={currentUser.password}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                required
                                            />
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="name"
                                                value={currentUser.name}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                required
                                            />
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Admin Privileges</label>
                                        <div className="relative">
                                            <select
                                                name="admin"
                                                value={currentUser.admin}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white appearance-none"
                                            >
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-sm font-medium text-gray-700 flex items-center">
                                            <Layers className="mr-2 text-gray-400" size={18} />
                                            Page Access
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleSelectAllPages}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                        >
                                            {currentUser.selectedPages.length === pageOptions.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-h-60 overflow-y-auto custom-scrollbar">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {pageOptions.map((page) => (
                                                <label key={page} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentUser.selectedPages.includes(page)}
                                                            onChange={() => handlePageToggle(page)}
                                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-indigo-600 checked:bg-indigo-600"
                                                        />
                                                        <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 text-white transition-opacity" viewBox="0 0 14 14" fill="none">
                                                            <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-sm text-gray-700 select-none">{page}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Selected: {currentUser.selectedPages.length} pages
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={handleModalClose}
                                    className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white hover:shadow-sm transition-all"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`flex items-center px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader className="animate-spin mr-2" size={18} />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2" size={18} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

import React, { useState, useEffect } from 'react';
import { Edit, Save, X, Loader, Search, Key, User, Shield, Layers, Eye, EyeOff, Plus, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [mode, setMode] = useState('edit'); // 'edit' or 'add'

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
            const cb = `&_=${Date.now()}`;
            const response = await fetch(`${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=USER&action=fetch${cb}`);
            const result = await response.json();

            if (result.success && result.data && Array.isArray(result.data)) {
                // Skip header row
                const data = result.data.slice(1).map((row, index) => {
                    const isAdmin = (row[3] || 'No').toString().trim().toLowerCase() === 'yes';
                    const isDeleted = (row[10] || '').toString().trim().toLowerCase() === 'deleted'; // Column K is index 10
                    return {
                        originalIndex: index + 1, // Store original index (0-based from slice + 1 for header offset + 1 for 0-index = +2 actually? No. slice(1) removes header. So row 0 in slice is row 2 in sheet.
                        // Wait. slice(1) means row[0] is header. 
                        // If result.data includes header:
                        // Index 0 in map (after slice) is row 2 in Excel.
                        // Excel Row Index = index + 2.

                        // Let's re-verify row index calculation.
                        // Standard: Row 1 is header. Data starts at Row 2.
                        // slice(1) takes from index 1.
                        // map index 0 -> original array index 1 -> Row 2.
                        // So rowIndex = index + 2.
                        rowIndex: index + 2,
                        username: row[0] || '',
                        password: row[1] || '',
                        name: row[2] || '',
                        admin: row[3] || 'No',
                        pageAccess: isAdmin ? pageOptions.join(', ') : (row[5] || ''),
                        isDeleted: isDeleted
                    };
                }).filter(user => !user.isDeleted); // Filter out deleted users
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
        setMode('edit');
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
            if (mode === 'add') {
                // Add New User
                const pageAccessString = currentUser.admin === 'Yes'
                    ? pageOptions.join(', ')
                    : currentUser.selectedPages.join(', ');

                // Construct row data according to requested mapping
                // A:0 (Username), B:1 (Password), C:2 (Name), D:3 (Admin), E:4 (Empty), F:5 (Page Access), ..., K:10 (Status)
                const newRow = new Array(11).fill("");
                newRow[0] = currentUser.username;
                newRow[1] = currentUser.password;
                newRow[2] = currentUser.name;
                newRow[3] = currentUser.admin;
                newRow[5] = pageAccessString;
                newRow[10] = ""; // Not deleted

                const payload = {
                    sheetName: "USER",
                    action: "insert",
                    rowData: JSON.stringify(newRow)
                };

                const response = await fetch(
                    import.meta.env.VITE_GOOGLE_SHEET_URL,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams(payload).toString()
                    }
                );

                const result = await response.json();
                if (result.success) {
                    toast.success("User added successfully");
                    handleModalClose();
                    fetchUsers();
                } else {
                    throw new Error(result.error || "Failed to add user");
                }

            } else {
                // Update Existing User
                // 1. Fetch fresh data to get the correct row index (Concurreny check)
                const cb = `&_=${Date.now()}`;
                const response = await fetch(`${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=USER&action=fetch${cb}`);
                const result = await response.json();

                if (!result.success || !result.data) {
                    throw new Error("Failed to fetch fresh data for update");
                }

                const allData = result.data;
                // Find row index by Username (Column A / Index 0)
                // Use originalUsername
                const rowIndex = allData.findIndex(row => row[0] === currentUser.originalUsername);

                if (rowIndex === -1) {
                    throw new Error("User not found in the latest sheet data. Has it been deleted?");
                }

                // Preserve existing data, update specific columns
                let rowData = [...allData[rowIndex]];
                // Ensure array has enough columns
                while (rowData.length < 11) rowData.push("");

                rowData[0] = currentUser.username;
                rowData[1] = currentUser.password;
                rowData[2] = currentUser.name;
                rowData[3] = currentUser.admin;
                rowData[5] = currentUser.admin === 'Yes' ? pageOptions.join(', ') : currentUser.selectedPages.join(', ');

                const payload = {
                    sheetName: "USER",
                    action: "update",
                    rowIndex: rowIndex + 1, // 1-based index (Row 1 is header, data starts at 0 in array? No. 
                    // API implementation: `rowIndex` usually matches Sheet Row Number.
                    // standard array index + 1 = Sheet Row? 
                    // Wait. `allData` usually includes header at index 0 (Row 1).
                    // So `rowIndex` in `allData` is 0-based.
                    // If Header is Row 1 (index 0). 
                    // User is at index 5. Use Row 6.
                    // So rowIndex + 1 is correct.
                    rowIndex: rowIndex + 1,
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
                    handleModalClose();
                    fetchUsers(); // Refresh list
                } else {
                    throw new Error(updateResult.error || "Update failed");
                }
            }

        } catch (error) {
            console.error("Operation error:", error);
            toast.error(error.message || "Operation failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddClick = () => {
        setCurrentUser({
            username: '',
            password: '',
            name: '',
            admin: 'No',
            selectedPages: [],
            originalUsername: ''
        });
        setMode('add');
        setIsModalOpen(true);
        setShowPassword(true); // Show password field text by default for new users? or keep hidden.
    };

    const openEditModal = (user) => {
        setCurrentUser({
            ...user,
            originalUsername: user.username, // Store original for lookup
            selectedPages: user.pageAccess ? user.pageAccess.split(',').map(p => p.trim()).filter(p => p) : []
        });
        setMode('edit');
        setIsModalOpen(true);
        setShowPassword(false);
    }

    const confirmDelete = (user) => {
        setUserToDelete(user);
        setShowDeleteConfirm(true);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setUserToDelete(null);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);

        try {
            // Using updateCell to mark as Deleted
            // We need the rowIndex. 
            // We can trust user.rowIndex calculated in fetchUsers if data hasn't shifted too much.
            // Or ideally fetch fresh to be safe, but for delete we might risk it or doing a quick lookup.
            // Let's do a quick lookup by username to be safe.

            const cb = `&_=${Date.now()}`;
            const response = await fetch(`${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=USER&action=fetch${cb}`);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error("Failed to verify user before deletion");
            }

            const allData = result.data;
            const rowIndex = allData.findIndex(row => row[0] === userToDelete.username);

            if (rowIndex === -1) {
                throw new Error("User not found or already deleted");
            }

            const payload = {
                sheetName: "USER",
                action: "updateCell", // Using updateCell action
                rowIndex: rowIndex + 1, // 1-based index
                columnIndex: 11, // Column K (A=1... K=11)
                value: "Deleted",
                // Also update Status/Access? No, just mark deleted.
            };

            // Note: If 'updateCell' is not supported by backend, we might need 'update' (row).
            // Let's try 'updateCell' first as it's cleaner. 
            // If the script doesn't support 'updateCell', we fallback to updating the whole row.
            // But let's assume standard GAS backend usually supports it if well written.
            // If unsure, full row update is safest.
            // Let's do full row update to be safe, modifying only Column K.

            const rowData = [...allData[rowIndex]];
            rowData[10] = "Deleted"; // Index 10 is Column K ? (0-based: A=0, K=10) YES.

            const updatePayload = {
                sheetName: "USER",
                action: "update",
                rowIndex: rowIndex + 1,
                rowData: JSON.stringify(rowData)
            };

            const updateResponse = await fetch(
                import.meta.env.VITE_GOOGLE_SHEET_URL,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(updatePayload).toString()
                }
            );

            const updateResult = await updateResponse.json();

            if (updateResult.success) {
                toast.success(`User ${userToDelete.username} deleted successfully`);
                fetchUsers();
            } else {
                throw new Error(updateResult.error || "Delete failed");
            }

        } catch (error) {
            console.error("Delete error:", error);
            toast.error(error.message || "Failed to delete user");
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            setUserToDelete(null);
        }
    };

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

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
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
                    <button
                        onClick={handleAddClick}
                        className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} className="mr-2" />
                        Add User
                    </button>
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
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex justify-center flex-col items-center">
                                            <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                                            <span className="text-gray-600 text-sm">
                                                Loading users...
                                            </span>
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
                                            <div className="flex justify-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg transition-colors hover:bg-indigo-100"
                                                    title="Edit User"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(user)}
                                                    className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg transition-colors hover:bg-red-100"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit/Add Modal */}
            {isModalOpen && currentUser && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleSubmit}>
                            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                    <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                                        {mode === 'add' ? <Plus size={20} className="text-indigo-600" /> : <Edit size={20} className="text-indigo-600" />}
                                    </div>
                                    {mode === 'add' ? 'Add New User' : 'Edit User'}
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
                                        {currentUser.admin !== 'Yes' && (
                                            <button
                                                type="button"
                                                onClick={handleSelectAllPages}
                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                            >
                                                {currentUser.selectedPages.length === pageOptions.length ? 'Deselect All' : 'Select All'}
                                            </button>
                                        )}
                                    </div>

                                    {currentUser.admin === 'Yes' ? (
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                            <p className="text-green-700 text-sm font-medium">Admins have access to all pages by default.</p>
                                        </div>
                                    ) : (
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
                                    )}
                                    {currentUser.admin !== 'Yes' && (
                                        <p className="text-xs text-gray-500">
                                            Selected: {currentUser.selectedPages.length} pages
                                        </p>
                                    )}
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
                                            {mode === 'add' ? 'Creating...' : 'Saving...'}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2" size={18} />
                                            {mode === 'add' ? 'Create User' : 'Save Changes'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && userToDelete && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete User</h3>
                            <p className="text-gray-500 text-center mb-6">
                                Are you sure you want to delete <span className="font-semibold text-gray-800">{userToDelete.username}</span>? This action cannot be undone.
                            </p>

                            <div className="flex space-x-3">
                                <button
                                    onClick={cancelDelete}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex justify-center items-center"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader className="animate-spin mr-2" size={16} />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Delete"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

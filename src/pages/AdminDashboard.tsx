import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, FileText, Settings, LogOut, Check, X, Edit2, Loader2, Save } from 'lucide-react';
import { cn } from '../utils/cn';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'pending' | 'completed' | 'settings'>('users');
  const [token, setToken] = useState('');
  
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  
  const [loading, setLoading] = useState(true);
  const [editingBalance, setEditingBalance] = useState<{id: string, amount: string} | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const [dbError, setDbError] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (!savedToken) {
      navigate('/admin');
      return;
    }
    setToken(savedToken);
    fetchData(savedToken);
  }, []);

  const fetchData = async (authToken: string) => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${authToken}` };
      const [uRes, tRes, cRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/transactions', { headers }),
        fetch('/api/admin/config', { headers })
      ]);
      
      const uText = await uRes.text();
      let uData, tData, cData;
      try {
        uData = JSON.parse(uText);
        tData = await tRes.json();
        cData = await cRes.json();
      } catch (e) {
        if (uRes.status === 500) {
          setDbError('Database not connected. Please check your MONGO_URI in Secrets and ensure IP access is whitelisted.');
        } else {
          console.error('Invalid JSON response');
        }
        setLoading(false);
        return;
      }
      
      if (uRes.status === 500) {
        setDbError(uData.error || 'Database connection error');
        return;
      }
      
      if (uRes.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
        return;
      }

      setUsers(uData);
      setTransactions(tData);
      setConfig(cData);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async (userId: string) => {
    if (!editingBalance) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ balance: Number(editingBalance.amount) })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(users.map(u => u._id === userId ? updatedUser : u));
        setEditingBalance(null);
      }
    } catch (err) {
      alert('Failed to update balance');
    }
  };

  const handleUpdateTransaction = async (txId: string, status: 'Success' | 'Rejected') => {
    try {
      const res = await fetch(`/api/admin/transactions/${txId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData(token); // Refresh all data to sync balances & txs
      }
    } catch (err) {
      alert('Failed to update transaction');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert('Configuration saved successfully');
      }
    } catch (err) {
      alert('Failed to save config');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (dbError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl max-w-md w-full border border-red-200 text-center shadow-lg">
          <h2 className="text-xl font-bold mb-2">Database Connection Failed</h2>
          <p className="text-sm font-medium">{dbError}</p>
        </div>
      </div>
    );
  }

  const pendingTxs = transactions.filter(t => t.status === 'Pending');
  const completedTxs = transactions.filter(t => t.status !== 'Pending');

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-wider text-blue-400">ADMIN PANEL</h1>
        </div>
        <nav className="flex-1 py-4">
          <button onClick={() => setActiveTab('users')} className={cn("w-full flex items-center px-6 py-3 text-sm transition-colors", activeTab === 'users' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-300')}>
            <Users className="w-5 h-5 mr-3" /> Users Tracker
          </button>
          <button onClick={() => setActiveTab('pending')} className={cn("w-full flex items-center px-6 py-3 text-sm transition-colors", activeTab === 'pending' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-300')}>
            <FileText className="w-5 h-5 mr-3" /> Pending Requests
            {pendingTxs.length > 0 && <span className="ml-auto bg-blue-500 text-xs px-2 py-0.5 rounded-full">{pendingTxs.length}</span>}
          </button>
          <button onClick={() => setActiveTab('completed')} className={cn("w-full flex items-center px-6 py-3 text-sm transition-colors", activeTab === 'completed' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-300')}>
            <Check className="w-5 h-5 mr-3" /> Completed Archives
          </button>
          <button onClick={() => setActiveTab('settings')} className={cn("w-full flex items-center px-6 py-3 text-sm transition-colors", activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-300')}>
            <Settings className="w-5 h-5 mr-3" /> Config & Gateways
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => { localStorage.removeItem('adminToken'); navigate('/admin'); }} className="flex items-center text-slate-400 hover:text-white transition-colors">
            <LogOut className="w-5 h-5 mr-2" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Global User Tracker</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telegram ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance (₹)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(u => (
                      <tr key={u._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{u.firstName}</div>
                              <div className="text-sm text-gray-500">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.telegramId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {editingBalance?.id === u._id ? (
                            <input 
                              type="number" 
                              className="border rounded px-2 py-1 w-24"
                              value={editingBalance.amount}
                              onChange={e => setEditingBalance({...editingBalance, amount: e.target.value})}
                            />
                          ) : (
                            `₹${u.balance}`
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editingBalance?.id === u._id ? (
                            <button onClick={() => handleUpdateBalance(u._id)} className="text-green-600 hover:text-green-900 mr-3">Save</button>
                          ) : (
                            <button onClick={() => setEditingBalance({id: u._id, amount: u.balance.toString()})} className="text-blue-600 hover:text-blue-900">
                              <Edit2 className="w-4 h-4 inline" /> Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PENDING REQUESTS TAB */}
          {activeTab === 'pending' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Pending Manual Requests (UPI)</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gateway</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingTxs.map(tx => (
                      <tr key={tx._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tx.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.userId?.firstName} (ID: {tx.userId?.telegramId})</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{tx.gateway}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{tx.accountId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{tx.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleUpdateTransaction(tx._id, 'Success')} className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md mr-2">Approve</button>
                          <button onClick={() => handleUpdateTransaction(tx._id, 'Rejected')} className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md">Reject</button>
                        </td>
                      </tr>
                    ))}
                    {pendingTxs.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No pending requests found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMPLETED TAB */}
          {activeTab === 'completed' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Completed Payout Archives</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tx ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {completedTxs.map(tx => (
                      <tr key={tx._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tx.updatedAt).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">{tx.txId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.userId?.firstName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{tx.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", tx.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Gateway & Bot Configurations</h2>
              <form onSubmit={handleSaveConfig} className="bg-white rounded-lg shadow p-8 space-y-8 max-w-4xl">
                
                <div className="grid grid-cols-2 gap-8">
                  {/* ULTRA PAY */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Ultra Pay Gateway</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint URL</label>
                      <input type="text" value={config?.ultraPayEndpoint || ''} onChange={e => setConfig({...config, ultraPayEndpoint: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="https://api.ultrapay.com/v1/payout" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bearer Token Key</label>
                      <input type="password" value={config?.ultraPayToken || ''} onChange={e => setConfig({...config, ultraPayToken: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="sk_live_..." />
                    </div>
                  </div>

                  {/* VSV */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">VSV Gateway</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint URL</label>
                      <input type="text" value={config?.vsvEndpoint || ''} onChange={e => setConfig({...config, vsvEndpoint: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="https://api.vsv.network/withdraw" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bearer Token Key</label>
                      <input type="password" value={config?.vsvToken || ''} onChange={e => setConfig({...config, vsvToken: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="vsv_live_..." />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-8 grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Global Constraints</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Withdrawal (₹)</label>
                        <input type="number" value={config?.minWithdrawal || ''} onChange={e => setConfig({...config, minWithdrawal: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Withdrawal (₹)</label>
                        <input type="number" value={config?.maxWithdrawal || ''} onChange={e => setConfig({...config, maxWithdrawal: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Telegram Bot Settings</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Proof Channel Handle</label>
                      <input type="text" value={config?.proofChannel || ''} onChange={e => setConfig({...config, proofChannel: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="@MyWalletProofsChannel" />
                      <p className="text-xs text-gray-500 mt-1">Bot must be an admin in this channel to send receipts.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={savingConfig} className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 flex items-center">
                    {savingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Configurations
                  </button>
                </div>
              </form>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}

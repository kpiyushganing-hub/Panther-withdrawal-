import React, { useState, useEffect } from 'react';
import { Send, Wallet, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

// Simulate Telegram WebApp initData for browser testing
const MOCK_INIT_DATA = {
  id: 660199221,
  first_name: 'John',
  username: 'johndoe',
  photo_url: 'https://ui-avatars.com/api/?name=John+Doe'
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [dbError, setDbError] = useState('');
  
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const initTelegram = async () => {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          tg.ready();
          tg.expand();
          
          const initDataUnsafe = tg.initDataUnsafe;
          if (!initDataUnsafe || !initDataUnsafe.user) {
            setAccessDenied(true);
            setLoading(false);
            return;
          }

          const res = await fetch('/api/v1/auth/telegram-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData })
          });
          
          const text = await res.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new Error('Non-JSON response from server: ' + text.substring(0, 50));
          }
          
          if (res.status === 500) {
            setDbError(data.error);
          } else if (res.status === 401) {
            setAccessDenied(true);
          } else if (data.token) {
            setToken(data.token);
            setUser(data.user);
          } else {
             setAccessDenied(true);
          }
        } else {
           // Not in Telegram environment
           setAccessDenied(true);
        }
      } catch (err) {
        console.error('Login error', err);
        setAccessDenied(true);
      } finally {
        setLoading(false);
      }
    };
    initTelegram();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawing(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gateway: selectedGateway,
          accountId,
          amount: Number(amount)
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Withdrawal request submitted successfully!' });
        setUser({ ...user, balance: data.newBalance });
        setAccountId('');
        setAmount('');
        setTimeout(() => setSelectedGateway(null), 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to withdraw' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900">
        <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-lg border border-gray-100">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h2 className="text-2xl font-bold mb-3 text-gray-800">⚠️ Access Denied</h2>
          <p className="text-gray-600 font-medium leading-relaxed">Please open this web wallet application strictly inside the official Telegram Bot interface.</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl max-w-md w-full border border-red-200 text-center shadow-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">Database Connection Failed</h2>
          <p className="text-sm font-medium">{dbError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      {/* Header - Gmail Pay Style */}
      <header className="bg-white shadow-sm pt-6 pb-4 px-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
              </div>
              <span className="text-xl font-medium text-gray-800 tracking-tight">GPay<span className="text-blue-600 font-bold ml-1">Wallet</span></span>
            </div>
            
            <div className="flex items-center space-x-3 bg-gray-100 px-3 py-1.5 rounded-full">
              <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className="text-sm">
                <div className="font-medium leading-none">{user?.firstName}</div>
                <div className="text-xs text-gray-500">ID: {user?.telegramId}</div>
              </div>
            </div>
          </div>

          <div className="text-center bg-blue-600 text-white rounded-2xl p-6 shadow-lg shadow-blue-200">
            <p className="text-blue-100 text-sm font-medium mb-1">Available Balance</p>
            <h1 className="text-4xl font-bold tracking-tight">₹{(user?.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Payout Method</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* UPI */}
          <button 
            onClick={() => setSelectedGateway('UPI')}
            className={cn(
              "relative bg-white p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2",
              selectedGateway === 'UPI' ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-200 hover:border-blue-300"
            )}
          >
            <div className="absolute -top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">BEST</div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <span className="font-medium text-gray-800">UPI</span>
          </button>

          {/* ULTRA PAY */}
          <button 
            onClick={() => setSelectedGateway('ULTRA_PAY')}
            className={cn(
              "relative bg-white p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2",
              selectedGateway === 'ULTRA_PAY' ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-200 hover:border-blue-300"
            )}
          >
            <div className="absolute -top-3 right-3 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">NEW</div>
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-medium text-gray-800">Ultra Pay</span>
          </button>

          {/* VSV */}
          <button 
            onClick={() => setSelectedGateway('VSV')}
            className={cn(
              "relative bg-white p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2",
              selectedGateway === 'VSV' ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-200 hover:border-blue-300"
            )}
          >
            <div className="absolute -top-3 right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">HOT</div>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
            </div>
            <span className="font-medium text-gray-800">VSV</span>
          </button>

          {/* COMING SOON */}
          <button 
            disabled
            className="relative bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 flex flex-col items-center justify-center gap-2 opacity-60 cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-1">
              <LockIcon />
            </div>
            <span className="font-medium text-gray-400 text-sm">Coming Soon</span>
          </button>
        </div>

        {selectedGateway && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Withdraw via {selectedGateway === 'ULTRA_PAY' ? 'Ultra Pay' : selectedGateway}
            </h3>
            
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedGateway === 'UPI' ? 'Enter UPI ID' : 
                   selectedGateway === 'ULTRA_PAY' ? 'Phone Number / Wallet ID' : 
                   'VSV Wallet Account ID'}
                </label>
                <input
                  type="text"
                  required
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  placeholder={selectedGateway === 'UPI' ? 'username@upi' : 'Enter account ID'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    max={user?.walletBalance}
                    step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 text-gray-900 font-semibold text-lg"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">Available: ₹{user?.walletBalance}</p>
              </div>

              {message.text && (
                <div className={cn("p-3 rounded-lg text-sm flex items-start gap-2", message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')}>
                  {message.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5" /> : <CheckCircle className="w-4 h-4 mt-0.5" />}
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={withdrawing || !amount || !accountId}
                className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {withdrawing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Withdrawal'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
  );
}

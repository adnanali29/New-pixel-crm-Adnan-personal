import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const success = await login(email, password);
      if (success) {
        navigate('/enquiry');
      } else {
        setError('Incorrect email or password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 50%, #FFF7ED 100%)' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #4F46E5, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #059669, transparent)' }} />
      </div>

      <div className="w-full max-w-md px-4 relative z-10">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
            <div className="flex justify-center mb-4">
              <div className="bg-white rounded-2xl p-4 shadow-inner">
                <img
                  src="https://i.ibb.co/8Cb3v5M/Insta-Posts-10.png"
                  alt="Pixel CRM Logo"
                  className="h-16 w-auto object-contain"
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 size={28} className="text-white" />
              <h1 className="text-3xl font-bold text-white tracking-tight">PIXEL CRM</h1>
            </div>
            <p className="text-indigo-200 text-sm">Customer Relationship Management</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Welcome Back!</h2>
            <p className="text-slate-500 text-sm mb-6">Enter your credentials to access the CRM.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">@</div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-base transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-base transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-60 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              >
                {loading ? 'Signing In...' : 'Sign In to CRM'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">Powered by Pixel Web Pages</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

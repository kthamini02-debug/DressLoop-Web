import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, ArrowRight, Sparkles, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center flex-1 flex flex-col justify-center items-center relative z-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Giving clothes a second life, together</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight max-w-4xl leading-tight">
          Smart Clothing Donation <br />
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
            Platform for Kind Hearts
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
          Connect directly with verified NGOs, orphanages, and shelter homes. Upload clothes you want to donate and track their journey until they reach those in need.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
          {user ? (
            <Link
              to={user.role === 'admin' ? '/admin' : user.role === 'donor' ? '/donor' : '/ngo'}
              className="flex items-center justify-center px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center justify-center px-8 py-3.5 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 text-white font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex items-center justify-center px-8 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Register as Donor / NGO
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl text-left hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Simple Uploads</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Donors can snap pictures and list clothing details such as size, age group, and condition in under a minute.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-6 rounded-2xl text-left hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Verified Organizations Only</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every NGO registration undergoes strict manual admin audit of registration documentation to avoid fraud.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-6 rounded-2xl text-left hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Real-Time Chat & Flow</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Coordinate collections easily via direct, secure instant messaging once a request has been accepted.
            </p>
          </div>
        </div>

        {/* Mini stats counters */}
        <div className="mt-16 border-t border-slate-100 dark:border-slate-800 w-full pt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <span className="block text-3xl font-bold text-slate-800 dark:text-white">10k+</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold mt-1 block">Donations Closed</span>
          </div>
          <div>
            <span className="block text-3xl font-bold text-slate-800 dark:text-white">150+</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold mt-1 block">Verified NGOs</span>
          </div>
          <div>
            <span className="block text-3xl font-bold text-slate-800 dark:text-white">99.8%</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold mt-1 block">Collection Rate</span>
          </div>
          <div>
            <span className="block text-3xl font-bold text-slate-800 dark:text-white">1.2 Tons</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold mt-1 block">Waste Prevented</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 relative z-10 bg-white dark:bg-slate-900 transition-colors duration-200">
        <p>&copy; {new Date().getFullYear()} Dress - Smart Clothing Donation Platform. Built for Social Good.</p>
      </footer>
    </div>
  );
};

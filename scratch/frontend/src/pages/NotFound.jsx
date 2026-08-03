import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="flex flex-col min-h-[70vh] items-center justify-center bg-brand-secondary py-16 px-6">
      <div className="max-w-md w-full bg-white border border-brand-border rounded-2xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-500/10 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-brand-error" />
        </div>
        
        <h1 className="text-5xl font-black text-brand-primary">404</h1>
        <h2 className="text-xl font-bold text-brand-primary mt-2">Page Not Found</h2>
        
        <p className="mt-4 text-sm text-gray-500 leading-relaxed">
          The requested page does not exist or has been relocated as part of the compliance guidelines. 
          Please return to the home screen or log in if you have credential access.
        </p>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link 
            to="/" 
            className="inline-flex items-center justify-center space-x-2 bg-brand-primary hover:bg-opacity-90 text-white font-semibold text-xs px-5 py-3 rounded-lg transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Home</span>
          </Link>
          
          <Link 
            to="/login" 
            className="inline-flex items-center justify-center bg-white border border-brand-border hover:bg-gray-50 text-brand-primary font-semibold text-xs px-5 py-3 rounded-lg transition-all"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

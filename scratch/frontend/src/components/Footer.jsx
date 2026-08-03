import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-brand-border py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
        <div className="mb-4 md:mb-0">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold tracking-tight text-brand-primary">HelpingHands</span>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-brand-secondary border border-brand-border text-brand-primary rounded">
              v2.0
            </span>
          </Link>
          <p className="mt-2 text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Helping Hands. All rights reserved.
          </p>
        </div>
        
        <div className="flex space-x-6">
          <Link to="/" className="hover:text-brand-accent transition-colors">Home</Link>
          <Link to="/about" className="hover:text-brand-accent transition-colors">About Us</Link>
          <Link to="/contact" className="hover:text-brand-accent transition-colors">Contact</Link>
          <a href="#" className="hover:text-brand-accent transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-brand-accent transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

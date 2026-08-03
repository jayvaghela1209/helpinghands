import React from 'react';
import { Shield, Target, Users, BookOpen } from 'lucide-react';

export const About = () => {
  return (
    <div className="flex flex-col min-h-screen bg-brand-secondary py-16">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-primary">About Helping Hands</h1>
          <p className="mt-4 text-lg text-gray-600">
            A verified volunteering and CSR collaboration platform designed to build trust, transparency, and social impact.
          </p>
        </div>

        {/* Content Section */}
        <div className="bg-white border border-brand-border rounded-2xl p-8 sm:p-12 shadow-sm space-y-12">
          
          {/* Mission */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center border border-brand-primary/10">
                <Target className="w-4.5 h-4.5 text-brand-primary" />
              </div>
              <h2 className="text-2xl font-bold text-brand-primary">Our Mission</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
              Volunteering is the heartbeat of social change. However, fake attendance records, unverified organizations, 
              and poor funding transparency often limit its potential. Helping Hands resolves these issues by creating a centralized, 
              accountable ecosystem connecting Volunteers, Non-Governmental Organizations (NGOs), and Corporate sponsors.
            </p>
          </div>

          {/* Core Values / Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-brand-border">
            <div>
              <div className="flex items-center space-x-2.5 mb-3">
                <Shield className="w-5 h-5 text-brand-accent" />
                <h3 className="font-bold text-brand-primary">Strict Verification</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                We Vet all NGOs and Corporates using standard organizational registration identifiers to verify authenticity before active involvement.
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2.5 mb-3">
                <Users className="w-5 h-5 text-brand-accent" />
                <h3 className="font-bold text-brand-primary">Stakeholder Alignment</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Connect NGOs looking for support, volunteers looking to give back, and corporates needing CSR compliance records in one unified place.
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="pt-8 border-t border-brand-border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 rounded bg-yellow-50 flex items-center justify-center border border-brand-accent/10">
                <BookOpen className="w-4.5 h-4.5 text-brand-accent" />
              </div>
              <h2 className="text-2xl font-bold text-brand-primary">High-Level Architecture</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm mb-6">
              The project is built using a modern decoupled layout, offering high maintainability:
            </p>
            <div className="bg-brand-secondary border border-brand-border rounded-xl p-6 font-mono text-xs text-brand-primary">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-brand-accent">[Presentation]</span>
                <span>React SPA built with CSS Variables & Bootstrap-aligned parameters.</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="font-semibold text-brand-accent">[Business Logic]</span>
                <span>FastAPI endpoints handling token checks, validation algorithms.</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="font-semibold text-brand-accent">[Data Access]</span>
                <span>PostgreSQL DB (Supabase) storing transactions and attendance audit trails.</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default About;

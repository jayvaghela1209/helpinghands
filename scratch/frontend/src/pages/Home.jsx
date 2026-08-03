import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, MapPin, Users, Award, ArrowRight, Heart, Building } from 'lucide-react';

export const Home = () => {
  return (
    <div className="flex flex-col min-h-screen bg-brand-secondary">
      {/* Hero Section */}
      <section className="relative bg-white py-20 border-b border-brand-border overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-yellow-50 border border-brand-accent/20 rounded-full text-xs font-semibold text-brand-accent mb-6">
              <Award className="w-3.5 h-3.5" />
              <span>Verified Volunteering & CSR Compliance</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-brand-primary leading-tight">
              Empowering Communities Through <span className="text-brand-accent">Trusted Collaboration</span>
            </h1>
            
            <p className="mt-6 text-lg text-gray-600 max-w-xl">
              Helping Hands connects passionate volunteers with verified NGOs and corporate sponsors. 
              Our GPS-based attendance validation and automated credit scoring ensure maximum impact and absolute transparency.
            </p>
            
            <div className="mt-10 flex flex-wrap gap-4">
              <Link 
                to="/signup" 
                className="inline-flex items-center space-x-2 bg-brand-primary hover:bg-opacity-90 text-white font-semibold text-sm px-6 py-3.5 rounded-lg shadow-sm hover:shadow transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                to="/about" 
                className="bg-brand-secondary border border-brand-border hover:bg-gray-100 text-brand-primary font-semibold text-sm px-6 py-3.5 rounded-lg transition-all"
              >
                Learn More
              </Link>
            </div>
          </div>
          
          <div className="relative flex justify-center">
            {/* Visual element placeholder or background shape */}
            <div className="w-full max-w-md h-80 rounded-2xl bg-gradient-to-tr from-brand-primary/10 to-brand-accent/15 flex items-center justify-center border border-brand-border shadow-inner">
              <Heart className="w-24 h-24 text-brand-primary/40 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Pillars */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-brand-primary">Built On Trust and Accountability</h2>
          <p className="mt-4 text-gray-600">
            Traditional volunteering platforms lack verification mechanisms. Helping Hands introduces solid compliance and modern technology tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div className="bg-white border border-brand-border rounded-xl p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-brand-primary/15 flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-brand-primary" />
            </div>
            <h3 className="text-xl font-bold text-brand-primary mb-3">Verified Profiles</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Every NGO and Corporate organization is vetted by our Platform Operators before accessing features. Zero fraud, full credibility.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white border border-brand-border rounded-xl p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-yellow-50 border border-brand-accent/15 flex items-center justify-center mb-6">
              <MapPin className="w-6 h-6 text-brand-accent" />
            </div>
            <h3 className="text-xl font-bold text-brand-primary mb-3">GPS Attendance Validation</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Volunteers perform GPS-based Check-In and Check-Out. The backend validates location via the Haversine formula to eliminate fake attendance.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white border border-brand-border rounded-xl p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-green-50 border border-emerald-500/15 flex items-center justify-center mb-6">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-brand-primary mb-3">Credit Logs & Certificates</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Earn credits and verified certificates for completed hours. Build your volunteer portfolio with immutable history.
            </p>
          </div>
        </div>
      </section>

      {/* Stakeholders Section */}
      <section className="bg-white py-20 border-y border-brand-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-brand-primary">Solutions for Everyone</h2>
            <p className="mt-4 text-gray-600">
              Three unique dashboards designed to streamline collaboration between individual volunteers, NGOs, and Corporates.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Volunteers */}
            <div className="bg-brand-secondary border border-brand-border rounded-xl p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <Users className="w-6 h-6 text-brand-primary" />
                  <h3 className="text-lg font-bold text-brand-primary">Volunteers</h3>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 mb-8">
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span>Browse and apply to local opportunities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span>GPS Check-In and Check-Out at events</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span>Earn recognition credit points</span>
                  </li>
                </ul>
              </div>
              <Link to="/signup" className="text-sm font-semibold text-brand-primary hover:text-brand-accent transition-colors flex items-center space-x-1">
                <span>Join as a Volunteer</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* NGOs */}
            <div className="bg-brand-secondary border border-brand-border rounded-xl p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <Heart className="w-6 h-6 text-brand-primary" />
                  <h3 className="text-lg font-bold text-brand-primary">NGOs</h3>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 mb-8">
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span>Post volunteering requirements</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span>Manage volunteer applications</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span>Receive CSR funding support</span>
                  </li>
                </ul>
              </div>
              <Link to="/signup" className="text-sm font-semibold text-brand-primary hover:text-brand-accent transition-colors flex items-center space-x-1">
                <span>Register your Organization</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Corporates */}
            <div className="bg-brand-secondary border border-brand-border rounded-xl p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <Building className="w-6 h-6 text-brand-primary" />
                  <h3 className="text-lg font-bold text-brand-primary">Corporates</h3>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 mb-8">
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span>Fund verified NGO projects</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span>Sponsor volunteering opportunities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    <span>Track employee CSR engagement</span>
                  </li>
                </ul>
              </div>
              <Link to="/signup" className="text-sm font-semibold text-brand-primary hover:text-brand-accent transition-colors flex items-center space-x-1">
                <span>Partner for CSR compliance</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

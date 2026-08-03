import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.name && form.email && form.message) {
      setSubmitted(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-secondary py-16">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-primary">Contact Us</h1>
          <p className="mt-4 text-lg text-gray-600">
            Have questions about NGO verification, corporate sponsorships, or attendance scoring? Let us know.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info Details column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-brand-border rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-brand-primary mb-6">Support Channels</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-brand-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-brand-primary">Email Support</h3>
                    <p className="text-xs text-gray-500 mt-1">support@helpinghands.org</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-50 border border-brand-accent/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-brand-primary">Phone Inquiries</h3>
                    <p className="text-xs text-gray-500 mt-1">+1 (555) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-green-50 border border-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-brand-primary">Headquarters</h3>
                    <p className="text-xs text-gray-500 mt-1">100 Social Impact Ave, Suite 300, San Francisco, CA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form column */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-brand-border rounded-2xl p-8 sm:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-brand-primary mb-6">Send us a Message</h2>
              
              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-500/20 text-emerald-800 rounded-xl p-6 flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm">Message Sent Successfully</h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      Thank you for contacting Helping Hands. Our platform support team will review your message and reach out shortly.
                    </p>
                    <button 
                      onClick={() => setSubmitted(false)}
                      className="mt-4 text-xs font-semibold underline text-emerald-800 hover:text-emerald-950"
                    >
                      Send another message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Your Name</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-brand-secondary border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-colors"
                        placeholder="John Doe"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Email Address</label>
                      <input 
                        type="email" 
                        required
                        className="w-full bg-brand-secondary border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-colors"
                        placeholder="john@example.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Subject</label>
                    <input 
                      type="text" 
                      className="w-full bg-brand-secondary border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-colors"
                      placeholder="Verification Inquiry"
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Message</label>
                    <textarea 
                      required
                      rows={5}
                      className="w-full bg-brand-secondary border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-colors resize-none"
                      placeholder="Write your message here..."
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center space-x-2 bg-brand-primary hover:bg-opacity-90 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-all"
                  >
                    <span>Send Message</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Contact;

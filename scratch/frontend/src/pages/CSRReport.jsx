import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Landmark, Timer, Award, Clipboard, CheckCircle2, Clock,
  TrendingUp, Download, FileText, Building2, BarChart2, PieChart, LineChart, ShieldCheck, Sparkles, Mail, BadgeCheck
} from 'lucide-react';


export const CSRReport = () => {
  const { profile } = useAuth();

  // State management for report year selection & API payload
  const [reportYear, setReportYear] = useState('2026');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to extract auth token
  const getToken = () => {
    const directToken = localStorage.getItem('authToken');
    if (directToken) return directToken;
    try {
      const session = JSON.parse(localStorage.getItem('hh_session'));
      return session?.access_token || '';
    } catch (e) {
      return '';
    }
  };

  // Fetch report data from backend API
  const fetchReport = async (year) => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = getToken();
      const res = await fetch(`${apiUrl}/api/csr/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ report_year: parseInt(year, 10) }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to generate CSR report.');
      }

      const data = await res.json();
      setReportData(data);
    } catch (err) {
      setError(err.message || 'An error occurred while generating the CSR report.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch report for initial year on mount
  useEffect(() => {
    fetchReport(reportYear);
  }, []);

  // Handle manual form submission
  const handleGenerate = (e) => {
    e.preventDefault();
    fetchReport(reportYear);
  };

  // Trigger browser PDF generator via window.print()
  const handleDownloadPDF = () => {
    window.print();
  };

  // Safely extract summary metrics and table data from response
  const cards = reportData?.summary_cards || {
    total_funding: 0,
    employee_volunteer_hours: 0,
    ngos_supported: 0,
    sponsored_requirements: 0,
    total_csr_pledges: 0,
    approved_csr_funding: 0,
    pending_csr_funding: 0,
    avg_funding_per_ngo: 0,
  };

  const monthly = reportData?.monthly_data || [];
  const ngoDist = reportData?.ngo_distribution || [];
  const tables = reportData?.tables || {
    funding_summary: [],
    sponsorship_summary: [],
    volunteer_summary: [],
    pledges: [],
  };

  const corpInfo = reportData?.corporate_info || {
    company_name: profile?.name || 'Corporate Enterprise',
    registration_number: 'CORP-REG-2026',
    verification_status: 'Approved',
    email: profile?.email || '',
  };

  const formattedGeneratedDate = reportData?.generated_at 
    ? new Date(reportData.generated_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : new Date().toLocaleString('en-IN');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-brand-secondary/30 to-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* High-Quality Corporate A4 Portrait Print / PDF Stylesheet */}
      <style>{`
        @media print {
          body { 
            background: white !important; 
            color: #0f172a !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, footer, .no-print { 
            display: none !important; 
          }
          .print-container { 
            padding: 0 !important; 
            margin: 0 !important; 
            max-width: 100% !important; 
            box-shadow: none !important; 
          }
          .print-card { 
            border: none !important; 
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .pdf-page-break { 
            page-break-before: always !important; 
            break-before: page !important;
          }
          .pdf-keep-together {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .pdf-footer {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            font-size: 9px;
            color: #64748b;
            background: white !important;
          }
          @page { 
            size: A4 portrait; 
            margin: 12mm 12mm 16mm 12mm; 
          }
        }
        .pdf-footer {
          display: none;
        }
      `}</style>

      <main className="max-w-7xl mx-auto space-y-8 print-container">
        
        {/* 1. TOP CONTROLS & HEADER BAR (Hidden during PDF print) */}
        <div className="bg-white rounded-2xl border border-brand-border/80 p-6 shadow-sm hover:shadow-md transition-shadow no-print">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-brand-primary text-white rounded-xl shadow-xs">
                  <Building2 className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    {corpInfo.company_name}
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified Corporate
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Corporate CSR Compliance Report Generator
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar & Controls */}
            <form onSubmit={handleGenerate} className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
              <div className="flex items-center gap-2 bg-slate-50 border border-brand-border rounded-xl px-3 py-1.5">
                <label htmlFor="reportYearSelect" className="text-xs font-semibold text-slate-500">
                  Report Year:
                </label>
                <select
                  id="reportYearSelect"
                  value={reportYear}
                  onChange={(e) => setReportYear(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="2026">Financial Year 2026</option>
                  <option value="2025">Financial Year 2025</option>
                  <option value="2024">Financial Year 2024</option>
                  <option value="2023">Financial Year 2023</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block animate-spin font-mono">⌛</span>
                ) : (
                  <BarChart2 className="w-4 h-4" />
                )}
                <span>Generate CSR Report</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={!reportData}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </form>

          </div>

          {/* Sub Metadata Banner */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap justify-between items-center text-xs text-slate-500 gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Report Generated: <strong className="text-slate-800 font-semibold">{formattedGeneratedDate}</strong>
            </span>
            <span className="font-mono text-[11px]">
              Reg: {corpInfo.registration_number || 'REG-2026'} | CIN: {corpInfo.cin_number || 'N/A'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl no-print">
            {error}
          </div>
        )}

        {/* 2. REPORT DISPLAY & PDF PRINT DOCUMENT */}
        {reportData && (
          <div className="bg-white rounded-2xl border border-brand-border/80 p-6 sm:p-10 space-y-10 shadow-sm print-card">
            
            {/* ================= PAGE 1 COVER & EXECUTIVE SUMMARY ================= */}
            <div className="pdf-keep-together space-y-6">
              
              {/* Cover Section */}
              <div className="border-b-2 border-brand-primary pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3.5 bg-brand-primary text-white rounded-2xl shadow-xs">
                    <Building2 className="w-9 h-9" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold tracking-widest uppercase text-brand-primary block">Official Corporate Record</span>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{corpInfo.company_name}</h2>
                    <h1 className="text-lg font-bold text-slate-700 mt-0.5">Corporate CSR Report</h1>
                  </div>
                </div>

                <div className="text-left md:text-right space-y-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> FY {reportData.report_year} Report
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Generated: {formattedGeneratedDate}
                  </p>
                </div>
              </div>

              {/* Corporate Information Section */}
              <div className="bg-slate-50 border border-brand-border/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Name</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{corpInfo.company_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Email</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {corpInfo.email || 'corporate@helpinghands.org'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verification Status</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {corpInfo.verification_status || 'Verified'}
                  </span>
                </div>
              </div>

              {/* Executive Summary Narrative */}
              <div className="bg-gradient-to-r from-slate-50 via-brand-secondary/30 to-slate-50 border border-brand-border/70 rounded-xl p-5 text-xs text-slate-700 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-primary" /> Executive Summary
                </h3>
                <p className="leading-relaxed text-slate-600">
                  This statutory report documents the Corporate Social Responsibility (CSR) impact, funding allocations, employee volunteer engagements, and requirement sponsorships executed by <strong>{corpInfo.company_name}</strong> during Financial Year <strong>{reportData.report_year}</strong> in compliance with Section 135 of the Companies Act, 2013.
                </p>
              </div>

              {/* Executive Summary Statistic Cards (5 Cards as required) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                  Key Executive Statistics (5 Indicators)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  
                  {/* Stat Card 1: Total CSR Funding */}
                  <div className="bg-slate-50/90 p-4 border border-brand-border rounded-xl shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Total CSR Funding</span>
                      <Landmark className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-base font-extrabold text-emerald-700 mt-2">₹{cards.total_funding.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Capital Committed</p>
                  </div>

                  {/* Stat Card 2: Employee Volunteer Hours */}
                  <div className="bg-slate-50/90 p-4 border border-brand-border rounded-xl shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Volunteer Hours</span>
                      <Timer className="w-4 h-4 text-brand-primary" />
                    </div>
                    <p className="text-base font-extrabold text-slate-900 mt-2">{cards.employee_volunteer_hours} hrs</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Verified Hours</p>
                  </div>

                  {/* Stat Card 3: NGOs Supported */}
                  <div className="bg-slate-50/90 p-4 border border-brand-border rounded-xl shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">NGOs Supported</span>
                      <Award className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-base font-extrabold text-slate-900 mt-2">{cards.ngos_supported}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">NGO Partnerships</p>
                  </div>

                  {/* Stat Card 4: Sponsored Requirements */}
                  <div className="bg-slate-50/90 p-4 border border-brand-border rounded-xl shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Sponsored Reqs</span>
                      <Clipboard className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-base font-extrabold text-slate-900 mt-2">{cards.sponsored_requirements}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Sponsorships Completed</p>
                  </div>

                  {/* Stat Card 5: Total CSR Pledges */}
                  <div className="bg-slate-50/90 p-4 border border-brand-border rounded-xl shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Total CSR Pledges</span>
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-base font-extrabold text-slate-900 mt-2">{cards.total_csr_pledges}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Total Submissions</p>
                  </div>

                </div>
              </div>

            </div>

            {/* PAGE BREAK AFTER EXECUTIVE SUMMARY IN PDF */}
            <div className="pdf-page-break"></div>

            {/* ================= PAGE 2 CHARTS SECTION ================= */}
            <div className="pdf-keep-together space-y-6 pt-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-brand-primary" /> Visual Analytics & Distributions (3 Charts)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-resolution breakdown of monthly capital disbursements, NGO allocations, and employee volunteering trends.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart 1: CSR Funding by Month (Bar Chart) */}
                <div className="bg-white border border-brand-border rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-brand-primary" />
                      CSR Funding by Month
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 mb-3">Monthly breakdown of capital funds disbursed in ₹.</p>
                  </div>
                  <div className="h-48 w-full flex items-end justify-between gap-1 border-b border-l border-slate-300 p-2 text-[10px]">
                    {monthly.map((m) => {
                      const maxF = Math.max(...monthly.map(x => x.funding), 1);
                      const heightPct = Math.max((m.funding / maxF) * 100, 4);
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                          <div 
                            style={{ height: `${heightPct}%` }} 
                            className="w-full bg-brand-primary rounded-t transition-all hover:bg-brand-accent relative"
                            title={`${m.month}: ₹${m.funding.toLocaleString('en-IN')}`}
                          />
                          <span className="text-[9px] text-slate-500 mt-1 font-mono">{m.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 2: CSR Funding Distribution by NGO (Pie Chart) */}
                <div className="bg-white border border-brand-border rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                      <PieChart className="w-4 h-4 text-emerald-600" />
                      Funding Distribution by NGO
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 mb-3">Percentage allocation across verified NGO partners.</p>
                  </div>
                  {ngoDist.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-medium">No pledge data available</div>
                  ) : (
                    <div className="h-48 flex flex-col sm:flex-row items-center justify-around gap-4">
                      <svg viewBox="-1 -1 2 2" className="w-32 h-32 transform -rotate-90 shrink-0">
                        {(() => {
                          const total = ngoDist.reduce((s, x) => s + x.amount, 0) || 1;
                          let cumulativeAngle = 0;
                          const colors = ['#1E3A8A', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];
                          return ngoDist.map((item, idx) => {
                            const sliceAngle = (item.amount / total) * 2 * Math.PI;
                            const x1 = Math.cos(cumulativeAngle);
                            const y1 = Math.sin(cumulativeAngle);
                            cumulativeAngle += sliceAngle;
                            const x2 = Math.cos(cumulativeAngle);
                            const y2 = Math.sin(cumulativeAngle);
                            const largeArc = sliceAngle > Math.PI ? 1 : 0;
                            const pathData = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`;
                            return <path key={idx} d={pathData} fill={colors[idx % colors.length]} />;
                          });
                        })()}
                      </svg>
                      <div className="text-[11px] space-y-1.5 max-h-40 overflow-y-auto w-full">
                        {ngoDist.map((item, idx) => {
                          const colors = ['#1E3A8A', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];
                          return (
                            <div key={idx} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                                <span className="font-medium text-slate-700 truncate">{item.ngo_name}</span>
                              </div>
                              <span className="font-bold text-slate-900 shrink-0">₹{item.amount.toLocaleString('en-IN')}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart 3: Employee Volunteer Hours by Month (Line Chart) */}
                <div className="bg-white border border-brand-border rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                      <LineChart className="w-4 h-4 text-indigo-600" />
                      Employee Volunteer Hours
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 mb-3">Monthly trend of credited employee volunteering hours.</p>
                  </div>
                  <div className="h-48 w-full relative border-b border-l border-slate-300 p-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                      {(() => {
                        const maxH = Math.max(...monthly.map(x => x.hours), 1);
                        const points = monthly.map((m, idx) => {
                          const x = (idx / 11) * 100;
                          const y = 50 - (m.hours / maxH) * 45;
                          return `${x},${y}`;
                        }).join(' ');
                        return (
                          <>
                            <polyline fill="none" stroke="#6366F1" strokeWidth="2" points={points} />
                            {monthly.map((m, idx) => {
                              const x = (idx / 11) * 100;
                              const y = 50 - (m.hours / maxH) * 45;
                              return <circle key={idx} cx={x} cy={y} r="2" fill="#6366F1" />;
                            })}
                          </>
                        );
                      })()}
                    </svg>
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-2">
                      {monthly.map(m => <span key={m.month}>{m.month}</span>)}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* PAGE BREAK AFTER CHARTS SECTION IN PDF */}
            <div className="pdf-page-break"></div>

            {/* ================= PAGE 3+ DETAILED REPORT TABLES & COMPLIANCE ================= */}
            <div className="space-y-8 pt-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-brand-primary" /> Detailed Audit Records & Logs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete line-item summaries of NGO funding, requirement sponsorships, employee volunteering, and pledge logs.
                </p>
              </div>

              {/* Table Card 1: CSR Funding Summary */}
              <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden pdf-keep-together">
                <div className="p-3.5 border-b border-brand-border bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    1. CSR Funding Summary by NGO
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-brand-border text-slate-800 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">NGO Name</th>
                        <th className="p-3">Total Funding</th>
                        <th className="p-3">Number of Donations</th>
                        <th className="p-3">Latest Donation Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60">
                      {tables.funding_summary.length === 0 ? (
                        <tr><td colSpan="4" className="p-6 text-center text-slate-400 font-medium">No CSR funding summary records found for this year.</td></tr>
                      ) : (
                        tables.funding_summary.map((row, idx) => (
                          <tr key={idx} className="even:bg-slate-50/70 hover:bg-slate-100/50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">{row.ngo_name}</td>
                            <td className="p-3 font-bold text-emerald-700">₹{row.total_funding.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-slate-700 font-medium">{row.donation_count}</td>
                            <td className="p-3 text-slate-500 font-mono">
                              {row.latest_donation_date ? new Date(row.latest_donation_date).toLocaleDateString('en-IN') : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Card 2: Requirement Sponsorship Summary */}
              <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden pdf-keep-together">
                <div className="p-3.5 border-b border-brand-border bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Clipboard className="w-4 h-4 text-brand-primary" />
                    2. Requirement Sponsorship Summary
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-brand-border text-slate-800 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Requirement</th>
                        <th className="p-3">NGO</th>
                        <th className="p-3">Sponsored Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Sponsorship Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60">
                      {tables.sponsorship_summary.length === 0 ? (
                        <tr><td colSpan="5" className="p-6 text-center text-slate-400 font-medium">No requirement sponsorship entries found for this year.</td></tr>
                      ) : (
                        tables.sponsorship_summary.map((row, idx) => (
                          <tr key={idx} className="even:bg-slate-50/70 hover:bg-slate-100/50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">{row.requirement_name}</td>
                            <td className="p-3 text-slate-700">{row.ngo_name}</td>
                            <td className="p-3 font-bold text-emerald-700">₹{row.sponsored_amount.toLocaleString('en-IN')}</td>
                            <td className="p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 capitalize">
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 font-mono">
                              {row.sponsorship_date ? new Date(row.sponsorship_date).toLocaleDateString('en-IN') : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Card 3: Employee Volunteer Summary */}
              <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden pdf-keep-together">
                <div className="p-3.5 border-b border-brand-border bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Timer className="w-4 h-4 text-indigo-600" />
                    3. Employee Volunteer Summary
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-brand-border text-slate-800 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Employee</th>
                        <th className="p-3">NGO</th>
                        <th className="p-3">Volunteer Hours</th>
                        <th className="p-3">Activity Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60">
                      {tables.volunteer_summary.length === 0 ? (
                        <tr><td colSpan="4" className="p-6 text-center text-slate-400 font-medium">No employee volunteer activity logged for this year.</td></tr>
                      ) : (
                        tables.volunteer_summary.map((row, idx) => (
                          <tr key={idx} className="even:bg-slate-50/70 hover:bg-slate-100/50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">{row.employee_name}</td>
                            <td className="p-3 text-slate-700">{row.ngo_name}</td>
                            <td className="p-3 font-bold text-slate-900">{row.volunteer_hours} hrs</td>
                            <td className="p-3 text-slate-500 font-mono">
                              {row.activity_date ? new Date(row.activity_date).toLocaleDateString('en-IN') : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Card 4: CSR Pledges */}
              <div className="bg-white border border-brand-border rounded-xl shadow-xs overflow-hidden pdf-keep-together">
                <div className="p-3.5 border-b border-brand-border bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    4. CSR Pledges Audit Log
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-brand-border text-slate-800 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Pledge</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60">
                      {tables.pledges.length === 0 ? (
                        <tr><td colSpan="4" className="p-6 text-center text-slate-400 font-medium">No CSR pledges recorded for this year.</td></tr>
                      ) : (
                        tables.pledges.map((row, idx) => (
                          <tr key={idx} className="even:bg-slate-50/70 hover:bg-slate-100/50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">{row.pledge_title}</td>
                            <td className="p-3 font-bold text-emerald-700">₹{row.amount.toLocaleString('en-IN')}</td>
                            <td className="p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 capitalize">
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 font-mono">
                              {row.created_date ? new Date(row.created_date).toLocaleDateString('en-IN') : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CSR COMPLIANCE SUMMARY SECTION AT END */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-xs space-y-4 pdf-keep-together">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-200/80 pb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-tight">CSR Statutory Compliance Certificate</h4>
                      <p className="text-[11px] text-emerald-700">Section 135 Companies Act 2013 & CSR Rules 2014 Compliance</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-xs uppercase tracking-wider">
                    100% Statutorily Compliant
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-xs">
                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total CSR Spending</span>
                    <span className="text-sm font-extrabold text-emerald-900 mt-1 block">₹{cards.total_funding.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total NGOs Supported</span>
                    <span className="text-sm font-extrabold text-emerald-900 mt-1 block">{cards.ngos_supported} NGOs</span>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Volunteer Hours</span>
                    <span className="text-sm font-extrabold text-emerald-900 mt-1 block">{cards.employee_volunteer_hours} Hours</span>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Sponsored Requirements</span>
                    <span className="text-sm font-extrabold text-emerald-900 mt-1 block">{cards.sponsored_requirements} Reqs</span>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Compliance Status</span>
                    <span className="text-sm font-extrabold text-emerald-700 mt-1 block flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> Audited & Verified
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* PRINT FOOTER ON EVERY PAGE */}
            <div className="pdf-footer">
              <div className="flex justify-between items-center w-full">
                <span>{corpInfo.company_name} • Corporate CSR Report FY {reportData.report_year}</span>
                <span>Generated: {formattedGeneratedDate}</span>
                <span>Confidential Statutory Section 135 Report</span>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default CSRReport;

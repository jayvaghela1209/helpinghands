import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Award, Download, ArrowLeft, Calendar, Clock, MapPin, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Certificates = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCertificates = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const res = await fetch(`${apiUrl}/api/certificates/my-certificates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to load certificates');
      }
      const data = await res.json();
      setCertificates(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleDownload = async (reqId, certNo) => {
    setDownloadingId(reqId);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const res = await fetch(`${apiUrl}/api/requirements/${reqId}/certificate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Download failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HelpingHands_Certificate_${certNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary">

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Back to Dashboard Link */}
        <div className="mb-4">
          <Link to="/volunteer-dashboard" className="inline-flex items-center text-xs font-semibold text-brand-primary hover:underline">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-dark flex items-center">
            <Award className="w-6 h-6 mr-2 text-brand-primary" /> My Certificates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Official verified certificates earned from completed social assignments.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-brand-error rounded-md text-brand-error text-xs">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
            <p className="text-xs text-gray-500 mt-4">Loading verified certificates...</p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="bg-white border border-brand-border rounded-md p-16 text-center">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-brand-dark">No Certificates Yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Certificates are automatically awarded upon completion of verified check-in and check-out for volunteering events.
            </p>
            <Link
              to="/browse-opportunities"
              className="mt-4 inline-block px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-md hover:bg-opacity-95 transition-all"
            >
              Browse Opportunities
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white border border-brand-border rounded-md p-6 flex flex-col justify-between hover:border-gray-400 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-sm">
                      <CheckCircle className="w-3 h-3 mr-1" /> Verified Certificate
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {cert.certificate_number}
                    </span>
                  </div>

                  <h3 className="font-bold text-brand-dark text-base line-clamp-1 mb-2">
                    {cert.requirement_title}
                  </h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Organized by: <strong>{cert.ngo_name}</strong>
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-brand-border text-xs text-gray-600 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>Issue Date: <strong>{cert.issue_date}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>Verified Hours: <strong>{cert.worked_hours} hrs</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-1">{cert.location_name || 'Event Location'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(cert.requirement_id, cert.certificate_number)}
                  disabled={downloadingId === cert.requirement_id}
                  className="w-full py-2 bg-brand-primary hover:bg-opacity-95 text-white font-bold text-xs rounded-md transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>{downloadingId === cert.requirement_id ? 'Downloading...' : 'Download Certificate'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Certificates;

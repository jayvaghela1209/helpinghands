import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, LogOut, ShieldCheck, ShieldAlert, ShieldX,
  Building, Briefcase, Users, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Eye, AlertCircle, RefreshCw,
  MapPin, Mail, Phone, Hash, FileText, Clock
} from 'lucide-react';
import logo from '../assets/image.png';

const PO_SESSION_KEY = 'po_session';
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8001') + '/api/platform-operator';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const getToken = () => sessionStorage.getItem(PO_SESSION_KEY) || '';

const statusBadge = (status) => {
  const base = 'inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border';
  switch (status) {
    case 'approved':
      return `${base} bg-green-50 text-green-700 border-green-200`;
    case 'rejected':
      return `${base} bg-red-50 text-brand-error border-red-200`;
    case 'flagged':
      return `${base} bg-amber-50 text-amber-700 border-amber-300`;
    case 'suspended':
      return `${base} bg-gray-100 text-gray-600 border-gray-300`;
    case 'pending':
    default:
      return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  }
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─────────────────────────────────────────────
// Reusable section header
// ─────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, count, color = 'text-brand-primary' }) => (
  <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between bg-brand-secondary">
    <div className="flex items-center space-x-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-xs font-bold text-brand-dark uppercase tracking-wider">{title}</span>
    </div>
    {count !== undefined && (
      <span className="text-xs font-mono text-gray-500">{count} {count === 1 ? 'entry' : 'entries'}</span>
    )}
  </div>
);

// ─────────────────────────────────────────────
// Action modal for Flag / Suspend (reuses the same reason pattern as Reject)
// ─────────────────────────────────────────────

const ActionModal = ({ entity, action, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const isDestructive = action === 'suspend';
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-md border border-brand-border w-full max-w-md shadow-xl">
        <div className="px-5 py-4 border-b border-brand-border flex items-center space-x-2">
          {isDestructive ? (
            <ShieldX className="w-4 h-4 text-brand-error" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          )}
          <span className="text-sm font-bold text-brand-dark capitalize">{action} Entity</span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            You are <strong>{action}ing</strong> <strong>{entity.display_name}</strong>.
            Provide an optional reason:
          </p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder={`Reason for ${action}…`}
            className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary outline-none resize-none"
          />
        </div>
        <div className="px-5 py-3 border-t border-brand-border flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-1.5 text-xs font-semibold border border-brand-border rounded-md text-brand-dark hover:bg-gray-50 transition-all cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className={`px-4 py-1.5 text-xs font-bold text-white rounded-md transition-all cursor-pointer ${
              isDestructive ? 'bg-brand-error border border-brand-error hover:bg-opacity-90' : 'bg-amber-600 border border-amber-600 hover:bg-amber-700'
            }`}
          >
            Confirm {action.charAt(0).toUpperCase() + action.slice(1)}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Detail drawer for a single entity
// ─────────────────────────────────────────────

const DetailRow = ({ label, value }) => (
  <div>
    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">{label}</span>
    <span className="text-xs text-brand-dark font-medium">{value || '—'}</span>
  </div>
);

const EntityDetailPanel = ({ entity, entityType, onApprove, onReject, onFlag, onSuspend, actionLoading }) => (
  <div className="mt-3 bg-brand-secondary border border-brand-border rounded-md p-4 space-y-4 text-xs">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <DetailRow label="Display Name" value={entity.display_name} />
      <DetailRow label="Contact Person" value={entity.contact_name} />
      <DetailRow label="Email" value={entity.email} />
      <DetailRow label="Phone" value={entity.phone} />
      <DetailRow label="City" value={entity.city} />
      <DetailRow label="Registered On" value={formatDate(entity.created_at)} />
      <DetailRow label="Registration Number" value={entity.registration_number} />
      {entityType === 'ngo' && (
        <>
          <DetailRow label="Darpan ID" value={entity.darpan_id} />
          <DetailRow label="PAN Number" value={entity.pan_number} />
        </>
      )}
      {entityType === 'corporate' && (
        <DetailRow label="CIN Number" value={entity.cin_number} />
      )}
      {entity.focus_areas && entity.focus_areas.length > 0 && (
        <div className="col-span-2 sm:col-span-3">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Focus Areas</span>
          <div className="flex flex-wrap gap-1.5">
            {entity.focus_areas.map((fa, i) => (
              <span key={i} className="text-[10px] font-bold text-brand-primary bg-white border border-brand-border px-2 py-0.5 rounded-sm uppercase tracking-wider">
                {fa}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Actions depend on current verification status */}
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-border">
      {/* Pending: Approve + Reject */}
      {entity.verification_status === 'pending' && (
        <>
          <button onClick={() => onApprove(entity.id, entityType)} disabled={actionLoading}
            className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold bg-green-600 text-white border border-green-600 rounded-md hover:bg-green-700 transition-all disabled:opacity-50 cursor-pointer">
            <CheckCircle2 className="w-3.5 h-3.5" /><span>Approve</span>
          </button>
          <button onClick={() => onReject(entity)} disabled={actionLoading}
            className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold bg-white text-brand-error border border-brand-error rounded-md hover:bg-red-50 transition-all disabled:opacity-50 cursor-pointer">
            <XCircle className="w-3.5 h-3.5" /><span>Reject</span>
          </button>
        </>
      )}

      {/* Approved: Flag + Suspend */}
      {entity.verification_status === 'approved' && (
        <>
          <button onClick={() => onFlag(entity)} disabled={actionLoading}
            className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-400 rounded-md hover:bg-amber-100 transition-all disabled:opacity-50 cursor-pointer">
            <ShieldAlert className="w-3.5 h-3.5" /><span>Flag</span>
          </button>
          <button onClick={() => onSuspend(entity)} disabled={actionLoading}
            className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold bg-white text-brand-error border border-brand-error rounded-md hover:bg-red-50 transition-all disabled:opacity-50 cursor-pointer">
            <ShieldX className="w-3.5 h-3.5" /><span>Suspend</span>
          </button>
        </>
      )}

      {/* Flagged / Suspended: allow re-approval */}
      {(entity.verification_status === 'flagged' || entity.verification_status === 'suspended') && (
        <button onClick={() => onApprove(entity.id, entityType)} disabled={actionLoading}
          className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold bg-green-600 text-white border border-green-600 rounded-md hover:bg-green-700 transition-all disabled:opacity-50 cursor-pointer">
          <CheckCircle2 className="w-3.5 h-3.5" /><span>Re-Approve</span>
        </button>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Entity row (collapsible)
// ─────────────────────────────────────────────

const EntityRow = ({ entity, entityType, onApprove, onReject, onFlag, onSuspend, actionLoading }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-brand-border last:border-0">
      <div className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-secondary border border-brand-border flex items-center justify-center">
            {entityType === 'ngo' ? (
              <Building className="w-3.5 h-3.5 text-brand-primary" />
            ) : (
              <Briefcase className="w-3.5 h-3.5 text-brand-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-dark truncate">{entity.display_name}</p>
            <p className="text-xs text-gray-500 truncate">{entity.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <span className={statusBadge(entity.verification_status)}>{entity.verification_status}</span>
          <span className="text-[10px] text-gray-400 font-mono hidden sm:block">{formatDate(entity.created_at)}</span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 rounded hover:bg-brand-secondary transition-colors cursor-pointer"
            aria-label={expanded ? 'Collapse' : 'View details'}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <Eye className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4">
          <EntityDetailPanel
            entity={entity}
            entityType={entityType}
            onApprove={onApprove}
            onReject={onReject}
            onFlag={onFlag}
            onSuspend={onSuspend}
            actionLoading={actionLoading}
          />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main dashboard component
// ─────────────────────────────────────────────

const PlatformOperatorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null); // entity to reject
  const [actionModalTarget, setActionModalTarget] = useState(null); // { entity, action } for flag/suspend

  // Tab state: 'pending' | 'approved' | 'rejected' | 'volunteers'
  const [activeTab, setActiveTab] = useState('pending');

  // ── Auth guard ──
  useEffect(() => {
    if (!getToken()) {
      navigate('/admin/admin', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem(PO_SESSION_KEY);
    navigate('/admin/admin', { replace: true });
  };

  // ── Fetch all verification data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/verification-requests`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem(PO_SESSION_KEY);
        navigate('/admin/admin', { replace: true });
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to load data.');
      }
      setData(await res.json());
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Approve ──
  const handleApprove = async (profileId, entityType) => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await fetch(
        `${API_BASE}/verification-requests/${profileId}/approve?entity_type=${entityType}`,
        { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Approval failed.');
      }
      setActionMsg('Approved successfully.');
      await fetchData();
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject (opens modal) ──
  const openRejectModal = (entity) => setRejectTarget(entity);
  const cancelReject = () => setRejectTarget(null);

  const confirmReject = async (reason) => {
    if (!rejectTarget) return;
    setRejectTarget(null);
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await fetch(
        `${API_BASE}/verification-requests/${rejectTarget.id}/reject?entity_type=${rejectTarget.entity_type}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Rejection failed.');
      }
      setActionMsg('Rejected successfully.');
      await fetchData();
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Flag / Suspend (opens shared modal) ──
  const openActionModal = (entity, action) => setActionModalTarget({ entity, action });
  const cancelActionModal = () => setActionModalTarget(null);

  const confirmAction = async (reason) => {
    if (!actionModalTarget) return;
    const { entity, action } = actionModalTarget;
    setActionModalTarget(null);
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await fetch(
        `${API_BASE}/verification-requests/${entity.id}/${action}?entity_type=${entity.entity_type}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `${action} failed.`);
      }
      setActionMsg(`${action.charAt(0).toUpperCase() + action.slice(1)}d successfully.`);
      await fetchData();
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived lists ──
  const allNgos = data?.ngos || [];
  const allCorps = data?.corporates || [];
  const volunteers = data?.volunteers || [];

  const pendingNgos = allNgos.filter(n => n.verification_status === 'pending');
  const approvedNgos = allNgos.filter(n => n.verification_status === 'approved');
  const rejectedNgos = allNgos.filter(n => n.verification_status === 'rejected');

  const pendingCorps = allCorps.filter(c => c.verification_status === 'pending');
  const approvedCorps = allCorps.filter(c => c.verification_status === 'approved');
  const rejectedCorps = allCorps.filter(c => c.verification_status === 'rejected');

  const totalPending = pendingNgos.length + pendingCorps.length;

  // ── Tab navigation ──
  const tabs = [
    {
      id: 'pending',
      label: 'Pending',
      icon: ShieldAlert,
      color: 'text-amber-600',
      count: totalPending,
    },
    {
      id: 'approved',
      label: 'Approved',
      icon: ShieldCheck,
      color: 'text-green-600',
      count: approvedNgos.length + approvedCorps.length,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      icon: ShieldX,
      color: 'text-brand-error',
      count: rejectedNgos.length + rejectedCorps.length,
    },
    {
      id: 'volunteers',
      label: 'Volunteers',
      icon: Users,
      color: 'text-brand-primary',
      count: volunteers.length,
    },
  ];

  return (
    <div className="min-h-screen bg-brand-secondary">

      {/* ── Operator top bar ── */}
      <header className="bg-white border-b border-brand-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="HelpingHands" className="h-8 w-auto object-contain" />
            <div className="hidden sm:block h-5 w-px bg-brand-border" />
            <div className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-brand-primary" />
              <span className="text-xs font-bold text-brand-dark uppercase tracking-wider">
                Platform Operator Console
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-md border border-brand-border hover:bg-brand-secondary transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 text-xs font-medium bg-brand-secondary border border-brand-border text-brand-dark hover:bg-gray-100 hover:text-brand-error transition-all px-3 py-1.5 rounded-md cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Page title + stats ── */}
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Verification Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review pending NGO and Corporate registration requests, approve or reject them, and monitor all registered users.
          </p>
        </div>

        {/* ── Summary cards ── */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-brand-border rounded-md p-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{totalPending}</p>
              <p className="text-[10px] text-gray-400 mt-1">Awaiting review</p>
            </div>
            <div className="bg-white border border-brand-border rounded-md p-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{approvedNgos.length + approvedCorps.length}</p>
              <p className="text-[10px] text-gray-400 mt-1">NGOs + Corporates</p>
            </div>
            <div className="bg-white border border-brand-border rounded-md p-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Rejected</p>
              <p className="text-2xl font-bold text-brand-error mt-1">{rejectedNgos.length + rejectedCorps.length}</p>
              <p className="text-[10px] text-gray-400 mt-1">NGOs + Corporates</p>
            </div>
            <div className="bg-white border border-brand-border rounded-md p-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Volunteers</p>
              <p className="text-2xl font-bold text-brand-dark mt-1">{volunteers.length}</p>
              <p className="text-[10px] text-gray-400 mt-1">Registered</p>
            </div>
          </div>
        )}

        {/* ── Action feedback banner ── */}
        {actionMsg && (
          <div className={`p-3 rounded-md text-xs font-medium flex items-center space-x-2 border ${
            actionMsg.startsWith('Error')
              ? 'bg-red-50 border-red-200 text-brand-error'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            {actionMsg.startsWith('Error') ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg('')} className="ml-auto text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
          </div>
        )}

        {/* ── Error ── */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-brand-error text-brand-error rounded-md text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex space-x-1 bg-white border border-brand-border rounded-md p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-brand-primary text-white'
                  : 'text-gray-500 hover:bg-brand-secondary'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-brand-secondary text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto" />
            <p className="text-xs text-gray-500 mt-4">Loading verification data…</p>
          </div>
        )}

        {/* ── PENDING TAB ── */}
        {!loading && activeTab === 'pending' && (
          <div className="space-y-6">
            {/* Pending NGOs */}
            <div className="bg-white border border-brand-border rounded-md overflow-hidden">
              <SectionHeader
                icon={Building}
                title="Pending NGO Registrations"
                count={pendingNgos.length}
                color="text-brand-primary"
              />
              {pendingNgos.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">No pending NGO registrations.</div>
              ) : (
                pendingNgos.map(e => (
                  <EntityRow
                    key={e.id}
                    entity={e}
                    entityType="ngo"
                    onApprove={handleApprove}
                    onReject={openRejectModal}
                    onFlag={(ent) => openActionModal(ent, 'flag')}
                    onSuspend={(ent) => openActionModal(ent, 'suspend')}
                    actionLoading={actionLoading}
                  />
                ))
              )}
            </div>

            {/* Pending Corporates */}
            <div className="bg-white border border-brand-border rounded-md overflow-hidden">
              <SectionHeader
                icon={Briefcase}
                title="Pending Corporate Registrations"
                count={pendingCorps.length}
                color="text-brand-primary"
              />
              {pendingCorps.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">No pending corporate registrations.</div>
              ) : (
                pendingCorps.map(e => (
                  <EntityRow
                    key={e.id}
                    entity={e}
                    entityType="corporate"
                    onApprove={handleApprove}
                    onReject={openRejectModal}
                    onFlag={(ent) => openActionModal(ent, 'flag')}
                    onSuspend={(ent) => openActionModal(ent, 'suspend')}
                    actionLoading={actionLoading}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── APPROVED TAB ── */}
        {!loading && activeTab === 'approved' && (
          <div className="space-y-6">
            <div className="bg-white border border-brand-border rounded-md overflow-hidden">
              <SectionHeader icon={ShieldCheck} title="Approved NGOs" count={approvedNgos.length} color="text-green-600" />
              {approvedNgos.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">No approved NGOs yet.</div>
              ) : (
                approvedNgos.map(e => (
                  <EntityRow key={e.id} entity={e} entityType="ngo" onApprove={handleApprove} onReject={openRejectModal} onFlag={(ent) => openActionModal(ent, 'flag')} onSuspend={(ent) => openActionModal(ent, 'suspend')} actionLoading={actionLoading} />
                ))
              )}
            </div>
            <div className="bg-white border border-brand-border rounded-md overflow-hidden">
              <SectionHeader icon={ShieldCheck} title="Approved Corporates" count={approvedCorps.length} color="text-green-600" />
              {approvedCorps.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">No approved corporates yet.</div>
              ) : (
                approvedCorps.map(e => (
                  <EntityRow key={e.id} entity={e} entityType="corporate" onApprove={handleApprove} onReject={openRejectModal} onFlag={(ent) => openActionModal(ent, 'flag')} onSuspend={(ent) => openActionModal(ent, 'suspend')} actionLoading={actionLoading} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── REJECTED TAB ── */}
        {!loading && activeTab === 'rejected' && (
          <div className="space-y-6">
            <div className="bg-white border border-brand-border rounded-md overflow-hidden">
              <SectionHeader icon={ShieldX} title="Rejected NGOs" count={rejectedNgos.length} color="text-brand-error" />
              {rejectedNgos.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">No rejected NGOs.</div>
              ) : (
                rejectedNgos.map(e => (
                  <EntityRow key={e.id} entity={e} entityType="ngo" onApprove={handleApprove} onReject={openRejectModal} onFlag={(ent) => openActionModal(ent, 'flag')} onSuspend={(ent) => openActionModal(ent, 'suspend')} actionLoading={actionLoading} />
                ))
              )}
            </div>
            <div className="bg-white border border-brand-border rounded-md overflow-hidden">
              <SectionHeader icon={ShieldX} title="Rejected Corporates" count={rejectedCorps.length} color="text-brand-error" />
              {rejectedCorps.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">No rejected corporates.</div>
              ) : (
                rejectedCorps.map(e => (
                  <EntityRow key={e.id} entity={e} entityType="corporate" onApprove={handleApprove} onReject={openRejectModal} onFlag={(ent) => openActionModal(ent, 'flag')} onSuspend={(ent) => openActionModal(ent, 'suspend')} actionLoading={actionLoading} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── VOLUNTEERS TAB ── */}
        {!loading && activeTab === 'volunteers' && (
          <div className="bg-white border border-brand-border rounded-md overflow-hidden">
            <SectionHeader icon={Users} title="Registered Volunteers" count={volunteers.length} color="text-brand-primary" />
            {volunteers.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">No registered volunteers yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-brand-secondary border-b border-brand-border text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">City</th>
                      <th className="px-5 py-3">Total Hours</th>
                      <th className="px-5 py-3">Credits</th>
                      <th className="px-5 py-3">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {volunteers.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-brand-dark">{v.display_name}</td>
                        <td className="px-5 py-3 text-gray-500">{v.email}</td>
                        <td className="px-5 py-3 text-gray-500">{v.city || '—'}</td>
                        <td className="px-5 py-3 font-mono">{v.total_hours ?? 0} hrs</td>
                        <td className="px-5 py-3 font-mono">{v.credit_points ?? 0}</td>
                        <td className="px-5 py-3 text-gray-400 font-mono">{formatDate(v.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── Reject modal ── */}
      {rejectTarget && (
        <ActionModal
          entity={rejectTarget}
          action="reject"
          onConfirm={confirmReject}
          onCancel={cancelReject}
        />
      )}

      {/* ── Flag / Suspend modal ── */}
      {actionModalTarget && (
        <ActionModal
          entity={actionModalTarget.entity}
          action={actionModalTarget.action}
          onConfirm={confirmAction}
          onCancel={cancelActionModal}
        />
      )}
    </div>
  );
};

export default PlatformOperatorDashboard;

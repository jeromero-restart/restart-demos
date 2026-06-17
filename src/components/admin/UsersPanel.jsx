import { useState, useEffect } from 'react';
import { X, Plus, Trash2, RefreshCw, Shield, User } from 'lucide-react';
import { usersApi } from '../../auth/AuthContext';

const ROLES = ['admin', 'usuario'];

const RoleBadge = ({ role }) => (
  <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 border ${
    role === 'admin'
      ? 'bg-[#EDEFFE] text-[#1e22aa] border-[#EDEFFE]'
      : 'bg-transparent text-[#EDEFFE]/70 border-[#EDEFFE]/30'
  }`}>
    {role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
    {role}
  </span>
);

export default function UsersPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('usuario');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    usersApi.list()
      .then(setUsers)
      .catch(() => setError('No se pudo conectar con la API de usuarios.'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await usersApi.add(newEmail.trim(), newRole);
      setNewEmail('');
      setNewRole('usuario');
      fetchUsers();
    } catch (err) {
      setAddError(err?.error || 'Error al agregar usuario');
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (email, role) => {
    try {
      await usersApi.updateRole(email, role);
      setUsers(prev => prev.map(u => u.email === email ? { ...u, role } : u));
    } catch { /* ignore */ }
  };

  const handleRemove = async (email) => {
    if (!confirm(`¿Eliminar acceso de ${email}?`)) return;
    try {
      await usersApi.remove(email);
      setUsers(prev => prev.filter(u => u.email !== email));
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1F1F]/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1e22aa] border-2 border-[#EDEFFE] shadow-[12px_12px_0_#1F1F1F] max-h-[90vh] flex flex-col font-sans">

        {/* Header */}
        <div className="bg-[#1F1F1F] border-b-2 border-[#EDEFFE] p-3 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2 items-center">
            <div className="w-3 h-3 bg-[#EDEFFE] rounded-full animate-pulse"></div>
            <span className="font-display text-lg text-[#EDEFFE] tracking-widest">///_GESTIÓN_DE_ACCESOS</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchUsers} className="text-[#EDEFFE]/50 hover:text-[#EDEFFE] transition-colors p-1">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-[#EDEFFE]/50 hover:text-[#EDEFFE] transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-5">

          {/* Formulario agregar */}
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-[#EDEFFE]/70">&gt; Autorizar nuevo usuario</h3>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="email@restart-ai.com"
                className="flex-1 bg-[#1F1F1F] border-2 border-[#EDEFFE]/40 focus:border-[#EDEFFE] text-[#EDEFFE] px-3 py-2 text-sm placeholder-[#EDEFFE]/30 focus:outline-none transition-colors"
              />
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                className="bg-[#1F1F1F] border-2 border-[#EDEFFE]/40 focus:border-[#EDEFFE] text-[#EDEFFE] px-3 py-2 text-sm focus:outline-none transition-colors uppercase font-bold"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                type="submit"
                disabled={adding || !newEmail.trim()}
                className="bg-[#EDEFFE] text-[#1e22aa] border-2 border-[#EDEFFE] px-4 py-2 font-bold text-sm uppercase hover:bg-[#1F1F1F] hover:text-[#EDEFFE] transition-colors shadow-[3px_3px_0_#1F1F1F] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {addError && <p className="text-xs text-[#EDEFFE] bg-[#1F1F1F] border border-[#EDEFFE]/30 px-3 py-2">{addError}</p>}
          </form>

          {/* Lista */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-[#EDEFFE]/70">&gt; Usuarios autorizados</h3>
              {!loading && <span className="font-display text-base text-[#EDEFFE]/40">[{users.length}]</span>}
            </div>

            {loading && (
              <p className="font-display text-lg text-[#EDEFFE]/50 uppercase animate-pulse">Cargando...</p>
            )}

            {error && (
              <div className="border border-[#EDEFFE]/30 bg-[#1F1F1F] p-3">
                <p className="text-xs text-[#EDEFFE]">{error}</p>
              </div>
            )}

            {!loading && !error && users.length === 0 && (
              <div className="border-2 border-dashed border-[#EDEFFE]/20 p-6 text-center">
                <p className="text-xs text-[#EDEFFE]/40 uppercase">Sin usuarios autorizados</p>
              </div>
            )}

            {!loading && users.length > 0 && (
              <div className="flex flex-col divide-y divide-[#EDEFFE]/10">
                {users.map(u => (
                  <div key={u.email} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm font-bold text-[#EDEFFE] truncate">{u.email}</p>
                    </div>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.email, e.target.value)}
                      className="bg-transparent border border-[#EDEFFE]/30 text-[#EDEFFE] text-xs uppercase font-bold px-2 py-1 focus:outline-none focus:border-[#EDEFFE] transition-colors"
                    >
                      {ROLES.map(r => <option key={r} value={r} className="bg-[#1e22aa]">{r}</option>)}
                    </select>
                    <RoleBadge role={u.role} />
                    <button
                      onClick={() => handleRemove(u.email)}
                      className="text-[#EDEFFE]/30 hover:text-[#EDEFFE] transition-colors p-1 flex-shrink-0"
                      title="Eliminar acceso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

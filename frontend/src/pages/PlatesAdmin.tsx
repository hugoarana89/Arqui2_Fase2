import { useEffect, useState } from 'react';
import {
  Car,
  Plus,
  Trash2,
  RefreshCw,
  Pencil,
  X,
  Save,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { platesService } from '../services/plant.service';
import type { AuthorizedPlate } from '../types/plant.types';

type PlateForm = {
  plate: string;
  owner: string;
  description: string;
  active: boolean;
};

const emptyForm: PlateForm = {
  plate: '',
  owner: '',
  description: '',
  active: true,
};

const normalizePlatesResponse = (response: unknown): AuthorizedPlate[] => {
  if (Array.isArray(response)) return response as AuthorizedPlate[];

  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray((response as { data?: unknown }).data)
  ) {
    return (response as { data: AuthorizedPlate[] }).data;
  }

  return [];
};

const PlatesAdmin = () => {
  const [plates, setPlates] = useState<AuthorizedPlate[]>([]);
  const [form, setForm] = useState<PlateForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPlates = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await platesService.getAuthorized();
      setPlates(normalizePlatesResponse(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar placas autorizadas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlates();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage('');
    setError('');
  };

  const normalizePlate = (plate: string) =>
    plate.trim().toUpperCase().replace(/\s+/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const normalizedPlate = normalizePlate(form.plate);

    if (!normalizedPlate) {
      setError('La placa es obligatoria.');
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await platesService.updateAuthorized(editingId, {
          plate: normalizedPlate,
          owner: form.owner.trim(),
          description: form.description.trim(),
          active: form.active,
        });

        setMessage('Placa actualizada correctamente.');
      } else {
        await platesService.createAuthorized({
          plate: normalizedPlate,
          owner: form.owner.trim(),
          description: form.description.trim(),
        });

        setMessage('Placa registrada correctamente.');
      }

      resetForm();
      await loadPlates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la placa.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plate: AuthorizedPlate) => {
    setEditingId(plate._id ?? null);
    setForm({
      plate: plate.plate,
      owner: plate.owner ?? '',
      description: plate.description ?? '',
      active: plate.active,
    });
    setMessage('');
    setError('');
  };

  const handleDelete = async (plate: AuthorizedPlate) => {
    if (!plate._id) {
      setError('No se pudo eliminar: la placa no tiene identificador.');
      return;
    }

    const confirmed = window.confirm(`¿Eliminar la placa ${plate.plate}?`);

    if (!confirmed) return;

    setMessage('');
    setError('');

    try {
      await platesService.deleteAuthorized(plate._id);
      setMessage('Placa eliminada correctamente.');
      await loadPlates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la placa.');
    }
  };

  const handleToggleActive = async (plate: AuthorizedPlate) => {
    if (!plate._id) {
      setError('No se pudo actualizar: la placa no tiene identificador.');
      return;
    }

    setMessage('');
    setError('');

    try {
      await platesService.updateAuthorized(plate._id, {
        active: !plate.active,
      });

      await loadPlates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar el estado de la placa.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Car className="text-blue-400" />
            Administración de placas autorizadas
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Registra, edita, activa, desactiva y elimina las placas permitidas para el acceso vehicular.
          </p>
        </header>

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-white font-semibold">
              {editingId ? 'Editar placa autorizada' : 'Registrar nueva placa'}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-white text-sm inline-flex items-center gap-1"
              >
                <X size={14} />
                Cancelar edición
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Placa</label>
              <input
                value={form.plate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    plate: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="P123ABC"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Propietario</label>
              <input
                value={form.owner}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    owner: e.target.value,
                  }))
                }
                placeholder="Vehículo autorizado"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Descripción</label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Placa de prueba"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-2 flex items-center justify-center gap-2"
              >
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>

          {editingId && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    active: e.target.checked,
                  }))
                }
              />
              Placa activa
            </label>
          )}
        </form>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-white font-semibold">Placas registradas</h2>
              <p className="text-slate-500 text-xs">
                Total: {plates.length} placa{plates.length === 1 ? '' : 's'}
              </p>
            </div>

            <button
              onClick={loadPlates}
              className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Recargar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="text-left px-5 py-3">Placa</th>
                  <th className="text-left px-5 py-3">Propietario</th>
                  <th className="text-left px-5 py-3">Descripción</th>
                  <th className="text-left px-5 py-3">Estado</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {plates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      {loading ? 'Cargando placas...' : 'No hay placas registradas.'}
                    </td>
                  </tr>
                ) : (
                  plates.map((p) => (
                    <tr
                      key={p._id ?? p.plate}
                      className="border-t border-slate-800 text-slate-300"
                    >
                      <td className="px-5 py-3 font-bold text-white">{p.plate}</td>
                      <td className="px-5 py-3">{p.owner || '—'}</td>
                      <td className="px-5 py-3">{p.description || '—'}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            p.active
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-700 text-slate-400 border-slate-600'
                          }`}
                        >
                          {p.active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          {p.active ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleEdit(p)}
                            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                          >
                            <Pencil size={14} />
                            Editar
                          </button>

                          <button
                            onClick={() => handleDelete(p)}
                            className="text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PlatesAdmin;
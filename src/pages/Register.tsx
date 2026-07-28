import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/onboarding');
    } catch (err: any) {
      setError(traduceErrorFirebase(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bizly-cream flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="font-heading text-xl font-bold text-center">Crea tu cuenta</h1>
        <p className="text-center text-sm text-black/50 mt-1">Empieza a vender en minutos</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Tu nombre</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Correo</label>
            <input
              type="email"
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contraseña</label>
            <input
              type="password"
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-bizly-green text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Creando cuenta...' : 'Crear mi tienda gratis'}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-black/60">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-bizly-green font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

function traduceErrorFirebase(code: string) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya está registrado.';
    case 'auth/invalid-email':
      return 'Correo inválido.';
    case 'auth/weak-password':
      return 'La contraseña es muy débil.';
    default:
      return 'Ocurrió un error. Intenta de nuevo.';
  }
}

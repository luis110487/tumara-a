import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Home } from './pages/Home';
import { SearchResults } from './pages/SearchResults';
import { ProfessionalProfile } from './pages/ProfessionalProfile';
import { RegisterProfessional } from './pages/RegisterProfessional';
import { Account } from './pages/Account';
import { ResetPassword } from './pages/ResetPassword';
import { RequestService } from './pages/RequestService';
import { Chat } from './pages/Chat';
import { MyRequests } from './pages/MyRequests';
import { NotFound } from './pages/NotFound';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminProfessionals } from './pages/admin/AdminProfessionals';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminRequests } from './pages/admin/AdminRequests';
import { AdminUsers } from './pages/admin/AdminUsers';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/buscar" element={<SearchResults />} />
        <Route path="/profesional/:id" element={<ProfessionalProfile />} />
        <Route path="/registrar" element={<ProtectedRoute><RegisterProfessional /></ProtectedRoute>} />
        <Route path="/cuenta" element={<Account />} />
        <Route path="/restablecer-contrasena" element={<ResetPassword />} />
        <Route path="/solicitar/:id" element={<ProtectedRoute><RequestService /></ProtectedRoute>} />
        <Route path="/solicitud/:id/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/mis-solicitudes" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminProfessionals />} />
          <Route path="profesionales" element={<AdminProfessionals />} />
          <Route path="categorias" element={<AdminCategories />} />
          <Route path="solicitudes" element={<AdminRequests />} />
          <Route path="usuarios" element={<AdminUsers />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

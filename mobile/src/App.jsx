import { ServiceDetail } from './pages/ServiceDetail';
import { MyServices } from './pages/MyServices';
import { PushLifecycle } from './components/PushNotifications';
import { AndroidBack } from './components/AndroidBack';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Home } from './pages/Home';
import { Favorites } from './pages/Favorites';
import { Categories } from './pages/Categories';
import { SearchResults } from './pages/SearchResults';
import { ProfessionalProfile } from './pages/ProfessionalProfile';
import { RegisterProfessional } from './pages/RegisterProfessional';
import { MyProfessionalProfile } from './pages/MyProfessionalProfile';
import { MyProfile } from './pages/MyProfile';
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
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminTexts } from './pages/admin/AdminTexts';

export default function App() {
  return (
    <><AndroidBack /><PushLifecycle /><Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/servicio/:id" element={<ServiceDetail />} />
        <Route path="/mis-servicios" element={<ProtectedRoute><MyServices /></ProtectedRoute>} />
        <Route path="/favoritos" element={<Favorites />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/buscar" element={<SearchResults />} />
        <Route path="/profesional/:id" element={<ProfessionalProfile />} />
        <Route path="/registrar" element={<ProtectedRoute><RegisterProfessional /></ProtectedRoute>} />
        <Route path="/mi-perfil-profesional" element={<ProtectedRoute><MyProfessionalProfile /></ProtectedRoute>} />
        <Route path="/mi-perfil" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
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
          <Route path="banners" element={<AdminBanners />} />
          <Route path="textos" element={<AdminTexts />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes></>
  );
}

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LayoutApp from "../components/layout";
import Login from "../pages/Autenticación y seguridad/login/login";
import GestionarUsuario from "../pages/P3. Control de acceso y residencia/GestionarUsuario/gestionarUsuario";
import GestionarRol from "../pages/Autenticación y seguridad/GestionarRol/gestionarRol";
import GestionarVehiculo from "../pages/P3. Control de acceso y residencia/Gestionar Vehiculo/gestionarvehiculo";
import GestionarPersonal from "../pages/P5. Operaciones y administración/GestionarPersonal/gestionarpersonal";
import GestionarInquilino from "../pages/P2. Comunidad y vigilancia/Gestionar Inquilino/gestionarinquilino";
import GestionarPropietario from "../pages/P2. Comunidad y vigilancia/GestionarPropietario/gestionarpropietario";
import GestionarPermisos from "../pages/Autenticación y seguridad/GestionarPermiso/gestionarpermisos";
import GestionarResidente from "../pages/P2. Comunidad y vigilancia/Gestionar Residente/Familia/gestionarresidente";
import GestionarVisita from "../pages/P2. Comunidad y vigilancia/Gestionar Visita/gestionarvisita";
import RegistroDeVisita from "../pages/P2. Comunidad y vigilancia/Registro de Visita/registrodevisita";
import GestionarZona from "../pages/P2. Comunidad y vigilancia/GestionarZona/gestionarzona";
import GestionarCamara from "../pages/P2. Comunidad y vigilancia/Gestionar Camara/gestionarcamara";
import GestionarIncidentes from "../pages/P2. Comunidad y vigilancia/Gestionar Incidentes/gestionarincidentes";
import GestionarNotificaciones from "../pages/P2. Comunidad y vigilancia/Gestionar Notificaciones/gestionarnotificaciones";
import AsignarRol from "../pages/Autenticación y seguridad/Asignar Rol/asignarrol";
import AsignarPermisoPage from "../pages/Autenticación y seguridad/Asignar Permiso/asiganarpermiso";
import GestionarReconocimientoFacial from "../pages/Autenticación y seguridad/Reconocimiento Facial/reconocimientofacial";
import GestionarUnidadHabitacional from "../pages/P3. Control de acceso y residencia/Gestionar Unidad Habitacional/gestionarunidadhabitacional";
import GestionarTag from "../pages/P3. Control de acceso y residencia/Gestionar Tag/gestionartag";
import GestionarAreaComun from "../pages/P3. Control de acceso y residencia/Gestionar Area Comun/gestionarareacomun";
import GenerarFactura from "../pages/P4. Gestión financiera/Generar Factura/generarfactura";
import GestionarPago from "../pages/P4. Gestión financiera/Gestionar Pago/gestionarpago";
import GestionarHistorialPago from "../pages/P4. Gestión financiera/Gestionar Historial Pago/gestionarhistorialpago";
import GestionarMulta from "../pages/P4. Gestión financiera/Gestionar Multa/gestionarmulta";
import GestionarCostosReparaciones from "../pages/P4. Gestión financiera/Gestionar Costos de Reparaciones/gestionarcostosdereparaciones";
import GestionarAuditoriaGastos from "../pages/P4. Gestión financiera/Gestonar Auditoria de Gastos/gestionarauditoriagastos";
import GestionarServicio from "../pages/P5. Operaciones y administración/Gestionar Servicio/gestionarservicio";
import GestionarTareaMantenimiento from "../pages/P5. Operaciones y administración/Gestionar Tarea Mantenimiento/gestionartareamantenimiento";
import GestionarBitacora from "../pages/P5. Operaciones y administración/Gestionar Bitacora/gestionarbitacora";
import GestionarReportes from "../pages/P5. Operaciones y administración/Gestionar Reportes/gestionarreportes";

export default function AppRouters() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<LayoutApp />}>
          <Route path="login" element={<Login />} />
          <Route path="usuarios" element={<GestionarUsuario />} />
          <Route path="roles" element={<GestionarRol />} />
          <Route path="*" element={<Login />} />
          <Route path="vehiculos" element={<GestionarVehiculo />} />
          <Route path="personal" element={<GestionarPersonal />} />
          <Route path="inquilinos" element={<GestionarInquilino />} />
          <Route path="propietarios" element={<GestionarPropietario />} />
          <Route path="permisos" element={<GestionarPermisos />} />
          <Route path="residentes" element={<GestionarResidente />} />
          <Route path="visitas" element={<GestionarVisita />} />
          <Route path="registro-visitas" element={<RegistroDeVisita />} />
          <Route path="zonas" element={<GestionarZona />} />
          <Route path="camaras" element={<GestionarCamara />} />
          <Route path="incidentes" element={<GestionarIncidentes />} />
          <Route path="notificaciones" element={<GestionarNotificaciones />} />
          <Route path="asignar-rol" element={<AsignarRol />} />
          <Route path="asignar-permiso" element={<AsignarPermisoPage />} />
          <Route path="reconocimiento-facial" element={<GestionarReconocimientoFacial />} />
          <Route path="unidades" element={<GestionarUnidadHabitacional />} />
          <Route path="tags" element={<GestionarTag />} />
          <Route path="areas-comunes" element={<GestionarAreaComun />} />
          <Route path="facturas" element={<GenerarFactura />} />
          <Route path="pagos" element={<GestionarPago />} />
          <Route path="historial-pagos" element={<GestionarHistorialPago />} />
          <Route path="multas" element={<GestionarMulta />} />
          <Route path="costos-reparaciones" element={<GestionarCostosReparaciones />} />
          <Route path="auditoria-gastos" element={<GestionarAuditoriaGastos />} />
          <Route path="servicios" element={<GestionarServicio />} />
          <Route path="tareas-mantenimiento" element={<GestionarTareaMantenimiento />} />
          <Route path="bitacora" element={<GestionarBitacora />} />
          <Route path="reportes" element={<GestionarReportes />} />
        </Route>
      </Routes>
    </Router>
  );
}

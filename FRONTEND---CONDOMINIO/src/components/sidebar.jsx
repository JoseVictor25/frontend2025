import React from 'react';
import { Menu, theme } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  LoginOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  TeamOutlined,
  IdcardOutlined,
  KeyOutlined,
  VerifiedOutlined,
  RobotOutlined,
  VideoCameraOutlined,
  AlertOutlined,
  NotificationOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  CarOutlined,
  TagOutlined,
  UserSwitchOutlined,
  ProfileOutlined,
  FileTextOutlined,
  DollarCircleOutlined,
  CreditCardOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  AuditOutlined,
  SettingOutlined,
  ReadOutlined,
  AppstoreOutlined, // ✅ Reemplazo seguro para Área común
} from '@ant-design/icons';

const Sidebar = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const location = useLocation();

  const items = [
    // Acceso directo
    {
      key: '/login',
      icon: <LoginOutlined />,
      label: <Link to="/login">Login</Link>,
    },

    // P1. Autenticación y seguridad
    {
      key: 'p1',
     icon: <SafetyCertificateOutlined />,
      label: 'Autenticación y seguridad',
      children: [
       { key: '/logout', icon: <LogoutOutlined />, label: <Link to="/logout">Cerrar sesión</Link> },
       { key: '/permisos', icon: <KeyOutlined />, label: <Link to="/permisos">Gestionar permisos</Link> },
       { key: '/roles', icon: <VerifiedOutlined />, label: <Link to="/roles">Gestionar roles</Link> },
        { key: '/asignar-rol', icon: <IdcardOutlined />, label: <Link to="/asignar-rol">Asignar rol</Link> },
        { key: '/asignar-permiso', icon: <KeyOutlined />, label: <Link to="/asignar-permiso">Asignar permiso</Link> },
        { key: '/reconocimiento-facial', icon: <ProfileOutlined />, label: <Link to="/reconocimiento-facial">Reconocimiento facial</Link> },
        { key: '/ia', icon: <RobotOutlined />, label: <Link to="/ia">Gestionar IA</Link> },
      ],
    },

    // P2. Comunidad y vigilancia
    {
      key: 'p2',
      icon: <TeamOutlined />,
      label: 'Comunidad y vigilancia',
      children: [
        { key: '/propietarios', icon: <UserOutlined />, label: <Link to="/propietarios">Gestionar propietario</Link> },
        { key: '/inquilinos', icon: <UserOutlined />, label: <Link to="/inquilinos">Gestionar inquilino</Link> },
        { key: '/residentes', icon: <TeamOutlined />, label: <Link to="/residentes">Residentes / familia</Link> },
        { key: '/visitas', icon: <IdcardOutlined />, label: <Link to="/visitas">Gestionar visita</Link> },
        { key: '/registro-visitas', icon: <ReadOutlined />, label: <Link to="/registro-visitas">Registro de visita</Link> },
        { key: '/zonas', icon: <EnvironmentOutlined />, label: <Link to="/zonas">Gestionar zona</Link> },
        { key: '/camaras', icon: <VideoCameraOutlined />, label: <Link to="/camaras">Gestionar cámara</Link> },
        { key: '/incidentes', icon: <AlertOutlined />, label: <Link to="/incidentes">Gestionar incidentes</Link> },
        { key: '/notificaciones', icon: <NotificationOutlined />, label: <Link to="/notificaciones">Notificaciones</Link> },
      ],
    },

    // P3. Control de acceso y residencia
    {
      key: 'p3',
      icon: <HomeOutlined />,
      label: 'Control de acceso y residencia',
      children: [
        { key: '/unidades', icon: <HomeOutlined />, label: <Link to="/unidades">Unidad habitacional</Link> },
        { key: '/usuarios', icon: <UserOutlined />, label: <Link to="/usuarios">Gestionar usuarios</Link> },
        { key: '/vehiculos', icon: <CarOutlined />, label: <Link to="/vehiculos">Gestionar vehículo</Link> },
        { key: '/tags', icon: <TagOutlined />, label: <Link to="/tags">Gestionar tag</Link> },
        { key: '/areas-comunes', icon: <AppstoreOutlined />, label: <Link to="/areas-comunes">Área común</Link> },
      ],
    },

    // P4. Gestión financiera
    {
      key: 'p4',
      icon: <DollarCircleOutlined />,
      label: 'Gestión financiera',
      children: [
        { key: '/facturas', icon: <FileTextOutlined />, label: <Link to="/facturas">Generar factura</Link> },
        { key: '/pagos', icon: <CreditCardOutlined />, label: <Link to="/pagos">Gestionar pago</Link> },
        { key: '/historial-pagos', icon: <HistoryOutlined />, label: <Link to="/historial-pagos">Historial de pago</Link> },
        { key: '/multas', icon: <ExclamationCircleOutlined />, label: <Link to="/multas">Gestionar multa</Link> },
        { key: '/costos-reparaciones', icon: <ToolOutlined />, label: <Link to="/costos-reparaciones">Costos de reparaciones</Link> },
        { key: '/auditoria-gastos', icon: <AuditOutlined />, label: <Link to="/auditoria-gastos">Auditoría de gastos</Link> },
      ],
    },

    // P5. Operaciones y administración
    {
      key: 'p5',
      icon: <SettingOutlined />,
      label: 'Operaciones y administración',
      children: [
        { key: '/personal', icon: <UserSwitchOutlined />, label: <Link to="/personal">Gestionar personal</Link> },
        { key: '/servicios', icon: <SettingOutlined />, label: <Link to="/servicios">Gestionar servicio</Link> },
        { key: '/tareas-mantenimiento', icon: <ToolOutlined />, label: <Link to="/tareas-mantenimiento">Tarea de mantenimiento</Link> },
        { key: '/bitacora', icon: <ReadOutlined />, label: <Link to="/bitacora">Gestionar bitácora</Link> },
        { key: '/reportes', icon: <FileTextOutlined />, label: <Link to="/reportes">Gestionar reportes</Link> },
      ],
    },
  ];

  return (
    <div style={{ width: 260, background: colorBgContainer }}>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['p1', 'p2', 'p3', 'p4', 'p5']}
        style={{ height: '100%', borderInlineEnd: 0 }}
        items={items}
      />
    </div>
  );
};

export default Sidebar;

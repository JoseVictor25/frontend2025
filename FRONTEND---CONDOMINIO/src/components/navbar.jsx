import React from 'react';
import { Button } from 'antd';

const Navbar = () => {
  const handleLogout = () => {
    // Lógica para cerrar sesión
    console.log('Sesión cerrada');
  };

  return (
    <div style={{ position: 'relative', height: '64px', width: '100%' }}>
      {/* Nombre centrado */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'yellow',
          fontSize: '24px',
          fontWeight: 'bold',
        }}
      >
        CONDOMINIO
      </div>

      {/* Botón de cerrar sesión en esquina superior derecha */}
      <div style={{ position: 'absolute', top: '10px', right: '16px' }}>
        <Button type="primary" danger onClick={handleLogout}>
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};

export default Navbar;

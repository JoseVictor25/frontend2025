
import React from 'react';
import { Form, Input, Button, Checkbox, Card, message } from 'antd';
import { login } from '../../../services/auth';

const Login = () => {
  const onFinish = async (values) => {
    try {
      await login({ username: values.username, password: values.password });
      message.success('Inicio de sesión exitoso');
      // Redirigir a dashboard
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      message.error('Credenciales inválidas');
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Error:', errorInfo);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5'
      }}
    >
      <Card title="Iniciar Sesión" style={{ width: 350 }}>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          layout="vertical"
        >
          <Form.Item
            label="Usuario o Email"
            name="username"
            rules={[{ required: true, message: 'Por favor, ingrese su usuario o email!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Contraseña"
            name="password"
            rules={[{ required: true, message: 'Por favor, ingrese su contraseña!' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Recordarme</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Ingresar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;


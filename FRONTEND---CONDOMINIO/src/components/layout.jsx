import React from 'react';
import { Layout, Breadcrumb, theme } from 'antd';
import Navbar from './navbar';
import Sidebar from './sidebar';
import { Outlet } from 'react-router-dom'; // Para renderizar las rutas hijas

const { Header, Content, Sider } = Layout;

const LayoutApp = () => {
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', alignItems: 'center' }}>
                <Navbar />
            </Header>
            <Layout>
                <Sider>
                    <Sidebar />
                </Sider>
                <Layout style={{ padding: '0 24px 24px' }}>
                    <Breadcrumb
                        items={[{ title: 'Home' }, { title: 'List' }, { title: 'App' }]}
                        style={{ margin: '16px 0' }}
                    />
                    <Content
                        style={{
                            padding: 24,
                            margin: 0,
                            minHeight: 280,
                            background: colorBgContainer,
                            borderRadius: borderRadiusLG,
                        }}
                    >
                        <Outlet /> {/* Aquí se renderizarán los componentes de las rutas */}
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
};

export default LayoutApp;

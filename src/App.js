import React from 'react';
import { Layout, Typography } from 'antd';

const { Header, Content } = Layout;
const { Title } = Typography;

const App = () => {
  return (
    <Layout>
      <Header>
        <Title level={1} style={{ color: 'white' }}>Winteraktivitäten Spiel</Title>
      </Header>
      <Content style={{ padding: '20px' }}>
        <div>
          <h1>Winteraktivitäten Spiel</h1>
        </div>
      </Content>
    </Layout>
  );
};

export default App;

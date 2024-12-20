import React from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

const Feedback = ({ text }) => {
  return <Paragraph>{text}</Paragraph>;
};

export default Feedback;

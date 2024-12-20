import React from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

const Question = ({ text }) => {
  return <Paragraph>{text}</Paragraph>;
};

export default Question;

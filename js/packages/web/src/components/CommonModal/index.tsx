import React from 'react';
import { Modal } from 'antd';

export const CommonModal = (props: any) => {
  const { children, bodyStyle, className, ...rest } = props;

  return (
    <Modal
      bodyStyle={{
        boxShadow: '0px 8px 6px 4px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',

        ...bodyStyle,
      }}
      className={`common-modal-box ${className}`}
      footer={null}
	  centered
      {...rest}
    >
      {children}
    </Modal>
  );
};

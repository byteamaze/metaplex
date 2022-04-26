import React from 'react';

export const CommonButton = (props: {
  title: string;
  disable: boolean;
  width: string;
  height: string;
  theme: string;
  style: object;
  buttonStyle: object;
}) => {
  const { disable, width, height, theme, style, buttonStyle } = props;
  
  return (
	<div className="common-button-container" style={style}>
		<button disabled={disable} style={buttonStyle}>
			<div className={`${disable ? 'gray' : theme}-below common-button`} style={{width: width, height: height}}></div>
			<div className={`flex-colum-center common-button above disable-select ${disable ? 'gray' : theme}`} style={{width: width, height: height}}>
				<div className={`common-button-title ${disable ? 'disable-title' : ''}`}>{props.title}</div>
			</div>
		</button>
	</div>
  );
};

CommonButton.defaultProps = {
	disable: false,
	width: '140px',
	height: '52px',
	theme: "yellow",
	style: {},
	buttonStyle: {}
};
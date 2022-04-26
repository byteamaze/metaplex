import React from 'react';
import { useEffect } from 'react';

export const Banner = (props: {
  src: string;
  children?: React.ReactNode;
}) => {
  useEffect(() => {
    return () => {};
  }, [props.src]);

  return (
    <>
		<img className="banner-img" src={props.src} />
    </>
  );
};

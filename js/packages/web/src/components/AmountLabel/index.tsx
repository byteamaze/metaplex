import React, { useEffect, useState } from 'react';
import { Statistic } from 'antd';
import { formatAmount, formatUSD, WRAPPED_SOL_MINT } from '@oyster/common';
import { TokenCircle } from '../Custom';
import { TokenInfo } from '@solana/spl-token-registry';

interface IAmountLabel {
  amount: number | string;
  displayUSD?: boolean;
  displaySymbol?: string;
  title?: string;
  style?: object;
  containerStyle?: object;
  iconSize?: number;
  customPrefix?: JSX.Element;
  ended?: boolean;
  tokenInfo?: TokenInfo;
}

export const AmountLabel = (props: IAmountLabel) => {
  const {
    amount: _amount,
    displayUSD = true,
    displaySymbol = '',
    title = '',
    style = {},
    containerStyle = {},
    iconSize = 38,
    customPrefix,
    ended,
    tokenInfo,
  } = props;
  // Add formattedAmount to be able to parse USD value and retain abbreviation of value
  const amount = typeof _amount === 'string' ? parseFloat(_amount) : _amount;
  let formattedAmount = `${amount}`;
  if (amount >= 1) {
    formattedAmount = formatAmount(amount);
  }

  useEffect(() => {}, [amount]);

  const PriceNaN = isNaN(amount);

  return (
    <div style={{ ...containerStyle }}>
      {PriceNaN === false && (
		<div className='flex-row flex-align-center'>
			<img src={`/assets/hair.png`} className='amount-label-token-icon' style={{filter: `grayscale(${ended ? 100 : 0}%)`}} />
			<div className={`amount-label-amount amount-label-${ended ? 'end': 'live'}`}>{formattedAmount}</div>
		</div>
      )}
    </div>
  );
};

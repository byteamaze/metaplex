import React from 'react';
import { Card, CardProps } from 'antd';
import { ArtContent } from '../ArtContent';
import { AuctionView, useArt, useCreators } from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { MetaAvatar } from '../MetaAvatar';
import { AuctionCountdown } from '../AuctionNumbers';
import { Link } from 'react-router-dom';

import { isAuctionEnded } from '../../utils/utils';
import { useAuctionStatus } from './hooks/useAuctionStatus';
import { useTokenList } from '../../contexts/tokenList';
import { CommonButton } from '../CommonButton';
import {
  AuctionState,
  BidStateType,
} from '@oyster/common';

export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  const { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const creators = useCreators(auctionView);
  const name = art?.title || ' ';
  const ended = auctionView.auction.info.state === AuctionState.Ended || auctionView.auction.info.ended();

  const tokenInfo = useTokenList().subscribedTokens.filter(
    m => m.address == auctionView.auction.info.tokenMint,
  )[0];
  const { status, amount } = useAuctionStatus(auctionView);

  const card = (
    <div className={`auction-render-card rendner-card-${ended ? 'end' : 'live'}`}>
      <div className={'card-art-info'}>
        <div className="auction-gray-wrapper">
          <div className={'art-content-wrapper'}>
            <ArtContent
              className="auction-image no-events"
              preview={false}
              pubkey={id}
              allowMeshRender={false}
            />
          </div>
          <div className={'art-name'}>{name}</div>
        </div>
      </div>
	  
	  {ended &&
		<div style={{margin: '0 0 20px 12px'}} className="flex-row flex-align-center">
			<div style={{fontSize: '15px', opacity: 0.7}}>Winning Bid</div>
			<AmountLabel
			  containerStyle={{ flexDirection: 'row', marginLeft: '15px'}}
			  ended={ended}
			  title={status}
			  amount={amount}
			/>
		</div>
	  }
	  
	  {!ended &&
      <div className="card-bid-info">
		<div className='flex-column alc-countdown-card'>
		  <div className='flex-row w-100'>
			<div className='alc-countdown-label' style={{width: '65%'}}>COUNTDOWN</div>
			<div className='alc-countdown-label'>Current bid</div>
		  </div>
		  <div className='flex-row w-100' style={{marginTop: '5px'}}>
			<div className='countdown' style={{width: '65%'}}>
				{!auctionView.isInstantSale && (
				  <div className="auction-info-container">
					<AuctionCountdown auctionView={auctionView} labels={false} />
				  </div>
				)}
			</div>
			<AmountLabel
			  containerStyle={{ flexDirection: 'row'}}
			  title={status}
			  amount={amount}
			/>
		  </div>
		</div>
      </div>
	  }
	  
	  <Link
		style={{width: '100%'}}
	    to={`/auction/${auctionView.auction.pubkey}`}
	  >
		  <div className='w-100 flex-row-center'>
			<CommonButton title={ended ? 'VIEW WINNERS' : 'VIEW'} height='48px' width='210px'/>
		  </div>
	  </Link>
    </div>
  );

  return card;
};
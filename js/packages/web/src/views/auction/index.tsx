import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Carousel, Col, List, Row, Skeleton, Spin } from 'antd';
import { AuctionCard } from '../../components/AuctionCard';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AuctionViewItem } from '@oyster/common/dist/lib/models/metaplex/index';
import {
  AuctionView as Auction,
  useArt,
  useAuction,
  useBidsForAuction,
  useCreators,
  useExtendedArt,
  useUserBalance,
} from '../../hooks';
import { ArtContent } from '../../components/ArtContent';
import { CommonModal } from '../../components/CommonModal';
import { AuctionCancelBid } from '../../components/AuctionCancelBid';
import { eligibleForParticipationPrizeGivenWinningIndex } from '../../actions/sendRedeemBid';

import { format } from 'timeago.js';

import {
  AuctionState,
  formatTokenAmount,
  MetaplexModal,
  MetaplexOverlay,
  shortenAddress,
  StringPublicKey,
  toPublicKey,
  useConnection,
  useConnectionConfig,
  useMint,
  useMeta,
  BidStateType,
  PriceFloorType,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { MintInfo } from '@solana/spl-token';
import useWindowDimensions from '../../utils/layout';
import { CheckOutlined } from '@ant-design/icons';
import { ArtType } from '../../types';
import { MetaAvatar, MetaAvatarDetailed } from '../../components/MetaAvatar';
import { AmountLabel } from '../../components/AmountLabel';
import { ClickToCopy } from '../../components/ClickToCopy';
import { useTokenList } from '../../contexts/tokenList';
import { CommonButton } from '../../components/CommonButton';
import { AuctionCountdown } from '../../components/AuctionNumbers';

export const AuctionView = () => {
  const [showBidModal, setShowBidModal] = useState<boolean>(false);
  const [showRedemptionIssueModal, setShowRedemptionIssueModal] = useState<boolean>(false);
  const [showCancelBidModal, setShowCancelBidModal] = useState<boolean>(false);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  const wallet = useWallet();
  const connection = useConnection();
  const { width } = useWindowDimensions();
  const { id } = useParams<{ id: string }>();
  const { endpoint } = useConnectionConfig();
  
  const auction = useAuction(id);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const art = useArt(auction?.thumbnail.metadata.pubkey);
  const { ref, data } = useExtendedArt(auction?.thumbnail.metadata.pubkey);
  const creators = useCreators(auction);
  const { pullAuctionPage } = useMeta();
  useEffect(() => {
    pullAuctionPage(id);
  }, []);

  let edition = '';
  if (art.type === ArtType.NFT) {
    edition = 'Unique';
  } else if (art.type === ArtType.Master) {
    edition = 'NFT 0';
  } else if (art.type === ArtType.Print) {
    edition = `${art.edition} of ${art.supply}`;
  }
  const LAMPORTS_PER_MINT = Math.ceil(10 ** 9);
  const nftCount = auction?.items.flat().length;
  const winnerCount = auction?.items.length;
  const isOpen = auction?.auction.info.bidState.type === BidStateType.OpenEdition;
  const description = data?.description;
  const attributes = data?.attributes;
  const ended = auction?.auction.info.state === AuctionState.Ended
   || (auction && auction.auction.info.ended());
  const floorPrice = ((auction?.auction.info.priceFloor.type === PriceFloorType.Minimum) 
					 ? auction.auction.info.priceFloor.minPrice?.toNumber() || 0 : 0) / LAMPORTS_PER_MINT;
  
  const walletPubkey = wallet?.publicKey?.toBase58();
  const bids = useBidsForAuction(auction?.auction.pubkey || '').filter(bid => { return !bid.info.cancelled });
  const hasBids = (auction && bids.length > 0);
  const topPrice = hasBids ? (bids[0].info.lastBid.toNumber() / LAMPORTS_PER_MINT).toFixed(2) : null;
  const myBids = hasBids ? bids.filter(bid => { return bid.info.bidderPubkey === walletPubkey }) : [];
  const myPrice = myBids.length > 0 ? (myBids[0].info.lastBid.toNumber() / LAMPORTS_PER_MINT).toFixed(2) : null;
  const winnerIndex = auction?.auction.info.bidState.getWinnerIndex(walletPubkey || '');
  // const eligibleForOpenEdition = auction && eligibleForParticipationPrizeGivenWinningIndex(winnerIndex, auction, auction.myBidderMetadata, auction.myBidRedemption,);
  const isWinner = (winnerIndex === 0 || winnerIndex > 0) && ended;
  // console.log('eligibleForOpenEdition: ', eligibleForOpenEdition)

  const tokenInfo = useTokenList()?.subscribedTokens.filter(
    m => m.address == auction?.auction.info.tokenMint,
  )[0];

    return (
	<div className='flex-row-center'>
      {auction && <div className='flex-row flex-align-start' ref={ref}>
        <div className={'flex-column auction-left-card auction-card'}>
          <div className="auction-view flex-row-center">
			  {!data && <div className='ant-skeleton-image'></div>}
              {data && <img className='ant-skeleton-image' src={data.image} />}
          </div>
		  <div className="art-title">
		    {art.title}
		  </div>
		  <div className={'about-nft-collection a-description'}>
		    {description || 'No description provided'}
		  </div>
		  <div className="bid-info" style={{marginBottom: '20px'}}>
			<div className='flex-row w-100'>
				<div className='label'>my bid</div>
				<div className='label'>top bid</div>
			</div>
			<div className='flex-row w-100'>
				<div className='price flex-row flex-align-center'>
					{myPrice && <img src='/assets/hair.png' className='hair'/>}{myPrice || "-"}
				</div>
				<div className='separator-vertical'></div>
				<div className='price flex-row flex-align-center'>
					{myPrice && <img src='/assets/hair.png' className='hair'/>}{topPrice || '-'}
				</div>
			</div>
		  </div>
		  {!ended && (
			<div className='flex-column w-100'>
			  <div onClick={() => setShowBidModal(true)}>
				<CommonButton title='Place bid' width='310px' />
			  </div>
			  {myPrice && <div style={{marginTop: '10px'}} onClick={() => setShowCancelBidModal(true)}>
				<CommonButton title='Cancellation bid' theme='dark' width='310px' />
			  </div>
			  }
			</div>
		  )}
		  {isWinner && 
		    <div onClick={() => {
				setShowClaimModal(true);
				setShowCancelBidModal(true);
			}}>
		    	<CommonButton title='Redeem purchase' theme='dark' width='310px' />
		    </div>
		  }
        </div>
		
		<div className='flex-column auction-right-card'>
			<div className='auction-card'>
				<div className='arc-title'>Operation</div>
				<div className='a-description'>Genuine Year of the Ox New Year Repost Sweepstakes Details Dynamic GIF Template 00:15 Genuine Red Partner Wechat Business Agent Recruitment Vertical Video Template GIF Genuine New Year's Day Likes Sweepstakes Details Dynamic GIF Template Genuine April Fools' Day Shopping Mall Promotions Promotional Display Rack Genuine April Fools' Day Audience Discount promotions...</div>
			</div>
			
			<div className='flex-row auction-card'>
				<div className='flex-column-center' style={{width: '50%'}}>
					<div className='flex-column'>
						<div className='arc-title'>End time</div>
						{auction && <AuctionCountdown auctionView={auction} wrap={true} />}
					</div>
				</div>
				<div className='separator-vertical' style={{marginTop: '40px'}}></div>
				<div className='flex-column-center' style={{width: '50%'}}>
					<div className='flex-column'>
						<div className='arc-title'>Starting price</div>
						<AmountLabel amount={floorPrice} />
					</div>
				</div>
			</div>
			
			<div className='auction-card'>
				<div className='flex-row'>
					<div className='arc-product-image' style={{marginRight: '30px'}}>
						<img className='arc-product-image' src={data?.image} />
					</div>
					<div className='flex-column'>
						<div className='arc-title'>product details</div>
						<div className='a-description'>Genuine Year of the Ox New Year Repost Sweepstakes Details Dynamic GIF Template 00:15 Genuine Red Partner Wechat Business Agent Recruitment Vertical Video Template...</div>
						<div className='flex-row' style={{marginTop: '30px'}}>
						  <div className='arc-social-box'>
							<img src="/assets/social-website.png" className="arc-social-icon"/>
						  </div>
						  <div className='arc-social-box'>
							<img src="/assets/social-discord.png" className="arc-social-icon"/>
						  </div>
						  <div className='arc-social-box'>
							<img src="/assets/social-twitter.png" className="arc-social-icon"/>
						  </div>
						</div>
					</div>
				</div>
			</div>
			
			{!auction.isInstantSale && (
			<div className='auction-card' style={{padding: '20px 0'}}>
				<AuctionBids auctionView={auction} />
			</div>
			)}
		</div>
      </div>
	  }
	  
	  <CommonModal
		title="Error"
	    visible={showRedemptionIssueModal}
	    onCancel={() => setShowRedemptionIssueModal(false)}>
	    <span style={{ color: '#F03030', padding: '20px' }}>
	      There was an issue redeeming or refunding your bid. Please try again.
	    </span>
	  </CommonModal>
	  
	  <CommonModal visible={showCancelBidModal} title={showClaimModal ? 'Redeem purchase' : 'Cancellation bid'} closable={false}>
		<AuctionCancelBid auctionView={auction} claim={showClaimModal} onCancel={() => setShowCancelBidModal(false)} />
	  </CommonModal>
	  
	  <CommonModal
	    visible={showBidModal}
	    bodyStyle={{padding: '0 40px'}}
		onCancel={() => setShowBidModal(false)}
        title="Place bid"
        centered>
		  <AuctionCard auctionView={auction} hideDefaultAction={false} />
	  </CommonModal>
	</div>
    );
};

const BidLine = (props: {
  bid: any;
  keyIndex: number;
  index: number;
  mint?: MintInfo;
  isCancelled?: boolean;
  isActive?: boolean;
  mintKey: string;
}) => {
  const { bid, mint, isCancelled, mintKey } = props;
  const { publicKey } = useWallet();
  const bidder = bid.info.bidderPubkey;
  const isme = publicKey?.toBase58() === bidder;
  const tokenInfo = useTokenList().subscribedTokens.filter(
    m => m.address == mintKey,
  )[0];

  // Get Twitter Handle from address
  const connection = useConnection();
  useEffect(() => {}, []);
  const { width } = useWindowDimensions();
  return (
	<div className={`bid-history bids-lists-${props.keyIndex % 2}`}>
	  {isCancelled && (
	    <div
	      style={{
	        position: 'absolute',
	        left: 0,
	        width: '100%',
	        height: 1,
	        background: 'grey',
	        top: 'calc(50% - 1px)',
	        zIndex: 2,
	      }}
	    />
	  )}
	  <div className='bid-lines-left flex-row flex-align-center'>
		  {isme && (
		    <>
		      <CheckOutlined />&nbsp;
		    </>
		  )}
	      <span style={{ opacity: 0.7 }}>
			<Row className="pubkey-row">
			  {shortenAddress(bidder)}
			</Row>
	      </span>
	  </div>
	  <div className='bid-lines-middle' style={{ opacity: 0.7 }}>
	    {/* uses milliseconds */}
	    {format(bid.info.lastBidTimestamp.toNumber() * 1000)}
	  </div>
	  <div className='bid-lines-right'>
	    {!isCancelled && (
	      <div className={'flex-right'}>
	        <AmountLabel
	          style={{ marginBottom: 0, fontSize: '16px' }}
	          containerStyle={{
	            flexDirection: 'row',
	            alignItems: 'center',
	          }}
	          displaySymbol={tokenInfo?.symbol || 'CUSTOM'}
	          tokenInfo={tokenInfo}
	          iconSize={24}
	          amount={formatTokenAmount(bid.info.lastBid, mint)}
	        />
	      </div>
	    )}
	  </div>
	</div>
  );
};

export const AuctionBids = ({
  auctionView,
}: {
  auctionView?: Auction | null;
}) => {
  const bids = useBidsForAuction(auctionView?.auction.pubkey || '');

  const mint = useMint(auctionView?.auction.info.tokenMint);
  const { width } = useWindowDimensions();

  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const winnersCount = auctionView?.auction.info.bidState.max.toNumber() || 0;
  const activeBids = auctionView?.auction.info.bidState.bids || [];
  const activeBidders = useMemo(() => {
    return new Set(activeBids.map(b => b.key));
  }, [activeBids]);
  const auctionState = auctionView
    ? auctionView.auction.info.state
    : AuctionState.Created;
  const bidLines = useMemo(() => {
    let activeBidIndex = 0;
    return bids.map((bid, index) => {
      const isCancelled =
        (index < winnersCount && !!bid.info.cancelled) ||
        (auctionState !== AuctionState.Ended && !!bid.info.cancelled);

      const line = (
        <BidLine
          bid={bid}
		  keyIndex={index}
          index={activeBidIndex}
          key={index}
          mint={mint}
          isCancelled={isCancelled}
          isActive={!bid.info.cancelled}
          mintKey={auctionView?.auction.info.tokenMint || ''}
        />
      );

      if (!isCancelled) {
        activeBidIndex++;
      }

      return line;
    });
  }, [auctionState, bids, activeBidders]);

  if (!auctionView || bids.length < 1) return null;

  return (
    <Row>
      <Col className="bids-lists">
        <div className={'bid-lines-header flex-row flex-align-center'}>
			<div className='bid-lines-left'>
				{auctionView.isInstantSale ? 'Sale' : 'Bid'} History
			</div>
			<div className='bid-lines-middle'>Time</div>
			<div className='bid-lines-right'>
			  <div className={'flex-right'}>Price</div>
			</div>
        </div>
        {bidLines.slice(0, 20)}
      </Col>
    </Row>
  );
};

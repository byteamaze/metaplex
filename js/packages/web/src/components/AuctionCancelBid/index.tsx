import React, { useState } from 'react';
import { Card, CardProps, Spin, Button } from 'antd';
import { ArtContent } from '../ArtContent';
import {
	AuctionView,
	useArt,
	useCreators,
	useUserBalance,
	useBidsForAuction,
} from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { MetaAvatar } from '../MetaAvatar';
import { AuctionCountdown } from '../AuctionNumbers';
import { Link } from 'react-router-dom';

import { useWallet } from '@solana/wallet-adapter-react';
import { isAuctionEnded } from '../../utils/utils';
import { useAuctionStatus } from './hooks/useAuctionStatus';
import { useTokenList } from '../../contexts/tokenList';
import { sendCancelBid } from '../../actions/cancelBid';
import {
  sendRedeemBid,
  eligibleForParticipationPrizeGivenWinningIndex,
} from '../../actions/sendRedeemBid';
import { CommonButton } from '../CommonButton';
import {
  AuctionState,
  BidStateType,
  useConnection,
  useUserAccounts,
  MetaplexOverlay,
  useMeta,
} from '@oyster/common';
import { Confetti } from '../../components/Confetti';

export interface AuctionCancel extends CardProps {
  auctionView: AuctionView;
  claim: boolean;
  onCancel: Function;
}

export const AuctionCancelBid = (props: AuctionCancel) => {
  const { auctionView, onCancel, claim } = props;
  
  const [loading, setLoading] = useState<boolean>(false);
  const [showCancelIssue, setShowCancelIssue] = useState<boolean>(false);
  const [showCompletedMoal, setShowCompletedMoal] = useState<boolean>(false);
  
  const wallet = useWallet();
  const connection = useConnection();
  const { accountByMint } = useUserAccounts();
  const { prizeTrackingTickets, bidRedemptions } = useMeta();
  const bids = useBidsForAuction(auctionView.auction.pubkey);
  const mintKey = auctionView.auction.info.tokenMint;
  const balance = useUserBalance(mintKey);
  const myPayingAccount = balance.accounts[0];
  
  console.log(balance);
  
  // Claim the purchase
  const claimBid = async () => {
	  setLoading(true);
	  setShowCancelIssue(false);
	  try {
	    await sendRedeemBid(
	      connection,
	      wallet,
	      myPayingAccount.pubkey,
	      auctionView,
	      accountByMint,
	      prizeTrackingTickets,
	      bidRedemptions,
	      bids,
	    );
		setShowCompletedMoal(true);
	    // await update();
	    // if (canClaimPurchasedItem) setIsOpenClaim(true);
	    // else setIsOpenPurchase(true);
	  } catch (e) {
	    console.error(e);
	    setShowRedemptionIssue(true);
		setLoading(false);
	  }
  }
  
  // Cancel the bid
  const cancelBid = async () => {
    setLoading(true);
	setShowCancelIssue(false);
    try {
        await sendCancelBid(
          connection,
          wallet,
          myPayingAccount.pubkey,
          auctionView,
          accountByMint,
          bids,
          bidRedemptions,
          prizeTrackingTickets,
        );
		onCancel();
    } catch (e) {
      console.error(e);
      setShowCancelIssue(true);
    }
    setLoading(false);
  }
  
  const gotIt = () => {
	setShowCompletedMoal(false);
	onCancel();
  };
  
  return (
	<div className='w-100 flex-column-center' style={{padding: '40px'}}>
		{!loading && (
			<div className='flex-column-center'>
				{showCancelIssue &&
					<div className='text-a-center' style={{ color: '#ef233c', fontSize: '16px', marginBottom: '30px' }}>
					  There was an issue {claim ? 'redeeming' : 'refunding'} your bid.<br/>Please try again.
					</div>
				}
				<div onClick={() => {claim ? claimBid() : cancelBid()}}>
					<CommonButton title={claim ? 'Redeem purchase' : 'Cancellation bid'} width='300px' />
				</div>
				<div onClick={() => onCancel()} style={{marginTop: '20px'}}>
					<CommonButton title='Back' width='300px' theme='dark' />
				</div>
			</div>
		)}
		{loading && (
			<div className='w-100 flex-column-center' style={{fontSize: '18px'}}>
				<Spin />
				<div>Processing...</div>
			</div>
		)}
		
		<MetaplexOverlay visible={showCompletedMoal} mask={true}>
		  <Confetti />
		  <h1 className="title" style={{ fontSize: '3rem', marginBottom: 20, }}>
			Congratulations
		  </h1>
		  <p style={{ color: 'white', textAlign: 'center', fontSize: '2rem', }}>
		    Your {auctionView?.isInstantSale ? 'purchase' : 'bid'} has been redeemed.
		  </p>
		  <Button onClick={() => gotIt()} className="overlay-btn">Got it</Button>
		</MetaplexOverlay>
	</div>
  );
};
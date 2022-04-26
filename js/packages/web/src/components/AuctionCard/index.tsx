import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, InputNumber, Spin } from 'antd';
import { Link, useHistory } from 'react-router-dom';

import {
  useConnection,
  useUserAccounts,
  MetaplexModal,
  MetaplexOverlay,
  formatTokenAmount,
  useMint,
  PriceFloorType,
  AuctionDataExtended,
  ParsedAccount,
  getAuctionExtended,
  programIds,
  AuctionState,
  BidderMetadata,
  MAX_METADATA_LEN,
  MAX_EDITION_LEN,
  Identicon,
  fromLamports,
  useWalletModal,
  VaultState,
  BidStateType,
  WRAPPED_SOL_MINT,
  Bid,
  BidderPot,
  shortenAddress,
} from '@oyster/common';
import {
  AuctionView,
  AuctionViewState,
  useBidsForAuction,
  useUserBalance,
  useCreators,
} from '../../hooks';
import { useWallet } from '@solana/wallet-adapter-react';
import { sendPlaceBid } from '../../actions/sendPlaceBid';
import {
  sendRedeemBid,
  eligibleForParticipationPrizeGivenWinningIndex,
} from '../../actions/sendRedeemBid';
import BN from 'bn.js';
import { Confetti } from '../Confetti';
import { QUOTE_MINT } from '../../constants';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useMeta } from '../../contexts';
import moment from 'moment';
import { AmountLabel } from '../AmountLabel';
import { CommonButton } from '../CommonButton';
import { HowAuctionsWorkModal } from '../HowAuctionsWorkModal';
import { AccountLayout, MintLayout } from '@solana/spl-token';
import { findEligibleParticipationBidsForRedemption } from '../../actions/claimUnusedPrizes';
import {
  BidRedemptionTicket,
  MAX_PRIZE_TRACKING_TICKET_SIZE,
  WinningConfigType,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { useActionButtonContent } from './hooks/useActionButtonContent';
import { endSale } from './utils/endSale';
import { useInstantSaleState } from './hooks/useInstantSaleState';
import { useTokenList } from '../../contexts/tokenList';
import CongratulationsModal from '../Modals/CongratulationsModal';

async function calculateTotalCostOfRedeemingOtherPeoplesBids(
  connection: Connection,
  auctionView: AuctionView,
  bids: ParsedAccount<BidderMetadata>[],
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
): Promise<number> {
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );
  const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );
  const metadataRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_METADATA_LEN,
  );
  const editionRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_EDITION_LEN,
  );
  const prizeTrackingTicketExempt =
    await connection.getMinimumBalanceForRentExemption(
      MAX_PRIZE_TRACKING_TICKET_SIZE,
    );

  const eligibleParticipations =
    await findEligibleParticipationBidsForRedemption(
      auctionView,
      bids,
      bidRedemptions,
    );
  const max = auctionView.auction.info.bidState.max.toNumber();
  let totalWinnerItems = 0;
  for (let i = 0; i < max; i++) {
    const winner = auctionView.auction.info.bidState.getWinnerAt(i);
    if (!winner) {
      break;
    } else {
      const bid = bids.find(b => b.info.bidderPubkey === winner);
      if (bid) {
        for (
          let j = 0;
          j < auctionView.auctionManager.safetyDepositBoxesExpected.toNumber();
          j++
        ) {
          totalWinnerItems += auctionView.auctionManager
            .getAmountForWinner(i, j)
            .toNumber();
        }
      }
    }
  }
  return (
    (mintRentExempt +
      accountRentExempt +
      metadataRentExempt +
      editionRentExempt +
      prizeTrackingTicketExempt) *
    (eligibleParticipations.length + totalWinnerItems)
  );
}
function useGapTickCheck(
  value: number | undefined,
  gapTick: number | null,
  gapTime: number,
  auctionView: AuctionView,
  LAMPORTS_PER_MINT: number,
): boolean {
  return !!useMemo(() => {
    if (gapTick && value && gapTime && !auctionView.auction.info.ended()) {
      // so we have a gap tick percentage, and a gap tick time, and a value, and we're not ended - are we within gap time?
      const now = moment().unix();
      const endedAt = auctionView.auction.info.endedAt;
      if (endedAt) {
        const ended = endedAt.toNumber();
        if (now > ended) {
          const toLamportVal = value * LAMPORTS_PER_MINT;
          // Ok, we are in gap time, since now is greater than ended and we're not actually an ended auction yt.
          // Check that the bid is at least gapTick % bigger than the next biggest one in the stack.
          for (
            let i = auctionView.auction.info.bidState.bids.length - 1;
            i > -1;
            i--
          ) {
            const bid = auctionView.auction.info.bidState.bids[i];
            const expected = bid.amount.toNumber();
            if (expected < toLamportVal) {
              const higherExpectedAmount = expected * ((100 + gapTick) / 100);

              return higherExpectedAmount > toLamportVal;
            } else if (expected === toLamportVal) {
              // If gap tick is set, no way you can bid in this case - you must bid higher.
              return true;
            }
          }
          return false;
        } else {
          return false;
        }
      }
      return false;
    }
  }, [value, gapTick, gapTime, auctionView]);
}

function useAuctionExtended(
  auctionView: AuctionView,
): ParsedAccount<AuctionDataExtended> | undefined {
  const [auctionExtended, setAuctionExtended] =
    useState<ParsedAccount<AuctionDataExtended>>();
  const { auctionDataExtended } = useMeta();

  useMemo(() => {
    const fn = async () => {
      if (!auctionExtended) {
        const PROGRAM_IDS = programIds();
        const extendedKey = await getAuctionExtended({
          auctionProgramId: PROGRAM_IDS.auction,
          resource: auctionView.vault.pubkey,
        });
        const extendedValue = auctionDataExtended[extendedKey];
        if (extendedValue) setAuctionExtended(extendedValue);
      }
    };
    fn();
  }, [auctionDataExtended, auctionExtended, setAuctionExtended]);

  return auctionExtended;
}
export const AuctionCard = ({
  auctionView,
  style,
  hideDefaultAction,
  action,
}: {
  auctionView: AuctionView;
  style?: React.CSSProperties;
  hideDefaultAction?: boolean;
  action?: JSX.Element;
}) => {
  const history = useHistory();
  const connection = useConnection();
  const { update } = useMeta();

  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible],
  );

  const mintInfo = useMint(auctionView.auction.info.tokenMint);
  const { prizeTrackingTickets, bidRedemptions } = useMeta();
  const bids = useBidsForAuction(auctionView.auction.pubkey);
  const creators = useCreators(auctionView);

  const [value, setValue] = useState<number>();
  const [loading, setLoading] = useState<boolean>(false);
  const [showBidPlaced, setShowBidPlaced] = useState<boolean>(false);
  const [showPlaceBid, setShowPlaceBid] = useState<boolean>(false);
  const [lastBid, setLastBid] = useState<{ amount: BN } | undefined>(undefined);
  const [isOpenPurchase, setIsOpenPurchase] = useState<boolean>(false);

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [printingCost, setPrintingCost] = useState<number>();

  const { accountByMint } = useUserAccounts();

  const mintKey = auctionView.auction.info.tokenMint;
  const balance = useUserBalance(mintKey);
  const tokenInfo = useTokenList().subscribedTokens.filter(
    m => m.address == mintKey,
  )[0];
  const symbol = '$HAIR';

  const LAMPORTS_PER_MINT = tokenInfo
    ? Math.ceil(10 ** tokenInfo.decimals)
    : LAMPORTS_PER_SOL;

  //console.log("[--P]AuctionCard", tokenInfo, mintKey)
  const myPayingAccount = balance.accounts[0];
  const instantSalePrice = useMemo(
    () => auctionView.auctionDataExtended?.info.instantSalePrice,
    [auctionView.auctionDataExtended],
  );
  let winnerIndex: number | null = null;
  if (auctionView.myBidderPot?.pubkey)
    winnerIndex = auctionView.auction.info.bidState.getWinnerIndex(
      auctionView.myBidderPot?.info.bidderAct,
    );
  const priceFloor =
    auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
      ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
      : 0;
  const auctionExtended = useAuctionExtended(auctionView);

  const gapTime = (auctionView.auction.info.auctionGap?.toNumber() || 0) / 60;
  const gapTick = auctionExtended
    ? auctionExtended.info.gapTickSizePercentage
    : 0;
  const tickSize = auctionExtended?.info?.tickSize
    ? auctionExtended.info.tickSize
    : 0;
  const tickSizeInvalid = !!(
    tickSize &&
    value &&
    (value * LAMPORTS_PER_MINT) % tickSize.toNumber() != 0
  );

  const gapBidInvalid = useGapTickCheck(
    value,
    gapTick,
    gapTime,
    auctionView,
    LAMPORTS_PER_MINT,
  );

  const isAuctionManagerAuthorityNotWalletOwner =
    auctionView.auctionManager.authority !== wallet?.publicKey?.toBase58();

  const isAuctionNotStarted =
    auctionView.auction.info.state === AuctionState.Created;

  const isUpcoming = auctionView.state === AuctionViewState.Upcoming;
  const isStarted = auctionView.state === AuctionViewState.Live;
  const participationFixedPrice =
    auctionView.auctionManager.participationConfig?.fixedPrice || 0;
  const participationOnly =
    auctionView.auctionManager.numWinners.toNumber() === 0;

  const minBid =
    tickSize &&
    (isUpcoming || bids.length === 0
      ? fromLamports(
          participationOnly ? participationFixedPrice : priceFloor,
          mintInfo,
        )
      : isStarted && bids.length > 0
      ? parseFloat(formatTokenAmount(bids[0].info.lastBid, mintInfo))
      : 9999999) +
      tickSize.toNumber() / LAMPORTS_PER_MINT;

  const invalidBid =
    tickSizeInvalid ||
    gapBidInvalid ||
    !myPayingAccount ||
    value === undefined ||
    value * LAMPORTS_PER_MINT < priceFloor ||
    (minBid && value < minBid) ||
    loading ||
    !accountByMint.get(QUOTE_MINT.toBase58());

  useEffect(() => {
    if (wallet.connected) {
      if (wallet.publicKey && !showPlaceBid) setShowPlaceBid(true);
    } else {
      if (showPlaceBid) setShowPlaceBid(false);
    }
  }, [wallet.connected]);

  const {
    canEndInstantSale,
    isAlreadyBought,
    canClaimPurchasedItem,
    canClaimItem,
  } = useInstantSaleState(auctionView);

  const isOpenEditionSale =
    auctionView.auction.info.bidState.type === BidStateType.OpenEdition;

  const isBidderPotEmpty = Boolean(
    // If I haven't bid, myBidderPot should be empty
    !auctionView.myBidderPot || auctionView.myBidderPot?.info.emptied,
  );
  const doesInstantSaleHasNoItems =
    isBidderPotEmpty &&
    auctionView.auction.info.bidState.max.toNumber() === bids.length;

  const shouldHideInstantSale =
    !isOpenEditionSale &&
    auctionView.isInstantSale &&
    isAuctionManagerAuthorityNotWalletOwner &&
    doesInstantSaleHasNoItems &&
    // If your bidderpot is empty but you haven't claimed
    !canClaimPurchasedItem;

  const shouldHide =
    shouldHideInstantSale ||
    (auctionView.vault.info.state === VaultState.Deactivated &&
      isBidderPotEmpty);

  const actionButtonContent = useActionButtonContent(auctionView);
  
  const placeBidNow = async () => {
	if (invalidBid) { return; }
	setLoading(true);
	if (myPayingAccount && value) {
	  try {
		  const bid = await sendPlaceBid(
			connection,
			wallet,
			myPayingAccount.pubkey,
			auctionView,
			accountByMint,
			value,
		  );
		  setLastBid(bid);
		  // setShowBidModal(false);
		  setShowBidPlaced(true);
	  } catch (e) {
	  }
	  setLoading(false);
	}
  }

  if (shouldHide) {
    return <></>;
  }

  return (
    <div className="auction-container" style={style}>
      <div className={'bid-info'}>
        <div className="bid-info-container">
        </div>
        {showPlaceBid &&
          !auctionView.isInstantSale &&
          !hideDefaultAction &&
          wallet.connected &&
          !auctionView.auction.info.ended() && (
            <div className='flex-column' style={{marginTop: '15px', marginBottom: '10px', paddingTop: '15px'}}>
              <div style={{margin: '0 0 12px 0',letterSpacing: '0.02em',fontSize: '14px'}}>Bid amount $HAIR</div>
              <div className={'bid-container'}>
                <div
                  style={{
                    width: '100%',
                    background: '#242424',
                    borderRadius: 14,
                    color: 'rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <InputNumber
                    autoFocus
                    className="input sol-input-bid"
                    value={value}
                    onChange={setValue}
                    precision={4}
                    style={{ fontSize: 16, lineHeight: '56px' }}
                    formatter={value => value ? ` ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '' }
                    placeholder={ minBid === 0 ? `Place a Bid` : `Bid ${minBid.toFixed(2)} or more` }
                  />
                </div>
                <div className={'bid-buttons flex-row-center'} style={{marginTop: '30px'}} onClick={() => placeBidNow()}>
				  <CommonButton title='Bid now' disable={invalidBid} width='405px' />
                </div>
              </div>
            </div>
          )}
        {loading || !accountByMint.get(QUOTE_MINT.toBase58()) ? (<Spin />) : (<div></div>)}

        {action}
        {tickSizeInvalid && tickSize && (
          <span style={{ color: 'red' }}>
            Tick size is {tickSize.toNumber() / LAMPORTS_PER_MINT}.
          </span>
        )}
        {gapBidInvalid && (
          <span style={{ color: 'red' }}>
            Your bid needs to be at least {gapTick}% larger than an existing bid
            during gap periods to be eligible.
          </span>
        )}
        {!loading && value !== undefined && showPlaceBid && invalidBid && (
          <span style={{ color: 'red' }}>Invalid amount</span>
        )}
      </div>

      <MetaplexOverlay visible={showBidPlaced} mask={true}>
        <Confetti />
        <h1
          className="title"
          style={{
            fontSize: '3rem',
            marginBottom: 20,
          }}
        >
          Nice bid!
        </h1>
        <p
          style={{
            color: 'white',
            textAlign: 'center',
            fontSize: '2rem',
          }}
        >
          Your bid of {formatTokenAmount(lastBid?.amount, mintInfo)} was successful
        </p>
        <Button onClick={() => setShowBidPlaced(false)} className="overlay-btn">Got it</Button>
      </MetaplexOverlay>

      <MetaplexModal
        visible={showWarningModal}
        onCancel={() => setShowWarningModal(false)}
        bodyStyle={{alignItems: 'start'}}
		mask={true}
      >
        <h3 style={{ color: 'white' }}>
          Warning: There may be some items in this auction that still are
          required by the auction for printing bidders&apos; limited or open
          edition NFTs. If you wish to withdraw them, you are agreeing to foot
          the cost of up to an estimated ◎
          <b>{(printingCost || 0) / LAMPORTS_PER_MINT}</b> plus transaction fees
          to redeem their bids for them right now.
        </h3>
      </MetaplexModal>
      <CongratulationsModal
        isModalVisible={isOpenPurchase}
        onClose={() => setIsOpenPurchase(false)}
        onClickOk={() => window.location.reload()}
        buttonText="Reload"
        content="Reload the page and click claim to receive your NFT. Then check your wallet to confirm it has arrived. It may take a few minutes to process."
      />
    </div>
  );
};

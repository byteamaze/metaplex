import { useWallet } from '@solana/wallet-adapter-react';
import { Col, Layout, Row, Tabs } from 'antd';
import React, { useMemo, useState } from 'react';

import { useMeta } from '../../../../contexts';
import { CardLoader } from '../../../../components/MyLoader';
import { Banner } from '../../../../components/Banner';
import { HowToBuyModal } from '../../../../components/HowToBuyModal';

import { useAuctionsList } from './hooks/useAuctionsList';
import { AuctionRenderCard } from '../../../../components/AuctionRenderCard';
import { CommonButton } from '../../../../components/CommonButton';

const { TabPane } = Tabs;
const { Content } = Layout;

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
  Own = '4',
}

export const SalesListView = (props: { collectionMintFilter?: string }) => {
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { isLoading } = useMeta();
  const { connected } = useWallet();
  const { auctions, hasResaleAuctions } = useAuctionsList(activeKey);

  const filteredAuctions = useMemo(() => {
    if (props.collectionMintFilter) {
      return auctions.filter(
        auction =>
          auction.thumbnail.metadata.info.collection?.key ===
          props.collectionMintFilter,
      );
    }
    return auctions;
  }, [auctions, props.collectionMintFilter]);

  return (
    <>
      {!props.collectionMintFilter && (<Banner src="../assets/auction_header.png" />)}
      <Layout>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }} className='sale-list-content'>
          <Col style={{ width: '100%'}}>
		    <div className='sale-list-content-title'>DUSTILE'S</div>
			{!isLoading &&
            <Row style={{ margin: '30px 0 10px 0'}}>
                <div onClick={() => setActiveKey(LiveAuctionViewState.All)}>
					<CommonButton title='Live' width='105px' height='44px' theme={(activeKey === LiveAuctionViewState.All) ? "green" : "dark"} />
				</div>
                <div onClick={() => setActiveKey(LiveAuctionViewState.Ended)} style={{marginLeft: '20px'}}>
				  <CommonButton title='Ended' width='105px' height='44px' theme={(activeKey === LiveAuctionViewState.Ended) ? "green" : "dark"} />
				</div>
            </Row>
			}
            <Row>
              <div className="artwork-grid">
                {/*isLoading && [...Array(10)].map((_, idx) => <CardLoader key={idx} />)*/}
                {!isLoading &&
                  filteredAuctions.map(auction => (
                      <AuctionRenderCard auctionView={auction} key={auction.auction.pubkey} />
                  ))}
              </div>
            </Row>
          </Col>
        </Content>
      </Layout>
    </>
  );
};

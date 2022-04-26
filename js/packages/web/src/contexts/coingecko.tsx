import React, { useContext, useEffect, useState } from 'react';

export const COINGECKO_POOL_INTERVAL = 1000 * 60; // 60 sec
export const COINGECKO_API = 'https://api.coingecko.com/api/v3/';
export const COINGECKO_COIN_PRICE_API = `${COINGECKO_API}simple/price`;
export interface CoingeckoContextState {
  solPrice: number;
  allSplPrices: AllSplTokens[];
}
export interface AllSplTokens {
  tokenName: string;
  tokenMint: string;
  tokenPrice: number;
}

export const altSplToUSD = async (cgTokenName?: string): Promise<number> => {
    return 0;
};

const CoingeckoContext = React.createContext<CoingeckoContextState | null>(
  null,
);

export function CoingeckoProvider({ children = null }: { children: any }) {
  const [solPrice, setSolPrice] = useState<number>(0);
  const [allSplPrices, setAllSplPrices] = useState<AllSplTokens[]>([]);

  useEffect(() => {
    return () => {};
  }, [setSolPrice, setAllSplPrices]);

  return (
    <CoingeckoContext.Provider value={{ solPrice, allSplPrices }}>
      {children}
    </CoingeckoContext.Provider>
  );
}

export const useCoingecko = () => {
  const context = useContext(CoingeckoContext);
  return context as CoingeckoContextState;
};

export const useSolPrice = () => {
  const { solPrice } = useCoingecko();

  return solPrice;
};

export const useAllSplPrices = () => {
  const { allSplPrices } = useCoingecko();

  return allSplPrices;
};

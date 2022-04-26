import { CountdownState } from '@oyster/common';

export const cleanName = (name?: string): string | undefined => {
  if (!name) {
    return undefined;
  }

  return name.replace(/\s+/g, '-');
};

export const getLast = <T>(arr: T[]) => {
  if (arr.length <= 0) {
    return undefined;
  }

  return arr[arr.length - 1];
};


export const isAuctionEnded = (state: CountdownState) => {
	return state?.days === 0 &&
	  state?.hours === 0 &&
	  state?.minutes === 0 &&
	  state?.seconds === 0;
};
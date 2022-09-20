import algosdk from "algosdk";
import MyAlgoConnect from "@randlabs/myalgo-connect";

const config = {
  algodToken: "",
  algodServer: "https://node.testnet.algoexplorerapi.io",
  algodPort: "",
  indexerToken: "",
  indexerServer: "https://algoindexer.testnet.algoexplorerapi.io",
  indexerPort: "",
};

export const algodClient = new algosdk.Algodv2(
  config.algodToken,
  config.algodServer,
  config.algodPort
);

export const indexerClient = new algosdk.Indexer(
  config.indexerToken,
  config.indexerServer,
  config.indexerPort
);

export const myAlgoConnect = new MyAlgoConnect();

export const minRound = 21540981;

// https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0002.md
export const lotteryNote = "lottery:uv1";

// Maximum local storage allocation, immutable
export const numLocalInts = 3;
// Local variables stored as Int: id, no_of_ticket, winnerstatus
export const numLocalBytes = 1;
// Local variables stored as Bytes: Ticket array

// Maximum global storage allocation, immutable
export const numGlobalInts = 16;
// Global variables stored as Int: duration, starttime, endtime,
// noOfPlayers, noOfTickets, ticketPrice, pricepool, lotterystatus,
// winningTicket, winnerReward, next_lottery_fund, prev_app,
// multiplier, increment, modulus, seed

export const numGlobalBytes = 2;
// Global variables stored as Bytes: starter address, ender address

export const ALGORAND_DECIMALS = 6;

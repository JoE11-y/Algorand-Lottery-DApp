import algosdk from "algosdk";
import MyAlgoConnect from "@randlabs/myalgo-connect";
import { Lottery } from "./lottery";

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

export const zero_address =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

export const myAlgoConnect = new MyAlgoConnect();

export const minRound = 21540981;

// https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0002.md
export const lotteryNote = "algolottery:uv2";

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

export const numGlobalBytes = 3;
// Global variables stored as Bytes: starter address, ender address, winner address

export const ALGORAND_DECIMALS = 6;

/// values for dummy contract
let appId = 0;
let appAddress = zero_address;
let creatorAddress = zero_address;
let lottery_duration = 0;
let lottery_start_time = 0;
let lottery_end_time = 0;
let total_no_of_players = 0;
let total_no_of_tickets = 0;
let ticket_price = 0;
let prize_pool = 0;
let status = 100;
let winning_ticket = 0;
let starter = zero_address;
let ender = zero_address;
let winner = zero_address;
let next_lottery_fund = 0;
let prev_app = 0;
let winner_reward = 0;
let user_id = 0;
let user_no_of_tickets = 0;
let user_is_winner = 0;

export const dummyLottery = new Lottery(
  appId,
  appAddress,
  creatorAddress,
  lottery_duration,
  lottery_start_time,
  lottery_end_time,
  total_no_of_players,
  total_no_of_tickets,
  ticket_price,
  prize_pool,
  status,
  winning_ticket,
  starter,
  ender,
  winner,
  next_lottery_fund,
  prev_app,
  winner_reward,
  user_id,
  user_no_of_tickets,
  user_is_winner
);

import algosdk from "algosdk";
import * as algo from "./constants";
import { Base64 } from "js-base64";
/* eslint import/no-webpack-loader-syntax: off */
import ApprovalProgram from "!!raw-loader!../contracts/lottery_approval.teal";
import ClearProgram from "!!raw-loader!../contracts/lottery_clear.teal";
import {
  base64ToUTF8String,
  utf8ToBase64String,
  stringToMicroAlgos,
} from "./conversions";

class Lottery {
  constructor(
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
    winner_reward,
    next_lottery_fund,
    prev_app,
    user_id,
    user_no_of_tickets
  ) {
    this.appId = appId;
    this.appAddress = appAddress;
    this.creatorAddress = creatorAddress;
    this.lottery_duration = lottery_duration;
    this.lottery_start_time = lottery_start_time;
    this.lottery_end_time = lottery_end_time;
    this.total_no_of_players = total_no_of_players;
    this.total_no_of_tickets = total_no_of_tickets;
    this.ticket_price = ticket_price;
    this.prize_pool = prize_pool;
    this.status = status;
    this.winning_ticket = winning_ticket;
    this.starter = starter;
    this.ender = ender;
    this.winner_reward = winner_reward;
    this.next_lottery_fund = next_lottery_fund;
    this.prev_app = prev_app;
    this.user_id = user_id;
    this.user_no_of_tickets = user_no_of_tickets;
  }
}

// Compile smart contract in .teal format to program
const compileProgram = async (programSource) => {
  let encoder = new TextEncoder();
  let programBytes = encoder.encode(programSource);
  let compileResponse = await algo.algodClient.compile(programBytes).do();
  return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
};

// CREATE Lottery: ApplicationCreateTxn
export const createLotteryAction = async (
  senderAddress,
  newLottery,
  oldLottery
) => {
  console.log("Creating new Lottery...");

  let params = await algo.algodClient.getTransactionParams().do();

  // Compile Programs
  const compiledApprovalProgram = await compileProgram(ApprovalProgram);
  const compiledClearProgram = await compileProgram(ClearProgram);

  // Build note to identify transaction later and required app args as Uint8Array
  let duration = algosdk.encodeUint64(convertMins(newLottery.duration));
  let ticketPrice = algosdk.encodeUint64(newLottery.ticketPrice);
  let appArgs = [duration, ticketPrice];
  let foreignApps = [];

  if (oldLottery.appId) {
    foreignApps.push(lottery.appId);
  }

  let txn = algosdk.makeApplicationCreateTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: compiledApprovalProgram,
    clearProgram: compiledClearProgram,
    numLocalInts: algo.numLocalInts,
    numLocalByteSlices: algo.numLocalBytes,
    numGlobalInts: algo.numGlobalInts,
    numGlobalByteSlices: algo.numGlobalBytes,
    note: note,
    appArgs: appArgs,
    foreignApps: foreignApps,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await algo.myAlgoConnect.signTransaction(txn.toByte());
  console.log("Signed transaction with txID: %s", txId);
  await algo.algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(
    algo.algodClient,
    txId,
    4
  );

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  // Get created application id and notify about completion
  let transactionResponse = await algo.algodClient
    .pendingTransactionInformation(txId)
    .do();
  let appId = transactionResponse["application-index"];
  console.log("Created new app-id: ", appId);
  return appId;
};

// START LOTTERY:
export const startLotteryAction = async (
  senderAddress,
  newLottery,
  oldLottery
) => {
  console.log("Starting Lottery...");

  let params = await algo.algodClient.getTransactionParams().do();

  // Build required app args as Uint8Array
  let startArg = new TextEncoder().encode("start");
  let appArgs = [startArg];

  let foreignApps = [];

  if (oldLottery.appId) {
    foreignApps.push(oldLottery.appId);
    params.fee = algosdk.ALGORAND_MIN_TX_FEE * 2;
    params.flatFee = true;
  }

  let amount = stringToMicroAlgos(1);

  // Create ApplicationCallTxn
  let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
    from: senderAddress,
    appIndex: newLottery.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params,
    appArgs: appArgs,
    foreignApps: foreignApps,
  });

  // Create PaymentTxn
  let paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: senderAddress,
    to: newLottery.appAddress,
    amount: amount,
    suggestedParams: params,
  });

  let txnArray = [appCallTxn, paymentTxn];

  // Create group transaction out of previously build transactions
  let groupID = algosdk.computeGroupID(txnArray);
  for (let i = 0; i < 2; i++) txnArray[i].group = groupID;

  // Sign & submit the group transaction
  let signedTxn = await algo.myAlgoConnect.signTransaction(
    txnArray.map((txn) => txn.toByte())
  );
  console.log("Signed group transaction");
  let tx = await algo.algodClient
    .sendRawTransaction(signedTxn.map((txn) => txn.blob))
    .do();

  // Wait for group transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(
    algo.algodClient,
    tx.txId,
    4
  );

  // Notify about completion
  console.log(
    "Group transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
};

// JOIN LOTTERY: OPT IN
export const joinLotteryAction = async (senderAddress, index) => {
  console.log("Opting in......");

  let params = await algo.algodClient.getTransactionParams().do();

  // Create ApplicationOptIn Transaction
  let txn = algosdk.makeApplicationOptInTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    appIndex: index,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await algo.myAlgoConnect.signTransaction(txn.toByte());
  console.log("Signed transaction with txID: %s", txId);
  await algo.algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  const confirmedTxn = await algosdk.waitForConfirmation(
    algo.algodClient,
    txId,
    4
  );

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
  // display results
  let transactionResponse = await algo.algodClient
    .pendingTransactionInformation(txId)
    .do();
  console.log("Opted-in to app-id:", transactionResponse["txn"]["txn"]["apid"]);
};

// BUY TICKETS: No op Action
export const buyTicketAction = async (senderAddress, lottery, noOfLottery) => {
  console.log("Buying Tickets...");

  let params = await algo.algodClient.getTransactionParams().do();

  let noOfLotteryArgs = algosdk.encodeUint64(noOfLottery);

  // Build required app args as Uint8Array
  let buyTicketArg = new TextEncoder().encode("buy");
  let appArgs = [buyTicketArg, noOfLotteryArgs];

  // Create ApplicationCallTxn
  let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
    from: senderAddress,
    appIndex: lottery.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params,
    appArgs: appArgs,
  });
  // Create PaymentTxn

  let paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: senderAddress,
    to: lottery.appAddress,
    amount: lottery.ticket_price * noOfLottery,
    suggestedParams: params,
  });

  let txnArray = [appCallTxn, paymentTxn];

  // Create group transaction out of previously build transactions
  let groupID = algosdk.computeGroupID(txnArray);
  for (let i = 0; i < 2; i++) txnArray[i].group = groupID;

  // Sign & submit the group transaction
  let signedTxn = await algo.myAlgoConnect.signTransaction(
    txnArray.map((txn) => txn.toByte())
  );
  console.log("Signed group transaction");
  let tx = await algo.algodClient
    .sendRawTransaction(signedTxn.map((txn) => txn.blob))
    .do();

  // Wait for group transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(
    algo.algodClient,
    tx.txId,
    4
  );

  // Notify about completion
  console.log(
    "Group transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
};

//END LOTTERY: No op call
export const endLotteryAction = async (senderAddress, lottery) => {
  console.log("Ending Lottery...");

  let params = await algo.algodClient.getTransactionParams().do();

  let amount = stringToMicroAlgos(1);

  // Build required app args as Uint8Array
  let endArg = new TextEncoder().encode("end");
  let appArgs = [endArg];

  // Create ApplicationCallTxn
  let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
    from: senderAddress,
    appIndex: lottery.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params,
    appArgs: appArgs,
    accounts: [lottery.starter, senderAddress, lottery.creatorAddress],
  });

  // Create PaymentTxn
  let paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: senderAddress,
    to: lottery.appAddress,
    amount: amount,
    suggestedParams: params,
  });

  let txnArray = [appCallTxn, paymentTxn];

  // Create group transaction out of previously build transactions
  let groupID = algosdk.computeGroupID(txnArray);
  for (let i = 0; i < 2; i++) txnArray[i].group = groupID;

  // Sign & submit the group transaction
  let signedTxn = await algo.myAlgoConnect.signTransaction(
    txnArray.map((txn) => txn.toByte())
  );
  console.log("Signed group transaction");
  let tx = await algo.algodClient
    .sendRawTransaction(signedTxn.map((txn) => txn.blob))
    .do();

  // Wait for group transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(
    algo.algodClient,
    tx.txId,
    4
  );

  // Notify about completion
  console.log(
    "Group transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
};

// CHECK IF WINNER: no_op_call
export const checkIfWinner = async (senderAddress, lottery) => {
  console.log("Running check...");

  let params = await algo.algodClient.getTransactionParams().do();

  // Build required app args as Uint8Array
  let checkArg = new TextEncoder().encode("check");
  let appArgs = [checkArg];

  // Create ApplicationCallTxn
  let txn = algosdk.makeApplicationCallTxnFromObject({
    from: senderAddress,
    appIndex: lottery.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params,
    appArgs: appArgs,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await algo.myAlgoConnect.signTransaction(txn.toByte());
  console.log("Signed transaction with txID: %s", txId);
  await algo.algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  const confirmedTxn = await algosdk.waitForConfirmation(
    algo.algodClient,
    txId,
    4
  );

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
};

// DELETE LOTTERY:
export const deleteLotteryAction = async (senderAddress, lottery) => {
  console.log("Deleting application");

  let params = await algo.algodClient.getTransactionParams().do();

  // Create ApplicationDeleteTxn
  let txn = algosdk.makeApplicationDeleteTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    appIndex: index,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await algo.myAlgoConnect.signTransaction(txn.toByte());
  console.log("Signed transaction with txID: %s", txId);
  await algo.algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  const confirmedTxn = await algosdk.waitForConfirmation(
    algo.algodClient,
    txId,
    4
  );

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  // Get application id of deleted application and notify about completion
  let transactionResponse = await algo.algodClient
    .pendingTransactionInformation(txId)
    .do();
  let appId = transactionResponse["txn"]["txn"].apid;
  console.log("Deleted app-id: ", appId);
};

// GET Lotteries: Using Indexer
export const getAuctionsAction = async (senderAddress) => {
  console.log("Fetching Lotteries...");
  let note = new TextEncoder().encode(algo.lotteryNote);
  let encodedNote = Buffer.from(note).toString("base64");

  // Step 1: Get all transactions by notePrefix (+ minRound filter for performance)
  let transactionInfo = await algo.indexerClient
    .searchForTransactions()
    .notePrefix(encodedNote)
    .txType("appl")
    .minRound(algo.minRound)
    .do();

  let lotteries = [];
  for (const transaction of transactionInfo.transactions) {
    let appId = transaction["created-application-index"];
    if (appId) {
      // Step 2: Get each application by application id
      let lottery = await getApplication(appId, senderAddress);
      if (lottery) {
        lotteries.push(lottery);
      }
    }
  }
  console.log("Lotteries Fetched...");
  return lotteries;
};

// Getting Lottery Data
const getApplication = async (appId, senderAddress) => {
  try {
    // 1. Get application by appId
    let response = await algo.indexerClient
      .lookupApplications(appId)
      .includeAll(true)
      .do();
    if (response.application.deleted) {
      return null;
    }

    // console.log(response.application);

    let globalState = response.application.params["global-state"];
    let appAddress = algosdk.getApplicationAddress(appId);
    let creatorAddress = response.application.params.creator;

    await read_local_state(senderAddress, appId);

    // 2. Parse fields of response and return product
    let lottery_duration = "";
    let lottery_start_time = "";
    let lottery_end_time = "";
    let total_no_of_players = "";
    let total_no_of_tickets = "";
    let ticket_price = "";
    let prize_pool = "";
    let status = "";
    let winning_ticket = "";
    let starter = "";
    let ender = "";
    let winner_reward = "";
    let next_lottery_fund = "";
    let prev_app = "";

    let user_id = "";
    let user_no_of_tickets = "";

    if (getField("DURATION", globalState) !== undefined) {
      lottery_duration = getField("PLAYERS", globalState).value.uint;
    }

    if (getField("START", globalState) !== undefined) {
      lottery_start_time = getField("PLAYERS", globalState).value.uint;
    }

    if (getField("END", globalState) !== undefined) {
      lottery_end_time = getField("PLAYERS", globalState).value.uint;
    }

    if (getField("PLAYERS", globalState) !== undefined) {
      total_no_of_players = getField("PLAYERS", globalState).value.uint;
    }

    if (getField("TICKETS", globalState) !== undefined) {
      total_no_of_tickets = getField("TICKETS", globalState).value.uint;
    }

    if (getField("STATUS", globalState) !== undefined) {
      status = getField("STATUS", globalState).value.uint;
    }

    if (getField("WINNINGTICKET", globalState) !== undefined) {
      winning_ticket = getField("WINNINGTICKET", globalState).value.uint;
    }

    if (getField("STARTER", globalState) !== undefined) {
      let field = getField("STARTER", globalState).value.bytes;
      if (field) {
        highest_bidder = algosdk.encodeAddress(Base64.toUint8Array(field));
      }
    }

    if (getField("ENDER", globalState) !== undefined) {
      let field = getField("ENDER", globalState).value.bytes;
      if (field) {
        highest_bidder = algosdk.encodeAddress(Base64.toUint8Array(field));
      }
    }

    if (getField("WINNERREWARD", globalState) !== undefined) {
      winner_reward = getField("WINNERREWARD", globalState).value.uint;
    }

    if (getField("PREVAPP", globalState) !== undefined) {
      prev_app = getField("AUCTIONEND", globalState).value.uint;
    }

    return new Lottery(
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
      winner_reward,
      next_lottery_fund,
      prev_app,
      user_id,
      user_no_of_tickets
    );
  } catch (err) {
    return null;
  }
};

//get local state
const read_local_state = async (senderAddress, appId) => {
  results = await algo.algodClient
    .accountApplicationInformation(senderAddress, appId)
    .do();

  console.log(results);
  // for local_state in results["apps-local-state"]:
  //     if local_state["id"] == app_id:
  //         if "key-value" not in local_state:
  //             return {}
  //         return format_state(local_state["key-value"])
  // return {}
};

const getField = (fieldName, globalState) => {
  return globalState.find((state) => {
    return state.key === utf8ToBase64String(fieldName);
  });
};

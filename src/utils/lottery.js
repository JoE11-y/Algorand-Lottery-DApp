import algosdk from "algosdk";
import * as algo from "./constants";
import { Base64 } from "js-base64";
/* eslint import/no-webpack-loader-syntax: off */
import ApprovalProgram from "!!raw-loader!../contracts/lottery_approval.teal";
import ClearProgram from "!!raw-loader!../contracts/lottery_clear.teal";
import { utf8ToBase64String, stringToMicroAlgos } from "./conversions";
import { dummyLottery } from "./constants";

export class Lottery {
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
    winner,
    next_lottery_fund,
    prev_app,
    user_id,
    user_no_of_tickets,
    user_is_winner
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
    this.winner = winner;
    this.next_lottery_fund = next_lottery_fund;
    this.prev_app = prev_app;
    this.user_id = user_id;
    this.user_no_of_tickets = user_no_of_tickets;
    this.user_is_winner = user_is_winner;
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
  newLotteryData,
  prevLottery
) => {
  console.log("Creating new Lottery...");

  let params = await algo.algodClient.getTransactionParams().do();

  // Compile Programs
  const compiledApprovalProgram = await compileProgram(ApprovalProgram);
  const compiledClearProgram = await compileProgram(ClearProgram);

  // Build note to identify transaction later and required app args as Uint8Array
  let duration = algosdk.encodeUint64(newLotteryData.duration);
  let ticketPrice = algosdk.encodeUint64(newLotteryData.ticketPrice);
  let note = new TextEncoder().encode(algo.lotteryNote);
  let appArgs = [duration, ticketPrice];
  let foreignApps = [prevLottery.appId];

  console.log(foreignApps);

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
export const startLotteryAction = async (senderAddress, newLottery) => {
  console.log("Starting Lottery...");

  let params = await algo.algodClient.getTransactionParams().do();

  // Build required app args as Uint8Array
  let startArg = new TextEncoder().encode("start");
  let appArgs = [startArg];

  let foreignApps = [newLottery.prev_app];

  if (newLottery.prev_app !== 0) {
    params.fee = algosdk.ALGORAND_MIN_TX_FEE * 2;
    params.flatFee = true;
  }

  console.log(params);

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
export const buyTicketAction = async (senderAddress, lottery, noOfTickets) => {
  console.log("Buying Tickets...");

  let params = await algo.algodClient.getTransactionParams().do();

  let noOfTicketsArgs = algosdk.encodeUint64(Number(noOfTickets));

  // Build required app args as Uint8Array
  let buyTicketArg = new TextEncoder().encode("buy");
  let appArgs = [buyTicketArg, noOfTicketsArgs];

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
    amount: lottery.ticket_price * noOfTickets,
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
export const checkIfWinnerAction = async (senderAddress, lottery) => {
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
export const deleteLotteryAction = async (senderAddress, index) => {
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
export const getLotteriesAction = async (senderAddress) => {
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

    let globalState = response.application.params["global-state"];
    // 2. Parse fields of response and return lottery
    let newLottery = JSON.parse(JSON.stringify(dummyLottery));

    newLottery.appId = appId;

    newLottery.appAddress = algosdk.getApplicationAddress(appId);

    newLottery.creatorAddress = response.application.params.creator;

    if (getField("DURATION", globalState) !== undefined) {
      newLottery.lottery_duration = getField(
        "DURATION",
        globalState
      ).value.uint;
    }

    if (getField("START", globalState) !== undefined) {
      newLottery.lottery_start_time = getField("START", globalState).value.uint;
    }

    if (getField("END", globalState) !== undefined) {
      newLottery.lottery_end_time = getField("END", globalState).value.uint;
    }

    if (getField("PLAYERS", globalState) !== undefined) {
      newLottery.total_no_of_players = getField(
        "PLAYERS",
        globalState
      ).value.uint;
    }

    if (getField("TICKETS", globalState) !== undefined) {
      newLottery.total_no_of_tickets = getField(
        "TICKETS",
        globalState
      ).value.uint;
    }

    if (getField("PRICE", globalState) !== undefined) {
      newLottery.ticket_price = getField("PRICE", globalState).value.uint;
    }

    if (getField("POOL", globalState) !== undefined) {
      newLottery.prize_pool = getField("POOL", globalState).value.uint;
    }

    if (getField("STATUS", globalState) !== undefined) {
      newLottery.status = getField("STATUS", globalState).value.uint;
    }

    if (getField("WINNINGTICKET", globalState) !== undefined) {
      newLottery.winning_ticket = getField(
        "WINNINGTICKET",
        globalState
      ).value.uint;
    }

    if (getField("STARTER", globalState) !== undefined) {
      let field = getField("STARTER", globalState).value.bytes;
      if (field) {
        newLottery.starter = algosdk.encodeAddress(Base64.toUint8Array(field));
      }
    }

    if (getField("ENDER", globalState) !== undefined) {
      let field = getField("ENDER", globalState).value.bytes;
      if (field) {
        newLottery.ender = algosdk.encodeAddress(Base64.toUint8Array(field));
      }
    }

    if (getField("WINNER", globalState) !== undefined) {
      let field = getField("WINNER", globalState).value.bytes;
      if (field) {
        newLottery.winner = algosdk.encodeAddress(Base64.toUint8Array(field));
      }
    }

    if (getField("NEXTLOTTERY", globalState) !== undefined) {
      newLottery.next_lottery_fund = getField(
        "NEXTLOTTERY",
        globalState
      ).value.uint;
    }

    if (getField("PREVAPP", globalState) !== undefined) {
      newLottery.prev_app = getField("PREVAPP", globalState).value.uint;
    }

    if (getField("WINNERREWARD", globalState) !== undefined) {
      newLottery.winner_reward = getField(
        "WINNERREWARD",
        globalState
      ).value.uint;
    }
    let userInfo = await algo.indexerClient
      .lookupAccountAppLocalStates(senderAddress)
      .do();

    let appLocalState = userInfo["apps-local-states"];
    for (let i = 0; i < appLocalState.length; i++) {
      if (appId === appLocalState[i]["id"]) {
        let localState = appLocalState[i]["key-value"];
        if (getField("ID", localState) !== undefined) {
          newLottery.user_id = getField("ID", localState).value.uint;
        }
        if (getField("TICKETCOUNT", localState) !== undefined) {
          newLottery.user_no_of_tickets = getField(
            "TICKETCOUNT",
            localState
          ).value.uint;
        }
        if (getField("ISWINNER", localState) !== undefined) {
          newLottery.user_is_winner = getField(
            "ISWINNER",
            localState
          ).value.uint;
        }
      }
    }
    return newLottery;
  } catch (err) {
    return null;
  }
};

const getField = (fieldName, State) => {
  return State.find((state) => {
    return state.key === utf8ToBase64String(fieldName);
  });
};

export function checkStatus(status, lotteryEndTime) {
  const now = new Date();
  const end = new Date(lotteryEndTime * 1000);

  if (status === 1 && lotteryEndTime !== 0 && now > end) {
    return "TIME EXHAUSTED, END LOTTERY TO GET LUCKY WINNER";
  } else {
    switch (status) {
      case 0: {
        return "START LOTTERY";
      }
      case 1: {
        return "LOTTERY IS ACTIVE";
      }
      case 2: {
        return "LOTTERY ENDED";
      }
      case 3: {
        return "WINNERS AWARDED, START NEW LOTTERY";
      }
      default: {
        return "CREATE NEW LOTTERY";
      }
    }
  }
}

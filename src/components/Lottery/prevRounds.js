import React, { useState } from "react";
import { getLottery, getPlayerTickets } from "../../utils/lottery";
import { convertTime } from "../../utils";
import { utils } from "near-api-js";
import Loader from "../ui/Loader";
import { init } from "../../utils/lottery";

const PrevRounds = ({
  playerId,
  prevLottery,
  previousLotteryPlayerTickets,
}) => {
  const [loading, setLoading] = useState(false);

  const _lottery = prevLottery.id ? prevLottery : init;

  const [lotteryId, setLotteryID] = useState(_lottery.id);

  const [lottery, setLottery] = useState(_lottery);

  const [playerTickets, setPlayerTicket] = useState(
    previousLotteryPlayerTickets
  );

  const previousLottery = async (e) => {
    setLoading(true);
    e.preventDefault();
    const lotteryID = lotteryId - 1;
    if (lotteryID < 1) {
      setLoading(false);
      return;
    }
    const result = await getLottery(lotteryID);
    const _playerTickets = await getPlayerTickets({
      id: lotteryID,
      playerId: playerId,
    });
    setLottery(result);
    setPlayerTicket(_playerTickets);
    setLotteryID(lotteryID);
    setLoading(false);
  };

  const nextLottery = async (e) => {
    setLoading(true);
    e.preventDefault();
    const lotteryID = lotteryId + 1;
    if (lotteryID > _lottery.id) {
      setLoading(false);
      return;
    }
    const result = await getLottery(lotteryID);
    const _playerTickets = await getPlayerTickets({
      id: lotteryID,
      playerId: playerId,
    });
    setPlayerTicket(_playerTickets);
    setLottery(result);
    setLotteryID(lotteryID);
    setLoading(false);
  };

  return (
    <>
      <div className="container">
        <div className="tabs-container header">
          <div className="tab">Lottery History</div>
        </div>
        <div className="lottery-container">
          {!loading ? (
            <>
              <div className="lottery-header">
                <div className="round-details">
                  <p>
                    <strong>ID: </strong>{" "}
                    <span className="round-num">{lotteryId}</span>
                  </p>
                  <div className="rounds-nav">
                    <a href="/#" onClick={previousLottery} className="prev">
                      &#8592;
                    </a>
                    <a href="/#" onClick={nextLottery} className="next">
                      &#8594;
                    </a>
                  </div>
                </div>
                <p>
                  <strong>Drawn: </strong> {convertTime(lottery.lotteryEndTime)}
                </p>
                <p>
                  <strong>Winner: </strong>
                  <a
                    href={`https://testnet.nearblocks.io/address/${lottery.winner}#transaction`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {lottery.winner}
                  </a>
                </p>
              </div>
              <div className="lottery-body">
                <p>
                  <strong>Price Per Ticket: </strong>{" "}
                  {utils.format.formatNearAmount(lottery.lotteryPrice)} NEAR
                </p>
                <p>
                  <strong>No of Tickets Sold: </strong>{" "}
                  {lottery.noOfTicketsSold}
                </p>
                <p>
                  <strong>Participants: </strong>
                  {lottery.noOfPlayers}
                </p>
                <p>
                  <strong>Prize: </strong>{" "}
                  {Number(
                    utils.format.formatNearAmount(lottery.amountInLottery)
                  ) / 2}{" "}
                  NEAR
                </p>
                <p>
                  <strong>Your Tickets: </strong>
                  {playerTickets}
                </p>
              </div>
            </>
          ) : (
            <Loader />
          )}
        </div>
      </div>
    </>
  );
};

export default PrevRounds;

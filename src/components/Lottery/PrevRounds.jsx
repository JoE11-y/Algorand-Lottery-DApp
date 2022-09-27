import React, { useState } from "react";
import Loader from "../ui/Loader";
import { Button } from "react-bootstrap";
import { convertTime, microAlgosToString } from "../../utils/conversions";

const PrevRounds = ({ Lotteries, checkIfWinner }) => {
  const [loading, setLoading] = useState(false);

  const [position, setPosition] = useState(Lotteries.length - 2);

  const [lottery, setLottery] = useState(Lotteries[position]);

  const userOptedIn = () => lottery.user_id !== 0;

  const previousLottery = async (e) => {
    setLoading(true);
    e.preventDefault();
    let newPosition = position - 1;
    if (newPosition < 0) {
      setLoading(false);
      return;
    }
    setLottery(Lotteries[newPosition]);
    setPosition(newPosition);
    setLoading(false);
  };

  const nextLottery = async (e) => {
    setLoading(true);
    e.preventDefault();
    let newPosition = position + 1;
    if (newPosition >= Lotteries.length - 1) {
      setLoading(false);
      return;
    }
    setLottery(Lotteries[newPosition]);
    setPosition(newPosition);
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
                    <span className="round-num">{lottery.appId}</span>
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
                  <strong>Drawn: </strong>{" "}
                  {convertTime(lottery.lottery_end_time)}
                </p>
                <p>
                  <strong>Winner: </strong>
                  {lottery.user_is_winner === 0 && userOptedIn()
                    ? "Check if you're the winner "
                    : lottery.user_is_winner === 2
                    ? "Congratulations You won "
                    : lottery.user_is_winner === 1
                    ? "Sorry You Lost "
                    : ""}{" "}
                  {(!userOptedIn() || lottery.user_is_winner !== 0) && (
                    <a
                      href={`https://testnet.algoexplorer.io/address/${lottery.winner}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Winner
                    </a>
                  )}
                </p>
              </div>
              <div className="lottery-body">
                <p>
                  <strong>Price Per Ticket: </strong>{" "}
                  {microAlgosToString(lottery.ticket_price)} ALGO
                </p>
                <p>
                  <strong>No of Tickets Sold: </strong>{" "}
                  {lottery.total_no_of_tickets}
                </p>
                <p>
                  <strong>Participants: </strong>
                  {lottery.total_no_of_players}
                </p>
                <p>
                  <strong>Prize: </strong>{" "}
                  {Number(microAlgosToString(lottery.winner_reward))} NEAR
                </p>
                <p>
                  <strong>Your Tickets: </strong>
                  {lottery.user_no_of_tickets}
                </p>
              </div>
              <div className="lottery-footer">
                {userOptedIn() && lottery.user_is_winner === 0 && (
                  <Button
                    variant="success"
                    className="check-if-winner"
                    onClick={() => checkIfWinner(lottery)}
                  >
                    Check if you won
                  </Button>
                )}
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

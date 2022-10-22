import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Button } from "react-bootstrap";
import PrevRounds from "./PrevRounds";
import BuyTicketForm from "./BuyTicketForm";
import NewLotteryForm from "./NewLotteryForm";
import Loader from "../ui/Loader";
import { NotificationSuccess, NotificationError } from "../ui/Notifications";
import * as lottery from "../../utils/lottery";
import { dummyLottery } from "../../utils/constants";
import { microAlgosToString, convertTime } from "../../utils/conversions";

const Lottery = ({ address, fetchBalance }) => {
  const [loading, setLoading] = useState(false);
  const [lotteries, setLotteries] = useState([]);
  const [currentLottery, setCurrentLottery] = useState({});
  const [open, openModal] = useState(false);
  const [open2, openModal2] = useState(false);

  const getLottery = useCallback(async () => {
    setLoading(true);
    lottery
      .getLotteriesAction(address)
      .then((lotteries) => {
        if (lotteries.length > 0) {
          setLotteries(lotteries);

          // get last lottery in array and set to current lottery
          let length = lotteries.length;
          if (length > 0) {
            let currentLottery = lotteries[lotteries.length - 1];
            // console.log(currentLottery);
            setCurrentLottery(currentLottery);
          }
        } else {
          let lottery = [];
          lottery.push(dummyLottery);
          setLotteries(lottery);
          setCurrentLottery(dummyLottery);
        }
      })
      .catch((error) => {
        console.log(error);
      })
      .finally((_) => {
        setLoading(false);
      });
  }, [address]);

  //  function to create Lottery
  const createNewLottery = async (newLotteryData, prevLottery) => {
    try {
      setLoading(true);
      await lottery.createLotteryAction(address, newLotteryData, prevLottery)
      toast(<NotificationSuccess text="New Lottery created successfully"/>);
      getLottery(address);
      fetchBalance(address);
    } catch (error) {
      console.log(error);
      toast(<NotificationError text="Failed to create new Lottery"/>);
      setLoading(false);
    }

  };

  //  function to start Lottery
  const startLottery = async (newLottery) => {
    try {
      setLoading(true);
      await lottery.startLotteryAction(address, newLottery)

      toast(<NotificationSuccess text="Lottery Started"/>);
      getLottery(address);
      fetchBalance(address);
    } catch (error) {
      console.log(error);
      toast(<NotificationError text="Failed to start Lottery"/>);
      setLoading(false);
    }

  };

  //  function to join Lottery
  const joinLottery = async (lotteryID) => {
    setLoading(true);
    lottery
      .joinLotteryAction(address, lotteryID)
      .then(() => {
        toast(<NotificationSuccess text="Lottery joined successfully" />);
        getLottery(address);
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to join Lottey" />);
        setLoading(false);
      });
  };

  //  function to buy ticket
  const buyTicket = async (_lottery, noOfTickets) => {
    setLoading(true);
    lottery
      .buyTicketAction(address, _lottery, noOfTickets)
      .then(() => {
        toast(<NotificationSuccess text="Tickets bought successfully" />);
        getLottery(address);
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to purchase Ticket" />);
        setLoading(false);
      });
  };

  //  function to join Lottery
  const endLottery = async (_lottery) => {
    setLoading(true);
    lottery
      .endLotteryAction(address, _lottery)
      .then(() => {
        toast(<NotificationSuccess text="Lottery closed" />);
        getLottery(address);
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to end Lottey" />);
        setLoading(false);
      });
  };

  //  function to join Lottery
  const checkIfWinner = async (_lottery) => {
    setLoading(true);
    lottery
      .checkIfWinnerAction(address, _lottery)
      .then(() => {
        toast(<NotificationSuccess text="Check completed" />);
        getLottery(address);
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Check failed" />);
        setLoading(false);
      });
  };

  const deleteLottery = async (_lottery) => {
    setLoading(true);
    lottery
      .deleteLotteryAction(address, _lottery.appId)
      .then(() => {
        toast(<NotificationSuccess text="Listing deleted successfully" />);
        getLottery(address);
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to delete listing." />);
        setLoading(false);
      });
  };

  const lotteryEnded = () => {
    let now = new Date();
    let lotteryEndTime = new Date(currentLottery.lottery_end_time * 1000);
    return now >= lotteryEndTime;
  };

  const checkLotteryStatus = (num) => currentLottery.status === num;

  const userOptedIn = () => currentLottery.user_id !== 0;

  const lotteryValid = () =>
    currentLottery.total_no_of_tickets > 5 &&
    currentLottery.total_no_of_players > 2;

  // handle Actions of the button
  const handleActions = async () => {
    if (
      currentLottery.appId === 0 ||
      (lotteryEnded() && (checkLotteryStatus(2) || checkLotteryStatus(3)))
    ) {
      // create new lottery if(appId is 0) or when lottery status is ended or lottery fund sent
      openModal2(true);
      return
    }
    if (checkLotteryStatus(0) && currentLottery.lottery_duration !== 0) {
      //start lottery when lottery status is 0 and lottery duration is more than 0
      startLottery(currentLottery);
      //deleteLottery(currentLottery);
      return
    }
    if (checkLotteryStatus(1) && !lotteryEnded()) {
      if (!userOptedIn()) {
        joinLottery(currentLottery.appId);
      } else {
        openModal(true);
      }
      return
    }

    if (checkLotteryStatus(1) && lotteryEnded()) {
      endLottery(currentLottery);
    }
  };

  // handle message on button
  // same checks as the handle action
  const handleMessage = () => {
    if (
      currentLottery.appId === 0 ||
      (lotteryEnded() && (checkLotteryStatus(2) || checkLotteryStatus(3)))
    ) {
      return "Create New Lottery";
    } else if (checkLotteryStatus(0) && currentLottery.lottery_duration !== 0) {
      return "Start Lottery";
    } else if (checkLotteryStatus(1) && !lotteryEnded()) {
      if (!userOptedIn()) {
        return "Join Lottery";
      } else {
        return "Buy Tickets";
      }
    } else if (checkLotteryStatus(1) && lotteryEnded()) {
      if (lotteryValid()) {
        return "End Lottery";
      } else {
        return "Restart Lottery";
      }
    }
  };

  useEffect(() => {
    getLottery(address);
  }, [address, getLottery]);

  return (
    <>
      {!loading ? (
        <>
          <div className="container">
            <div className="tabs-container header">
              {currentLottery.status !== 0 ? (
                <div className="tab">Current Lottery</div>
              ) : (
                <div className="tab">Lottery DApp will be starting soon..</div>
              )}
            </div>

            <div className="lottery-container">
              <div className="lottery-header">
                <div>
                  <p>
                    <strong>ID: </strong>{" "}
                    <span className="round-num">{currentLottery.appId}</span>
                  </p>
                  <p>
                    <strong>Status: </strong>{" "}
                    {lottery.checkStatus(
                      currentLottery.status,
                      currentLottery.lottery_end_time
                    )}
                  </p>
                  <p>
                    <strong>
                      {checkLotteryStatus(0)
                        ? "Lottery Duration: "
                        : checkLotteryStatus(1)
                        ? "Lottery Ends: "
                        : "Lottery Ended: "}
                    </strong>{" "}
                    {checkLotteryStatus(0)
                      ? `${currentLottery.lottery_duration / 60} Mins`
                      : convertTime(currentLottery.lottery_end_time)}
                  </p>
                  {lotteryEnded() && checkLotteryStatus(2) && userOptedIn() && (
                    <div className="winner">
                      <p>
                        <strong>Winner: </strong>
                        {currentLottery.user_is_winner === 0 && userOptedIn()
                          ? "Check if you're the winner "
                          : currentLottery.user_is_winner === 2
                          ? "Congratulations You won "
                          : currentLottery.user_is_winner === 1
                          ? "Sorry You Lost "
                          : ""}{" "}
                        {(!userOptedIn() ||
                          currentLottery.user_is_winner !== 0) && (
                          <a
                            href={`https://testnet.algoexplorer.io/address/${currentLottery.winner}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View Winner
                          </a>
                        )}
                      </p>
                      {currentLottery.user_is_winner === 0 && (
                        <div className="button-body">
                          {" "}
                          <Button
                            variant="success"
                            className="check-if-winner right"
                            onClick={() => checkIfWinner(currentLottery)}
                          >
                            Check
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="lottery-body">
                <p>
                  <strong>Price Per Ticket: </strong>{" "}
                  {currentLottery.ticket_price
                    ? Number(microAlgosToString(currentLottery.ticket_price))
                    : 0}{" "}
                  ALGO
                </p>
                <p>
                  <strong>No Of tickets Sold: </strong>
                  {currentLottery.total_no_of_tickets}
                </p>
                <p>
                  <strong>Participants: </strong>
                  {currentLottery.total_no_of_players}
                </p>
                <p>
                  <strong>Prize: </strong>{" "}
                  {currentLottery.winner_reward
                    ? Number(microAlgosToString(currentLottery.winner_reward))
                    : currentLottery.prize_pool
                    ? Number(microAlgosToString(currentLottery.prize_pool)) / 2
                    : 0}{" "}
                  ALGO
                </p>
                <p>
                  <strong>Your Tickets: </strong>
                  {currentLottery.user_no_of_tickets}
                </p>
              </div>
              <div className="lottery-footer">
                <Button
                  variant="success"
                  className="buy-lottery-btn"
                  onClick={() => handleActions()}
                >
                  {handleMessage()}
                </Button>
              </div>
            </div>
          </div>

          {lotteries.length > 1 && (
            <PrevRounds Lotteries={lotteries} checkIfWinner={checkIfWinner} />
          )}
        </>
      ) : (
        <Loader />
      )}

      {open && (
        <BuyTicketForm
          lottery={currentLottery}
          open={open}
          onClose={() => openModal(false)}
          buyTicket={buyTicket}
        />
      )}

      {open2 && (
        <NewLotteryForm
          lotteries={lotteries}
          open={open2}
          onClose={() => openModal2(false)}
          createNewLottery={createNewLottery}
        />
      )}
    </>
  );
};

export default Lottery;

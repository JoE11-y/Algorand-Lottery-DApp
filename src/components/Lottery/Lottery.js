import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Button } from "react-bootstrap";
import { utils } from "near-api-js";
import PrevRounds from "./prevRounds";
import BuyTicketForm from "./buyTicketForm";
import Loader from "../ui/Loader";
import { convertTime, checkStatus } from "../../utils";
import { NotificationSuccess, NotificationError } from "../ui/Notifications";
import * as lottery from "../../utils/lottery";
import { init } from "../../utils/lottery";

const Lottery = () => {
  const account = window.walletConnection.account();
  const [loading, setLoading] = useState(false);
  const [lotteryStatus, setLotteryStatus] = useState(0);
  const [currentId, setCurrentId] = useState(0);
  const [currLottery, setCurrLottery] = useState({});
  const [prevLottery, setPrevLottery] = useState({});
  const [ticketPrice, setTicketPrice] = useState(0);
  const [playerTickets, setPlayerTicket] = useState(0);
  const [previousLotteryPlayerTickets, setPreviousLotteryPlayerTickets] =
    useState(0);
  const [open, openModal] = useState(false);

  const updateLottery = useCallback(async () => {
    try {
      setLoading(true);
      const lotteryId = await lottery.getLotteryId();
      setCurrentId(lotteryId)
      const playerId = account.accountId;
      if (lotteryId > 1) {
        const prevLotteryID = lotteryId - 1;
        const prevLottery = await lottery.getLottery(prevLotteryID);
        const _playerTickets = await lottery.getPlayerTickets({
          id: prevLotteryID,
          playerId,
        });
        setPrevLottery(prevLottery);
        setPreviousLotteryPlayerTickets(_playerTickets);
      }
      const _lottery = await lottery.getLottery(lotteryId);
      const _playerTickets = await lottery.getPlayerTickets({
        id: lotteryId,
        playerId,
      });

      const status = await lottery.getLotteryStatus();
      setPlayerTicket(_playerTickets);
      setCurrLottery(_lottery ? _lottery : init);
      setTicketPrice(_lottery ? _lottery.lotteryPrice : 0);
      setLotteryStatus(status);
    } catch (e) {
      console.log({ e });
    } finally {
      setLoading(false);
    }
  }, [account]);

  //  function to initiate transaction
  const buyTicket = async (noOfTickets, totalAmount) => {
    try {
      await lottery
        .buyTicket({
          noOfTickets,
          totalAmount,
        })
        .then((resp) => {
          toast(<NotificationSuccess text="Tickets bought successfully" />);
          updateLottery();
        });
    } catch (error) {
      toast(<NotificationError text="Failed to purchase Ticket" />);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateLottery();
  }, [updateLottery]);

  return (
    <>
      {!loading ? (
        <>
          <div className="container">
            <div className="tabs-container header">
              {lotteryStatus !== 0 ?
                  <div className="tab">Current Lottery</div>
                  :
                  <div className="tab">Lottery dApp will be starting soon..</div>
              }
            </div>
              {lotteryStatus !== 0 &&
                  <div className="lottery-container">
                      <div className="lottery-header">
                          <div>
                              <p>
                                  <strong>ID: </strong> {currLottery.id}
                              </p>
                              <p>
                                  <strong>Lottery Ends: </strong>{" "}
                                  {convertTime(currLottery.lotteryEndTime)}
                              </p>
                              <p>
                                  <strong>Status: </strong>{" "}
                                  {checkStatus(lotteryStatus, currLottery.lotteryEndTime)}
                              </p>
                          </div>
                      </div>
                      <div className="lottery-body">
                          <p>
                              <strong>Price Per Ticket: </strong>{" "}
                              {currentId !== 0 ? utils.format.formatNearAmount(ticketPrice) : '-'} NEAR
                          </p>
                          <p>
                              <strong>No Of tickets Sold: </strong>
                              {currLottery.noOfTicketsSold}
                          </p>
                          <p>
                              <strong>Participants: </strong>
                              {currLottery.noOfPlayers}
                          </p>
                          <p>
                              <strong>Prize: </strong>{" "}
                              {Number(
                                  utils.format.formatNearAmount(currLottery.amountInLottery)
                              ) / 2}{" "}
                              NEAR
                          </p>
                          <p>
                              <strong>Your Tickets: </strong>
                              {playerTickets}
                          </p>
                      </div>
                    {(currentId !== 0 && new Date() <= currLottery.lotteryEndTime/1000000) &&
                        <div className="lottery-footer">
                          <Button
                              variant="success"
                              className="buy-lottery-btn"
                              onClick={() => openModal(true)}
                          >
                            Buy Ticket
                          </Button>
                        </div>
                    }
                  </div>
              }
          </div>

            {lotteryStatus !== 0 && currentId > 1 &&
                <PrevRounds
                    playerId={account.accountId}
                    prevLottery={prevLottery}
                    previousLotteryPlayerTickets={previousLotteryPlayerTickets}
                />
            }
        </>
      ) : (
        <Loader />
      )}
      {open && (
        <BuyTicketForm
          ticketPrice={ticketPrice}
          open={open}
          onClose={() => openModal(false)}
          buyTicket={buyTicket}
        />
      )}
    </>
  );
};

export default Lottery;

import React, { useCallback, useState } from "react";
import { Modal, Button, Form, FloatingLabel } from "react-bootstrap";
import { stringToMicroAlgos } from "../../utils/conversions";

const NewLotteryForm = ({ lotteries, open, onClose, createNewLottery }) => {
  const [duration, setDuration] = useState(0);
  const [ticketPrice, setTicketPrice] = useState(0);
  const isFormFilled = useCallback(() => {
    return duration > 0 && ticketPrice > 0;
  }, [duration, ticketPrice]);

  const handleClose = () => {
    onClose();
  };

  const formatDuration = (num) => {
    return num * 60;
  };

  function onSubmit(e) {
    e.preventDefault();
    if (!isFormFilled()) {
      return;
    }
    let length = lotteries.length;
    let newLotteryData = { duration, ticketPrice };

    // console.log(newLotteryData, lotteries[length - 1]);
    createNewLottery(newLotteryData, lotteries[length - 1]);

    setDuration(0);
    setTicketPrice(0);
    handleClose();
  }

  return (
    <Modal show={open} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>New Lottery</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={onSubmit}>
          <FloatingLabel
            controlId="inputPrice"
            label="Tickets Price"
            className="mb-3"
          >
            <Form.Control
              type="number"
              onChange={(e) => {
                setTicketPrice(stringToMicroAlgos(e.target.value));
              }}
              placeholder="Tickets Price"
            />
          </FloatingLabel>
          <FloatingLabel
            controlId="inputDuration"
            label="Duration in Minutes"
            className="mb-3"
          >
            <Form.Control
              type="number"
              onChange={(e) => {
                setDuration(formatDuration(e.target.value));
              }}
              placeholder="Duration in Minutes"
            />
          </FloatingLabel>
          <Modal.Footer>
            <Button variant="success" disabled={!isFormFilled()} type="submit">
              Create New Lottery
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default NewLotteryForm;

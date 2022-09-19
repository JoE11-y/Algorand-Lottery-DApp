import React, { useState } from "react";
import { Modal, Button, Form, FloatingLabel } from "react-bootstrap";
import { utils } from "near-api-js";
import BigNumber from "bignumber.js";

const BuyTicketForm = ({ ticketPrice, open, onClose, buyTicket }) => {
  const [amount, setAmount] = useState("");
  const [noOfTickets, setTicketNumber] = useState(0);
  const handleClose = () => {
    onClose();
  };

  function onChange(e) {
    const noOfTickets = e.target.value;
    const amounts = new BigNumber(ticketPrice)
      .multipliedBy(noOfTickets)
      .toNumber();
    if (isNaN(amounts)) {
      return;
    }
    setTicketNumber(noOfTickets);
    setAmount(amounts.toLocaleString("fullwide", { useGrouping: false }));
  }

  function onSubmit() {
    if (!noOfTickets) {
      return;
    }
    buyTicket(noOfTickets, amount);

    handleClose();
  }

  return (
    <Modal show={open} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Buy TIckets</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Ticket Price: {utils.format.formatNearAmount(ticketPrice)} NEAR</p>
        <p>You Pay: {utils.format.formatNearAmount(amount)} NEAR</p>
        <Form onSubmit={onSubmit}>
          <FloatingLabel
            controlId="floatingNoOfTickets"
            label="Number Of Tickets"
          >
            <Form.Control
              type="number"
              onChange={(e) => onChange(e)}
              placeholder="Number of Tickets"
            />
          </FloatingLabel>
          <Button variant="success" type="submit" disabled={!noOfTickets}>
            Pay Now
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default BuyTicketForm;

import React, { useState } from "react";
import { Modal, Button, Form, FloatingLabel } from "react-bootstrap";
import { microAlgosToString } from "../../utils/conversions";

const BuyTicketForm = ({ lottery, open, onClose, buyTicket }) => {
  const [amount, setAmount] = useState(0);
  const [noOfTickets, setTicketNumber] = useState(0);
  const handleClose = () => {
    onClose();
  };

  function onChange(e) {
    const noOfTickets = e.target.value;
    const amounts = microAlgosToString(lottery.ticket_price) * noOfTickets;
    setTicketNumber(noOfTickets);
    setAmount(amounts);
  }

  function onSubmit() {
    if (!noOfTickets) {
      return;
    }
    buyTicket(lottery, noOfTickets);

    handleClose();
  }

  return (
    <Modal show={open} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Buy TIckets</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Ticket Price: {microAlgosToString(lottery.ticket_price)} ALGO</p>
        <p>You Pay: {amount} ALGO</p>
        <Form onSubmit={onSubmit}>
          <FloatingLabel
            controlId="floatingNoOfTickets"
            label="Number Of Tickets"
            className="mb-3"
          >
            <Form.Control
              type="number"
              min={1}
              max={9}
              onChange={(e) => onChange(e)}
              placeholder="Number of Tickets"
            />
          </FloatingLabel>
          <Modal.Footer>
            <Button variant="success" type="submit" disabled={!noOfTickets}>
              Pay Now
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default BuyTicketForm;

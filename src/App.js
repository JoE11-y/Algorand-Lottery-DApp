import React, { useState } from "react";
import { Container, Nav } from "react-bootstrap";
import { indexerClient, myAlgoConnect } from "./utils/constants";
import { Notification } from "./components/ui/Notifications";
import Wallet from "./components/Wallet";
import Cover from "./components/ui/Cover";
import Lottery from "./components/Lottery/Lottery";
import coverImg from "./components/assets/img/balls.png";
import "./App.css";

const App = function AppWrapper() {
  const [address, setAddress] = useState(null);
  const [name, setName] = useState(null);
  const [balance, setBalance] = useState(0);

  const fetchBalance = async (accountAddress) => {
    indexerClient
      .lookupAccountByID(accountAddress)
      .do()
      .then((response) => {
        const _balance = response.account.amount;
        setBalance(_balance);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const connectWallet = async () => {
    myAlgoConnect
      .connect()
      .then((accounts) => {
        const _account = accounts[0];
        setAddress(_account.address);
        setName(_account.name);
        fetchBalance(_account.address);
      })
      .catch((error) => {
        console.log("Could not connect to MyAlgo wallet");
        console.error(error);
      });
  };

  const disconnect = () => {
    setAddress(null);
    setName(null);
    setBalance(null);
    window.location.reload();
  };

  return (
    <>
      <Notification />
      {address ? (
        <>
          <Container fluid="md" className="hero">
            <Nav className="justify-content-end pt-3 pb-5">
              <Nav.Item>
                {/*display user wallet*/}
                <Wallet
                  address={address}
                  name={name}
                  amount={balance}
                  disconnect={disconnect}
                  symbol={"ALGO"}
                />
              </Nav.Item>
            </Nav>
            <div className="header">
              <p className="title light">Algorand Lottery DApp</p>
              <p className="subtitle light">
                A lottery platform built on the Algorand Blockchain 🔦
              </p>
            </div>
            {/* display cover */}
          </Container>
          <Lottery address={address} fetchBalance={fetchBalance} />
        </>
      ) : (
        // display cover if user is not connected
        <Cover
          name="Algorand Lottery DApp"
          connect={connectWallet}
          coverImg={coverImg}
        />
      )}
    </>
  );
};

export default App;


[//]: # (</a>)

<h3 align="center">Algorand Lottery DApp</h3>

</div>

![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/cloudy.png)
 
A simple lottery contract that awards a lucky winner with a half of the generated prizepot.

The Lottery is controlled by anyone as everyone who has opted in can start and end the lottery, within is allocated time.

[link to dapp](https://JoE11-y.github.io/Algorand-Lottery-DApp)


## Prize Pool
Here's how prize money is distributed:
   - Lottery Winner (Lucky winner)                       - 50%

   - Lottery Creator (User who creates the new lottery)  - 5%

   - Lottery Starter (User who starts the lottery)       - 5%

   - Lottery Ender (User who ends the Lottery)           - 5%

   - Next Lottery (Prizepool of next lottery)            - 35% 



## Lottery Flow
-  Before a lottery session can be started, The Lottery application is first created, this is where the user inputs the duration in minutes and the price of the tickets for that session.

-  Now after creation, To start the lottery session, the user has to deposit 1 Algo as that is the minimum required amount for an application to be able to do transactions on it's own.

-  Next the user has to opt in, as before you can use this lottery (due to it being a stateful application) the user must subscribe to it.

-  After which the user is now able to buy tickets, until the lottery duration expires.

-  When session duration expires, and the end lottery function is called by any user (note: User must have opted in to lottery, and user pays 1 algo fee to end lottery) the lottery is subjected to checks to see if it's valid or not

        
         Minimum of 5 tickets and 2 Players
        

   - If Valid, then the prize pool is distributed and the lucky winning ticket position is generated, then the creator, starter and ender are rewarded.

   - If not Valid, then the lottery end time is reset using the duration provided by the lottery creator.

- Finally after the lottery session is over, user's can then check to see if they possess the winning ticket and whoever finds it, triggers the function that sends the reward to him.

- On next lottery restart the lottery itself calls the previous lottery and requests for the fund allocated for it.

## Notice
- Due to the Dynamic cost of storing ticket positions in their respective bit slots, we reduced the number of tickets a player can buy at a time to 9 tickets (fills nine slots) as this is the limit of the opcode cost for a transaction, more updates will be provided, kindly accept our make shift fix for the lottery.
- Also make sure you have enough algos in your wallet, as ticket purchases can fail due to insufficient free algo, as the ones in your wallet, may already be used to store a local state variable or global state variable (for app creators).

## 1. Tech Stack
This boilerplate uses the following tech stack:
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces.
- [algosdk](https://algorand.github.io/js-algorand-sdk/modules.html) - A frontend library for interacting with the Algorand Blockchain.
- [Bootstrap](https://getbootstrap.com/) - A CSS framework that provides responsive, mobile-first layouts.


<!-- GETTING STARTED -->

## :point_down: Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) v16.xx.x

### Run locally

1. Clone repo
   ```sh
   git clone https://github.com/JoE11-y/Algorand-Lottery-DApp.git
   ```

2. Install packages
   ```sh
   npm install
   ```
3. Run application
   ```sh
   npm start
   ```
4. Open development server on http://localhost:3000

<p align="right">(<a href="#top">back to top</a>)</p>


![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/cloudy.png)

## :computer: Development: Connect to testnet wallet
- Create account on testnet using [MyAlgo Wallet](https://wallet.myalgo.com/)
- Add funds using [faucet](https://bank.testnet.algorand.network/)
- Start app, click "Connect Wallet" and use MyAlgo Wallet UI to connect testnet wallet


<p align="right">(<a href="#top">back to top</a>)</p>


![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/cloudy.png)


<!-- CONTRIBUTING -->

## :writing_hand: Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any
contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also
simply open an issue with the tag "enhancement". Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#top">back to top</a>)</p>


![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/cloudy.png)


<!-- LICENSE -->

## :policeman: License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>



![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/cloudy.png)

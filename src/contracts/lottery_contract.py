from pyteal import *
from util import *


class Lottery:
    class Global_Variables:  # Total of 16 global ints, 3 global bytes
        lottery_duration = Bytes("DURATION")  # Lottery duration // uint64
        lottery_start_time = Bytes("START")  # Lottery starttime // uint64
        lottery_end_time = Bytes("END")  # Lottery end time // uint64
        total_no_of_players = Bytes("PLAYERS")  # no of players // uint64
        total_no_of_tickets = Bytes("TICKETS")  # no of tickets // uint64
        price = Bytes("PRICE")  # Lottery ticket price // uint64
        prizepool = Bytes("POOL")  # Lottery pool // uint64

        # Lottery status
        # (0 not started, 1 started, 2 ended, 3 next lottery funds sent) // uint64
        status = Bytes("STATUS")

        winning_ticket = Bytes("WINNINGTICKET")  # Winning Ticket ID // uint64
        starter = Bytes("STARTER")  # Lottery starter address // Bytes
        ender = Bytes("ENDER")  # Lottery ender address // Bytes

        winner = Bytes("WINNER")  # wWinner Address // Bytes

        # pool money allocated for winner // uint64
        winner_reward = Bytes("WINNERREWARD")

        # pool money allocated for next lottery // uint64
        next_lottery_fund = Bytes("NEXTLOTTERY")

        # param to show if prev lottery existed on creation
        prev_app = Bytes("PREVAPP")

        # pseudo random generator parameters (linear congruential generator)
        multiplier = Bytes("a")  # // uint64
        increment = Bytes("c")  # // uint64
        modulus = Bytes("m")  # // uint64
        seed = Bytes("x")  # // uint64

    class Local_Variables:  # Total of 3 local ints, 13 local bytes
        id = Bytes("ID")  # user Id // uint64
        no_of_tickets = Bytes("TICKETCOUNT")  # no of tickets bought // uint64

        # each ticket array can store up to 1000 tickets positions, hence we have a possible size of 13000 buyable tickets positions for each Lottery.
        # but each player is capped at 1000 tickets.

        # tickets position array for ticket numbers (0 - 999) is stored in Bytes("0")
        # tickets position array for ticket numbers (1000 - 1999) is stored in  Bytes("1")
        # tickets position array for ticket numbers (2000 - 2999) is stored in  Bytes("2")
        # ..
        # ..
        # ..
        # tickets position array for ticket numbers (12000 - 12999) is stored in Bytes("12")

        # if user is winner (2) or not (1) // uint64
        is_winner = Bytes("ISWINNER")

    class AppMethods:
        start_lottery = Bytes("start")
        buy_ticket = Bytes("buy")
        end_lottery = Bytes("end")
        check_if_winner = Bytes("check")
        fund_next_lottery = Bytes("fund")

    def create_new_lottery(self):
        # no of params lotteryInterval, ticketPrice
        return Seq(
            [
                # check rekey for both transactions
                check_rekey_zero(1),
                Assert(
                    And(
                        # check note attached is valid
                        Txn.note() == Bytes("algorandlottery:uv2"),
                        # check the number of arguments passed is 2, lotteryDuration, ticketPrice
                        Txn.application_args.length() == Int(2),
                        # check that the duration is greater than 0
                        Btoi(Txn.application_args[0]) != Int(0),
                        # check that the ticketPrice is greater than 0
                        Btoi(Txn.application_args[1]) > Int(0),
                        Txn.applications.length() == Int(1),
                    )
                ),
                # store value of previous app
                App.globalPut(self.Global_Variables.prev_app, Txn.applications[1]),
                # store variables
                App.globalPut(
                    self.Global_Variables.lottery_duration,
                    Btoi(Txn.application_args[0]),
                ),
                App.globalPut(
                    self.Global_Variables.price, Btoi(Txn.application_args[1])
                ),
                App.globalPut(self.Global_Variables.total_no_of_players, Int(0)),
                App.globalPut(self.Global_Variables.total_no_of_tickets, Int(0)),
                App.globalPut(self.Global_Variables.prizepool, Int(0)),
                App.globalPut(self.Global_Variables.status, Int(0)),
                # init random gen parameters with zxsprectum values
                App.globalPut(self.Global_Variables.multiplier, Int(75)),
                App.globalPut(self.Global_Variables.increment, Int(74)),
                App.globalPut(
                    self.Global_Variables.modulus, Int(65537)
                ),  # (1<<16)+1 or 2^16+1
                App.globalPut(self.Global_Variables.seed, Int(28652)),
                Approve(),
            ]
        )

    # checks prev contract for seed, if present update
    def get_seed_from_prev_lottery(self, prev_lottery: Expr):
        get_seed = App.globalGetEx(prev_lottery, Bytes("x"))
        return Seq(
            [
                get_seed,
                If(get_seed.hasValue()).Then(
                    Seq(
                        App.globalPut(self.Global_Variables.seed, get_seed.value()),
                    )
                ),
            ]
        )

    # Contract to contract call to trigger funds send to this contract
    def retrieve_funds(self, prev_lottery: Expr):
        return Seq(
            # initiate transaction to trigger fund sends
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields(
                {
                    TxnField.type_enum: TxnType.ApplicationCall,
                    TxnField.application_id: prev_lottery,
                    TxnField.on_completion: OnComplete.NoOp,
                    TxnField.application_args: [self.AppMethods.fund_next_lottery],
                    TxnField.accounts: [Global.current_application_address()],
                    TxnField.fee: Int(0),
                }
            ),
            InnerTxnBuilder.Submit(),
        )

    # Update prize pool
    def update_prize_pool(self, prev_lottery: Expr):
        # get the amount allocated for the next lottery from the previous lottery
        lottery_pool = App.globalGetEx(prev_lottery, Bytes("NEXTLOTTERY"))
        return Seq(
            lottery_pool,
            # check for funds and update current lottery pool
            If(
                lottery_pool.hasValue(),
                App.globalPut(self.Global_Variables.prizepool, lottery_pool.value()),
                App.globalPut(self.Global_Variables.prizepool, Int(0)),
            ),
        )

    def start_lottery(self):
        # function to deposit at least 1 algo to the contract and start lottery
        lottery_duration = App.globalGet(self.Global_Variables.lottery_duration)

        prev_app = App.globalGet(self.Global_Variables.prev_app)

        valid_app_id = And(
            prev_app != Int(0),
            Txn.applications[1] == prev_app,
        )

        return Seq(
            [
                # check rekey for both transactions
                check_rekey_zero(2),
                Assert(
                    And(
                        # check that the number of transactions within the group transaction is 2.
                        # because of the payment
                        Global.group_size() == Int(2),
                        # check that this transaction is ahead of the payment transaction
                        Txn.group_index() == Int(0),
                        # checks for payment transaction
                        Gtxn[1].type_enum() == TxnType.Payment,
                        Gtxn[1].receiver() == Global.current_application_address(),
                        Gtxn[1].close_remainder_to() == Global.zero_address(),
                        Gtxn[1].amount() >= Int(1000000),
                        Gtxn[1].sender() == Gtxn[0].sender(),
                        # check app array is passed
                        Txn.applications.length() == Int(1),
                    )
                ),
                # set start time and end time
                App.globalPut(
                    self.Global_Variables.lottery_start_time, Global.latest_timestamp()
                ),
                App.globalPut(
                    self.Global_Variables.lottery_end_time,
                    Global.latest_timestamp() + lottery_duration,
                ),
                # store address of starter
                App.globalPut(self.Global_Variables.starter, Txn.sender()),
                App.globalPut(self.Global_Variables.status, Int(1)),
                # check if prev app was passed in and update accordingly
                If(valid_app_id).Then(
                    Seq(
                        [
                            # require first transaction fee to cover:
                            # - own transaction fee && payment transaction fee
                            # - funds retrieval transaction fee
                            Assert(Txn.fee() >= Global.min_txn_fee() * Int(2)),
                            # uppdate random gen parameters with the last values from the previous lottery
                            self.get_seed_from_prev_lottery(Txn.applications[1]),
                            # run money grab to get the rest of prizepool money from the previous lottery
                            self.retrieve_funds(Txn.applications[1]),
                            # update the prize pool
                            self.update_prize_pool(Txn.applications[1]),
                        ]
                    )
                ),
                Approve(),
            ]
        )

    # opt in function

    def join_lottery(self):
        no_of_players = ScratchVar(TealType.uint64)

        return Seq(
            [
                Assert(
                    And(
                        # check to see if lottery has started
                        Global.latest_timestamp()
                        < App.globalGet(self.Global_Variables.lottery_end_time),
                        # check lottery status
                        App.globalGet(self.Global_Variables.status) == Int(1),
                        # check if ticket's space hasn't been exhausted
                        App.globalGet(self.Global_Variables.total_no_of_tickets)
                        < Int(13000),
                    )
                ),
                no_of_players.store(
                    App.globalGet(self.Global_Variables.total_no_of_players)
                ),
                App.localPut(
                    Txn.accounts[0],
                    self.Local_Variables.id,
                    (no_of_players.load() + Int(1)),
                ),
                # update no of players
                App.globalPut(
                    self.Global_Variables.total_no_of_players,
                    (no_of_players.load() + Int(1)),
                ),
                # initialize ticket count as 0
                App.localPut(
                    Txn.accounts[0], self.Local_Variables.no_of_tickets, Int(0)
                ),
                # initialize is winner as 0
                App.localPut(Txn.accounts[0], self.Local_Variables.is_winner, Int(0)),
                Approve(),
            ]
        )

    def get_rand_number(self):
        # x = (a*x + c) % m
        random_number = (
            (
                App.globalGet(self.Global_Variables.multiplier)
                * App.globalGet(self.Global_Variables.seed)
            )
            + App.globalGet(self.Global_Variables.increment)
        ) % App.globalGet(self.Global_Variables.modulus)
        return Seq([App.globalPut(self.Global_Variables.seed, random_number)])

    def buy_ticket(self):
        # arguments, arg 0 is buy tag, second arg is the amount of tickets
        old_total_tickets = ScratchVar(TealType.uint64)
        new_total_tickets = ScratchVar(TealType.uint64)
        player_existing_ticket_count = ScratchVar(TealType.uint64)
        prizepool = ScratchVar(TealType.uint64)
        no_of_tickets = Txn.application_args[1]

        return Seq(
            [
                # check rekey for both transactions
                check_rekey_zero(2),
                Assert(
                    And(
                        # check that user has opted in
                        # Txn.applications[0], which points to the first application in the application list
                        # Txn.accounts[0], pointing to current account
                        App.optedIn(Txn.accounts[0], Txn.applications[0]),
                        # check that the number of transactions within the group transaction is 2.
                        # because of the payment
                        Global.group_size() == Int(2),
                        # check that this transaction is ahead of the payment transaction
                        Txn.group_index() == Int(0),
                        # check the number of arguments passed is 2
                        Txn.application_args.length() == Int(2),
                        # check to see if lottery has not  ended
                        Global.latest_timestamp()
                        < App.globalGet(self.Global_Variables.lottery_end_time),
                        # check lottery status
                        App.globalGet(self.Global_Variables.status) == Int(1),
                        # check that user hasn't bought more than 1000 tickets
                        App.localGet(
                            Txn.accounts[0], self.Local_Variables.no_of_tickets
                        )
                        <= Int(1000),
                        # check if ticket's space hasn't been exhausted
                        App.globalGet(self.Global_Variables.total_no_of_tickets)
                        < Int(13000),
                        # check that the amount of tickets to be bought is less than or equal to 100 tickets. Max at a time
                        Btoi(no_of_tickets) <= Int(100),
                        # checks for the payment transaction
                        Gtxn[1].type_enum() == TxnType.Payment,
                        Gtxn[1].receiver() == Global.current_application_address(),
                        Gtxn[1].close_remainder_to() == Global.zero_address(),
                        Gtxn[1].amount()
                        == App.globalGet(self.Global_Variables.price)
                        * Btoi(no_of_tickets),
                        Gtxn[1].sender() == Gtxn[0].sender(),
                    )
                ),
                old_total_tickets.store(
                    App.globalGet(self.Global_Variables.total_no_of_tickets)
                ),
                new_total_tickets.store(old_total_tickets.load() + Btoi(no_of_tickets)),
                # get the existing user ticket count
                player_existing_ticket_count.store(
                    App.localGet(Txn.accounts[0], self.Local_Variables.no_of_tickets)
                ),
                # Loop to update users ticket
                For(
                    Ticket.ticket_posn.store(old_total_tickets.load()),
                    Ticket.ticket_posn.load() < new_total_tickets.load(),
                    Ticket.ticket_posn.store(Ticket.ticket_posn.load() + Int(1)),
                ).Do(
                    # get array key, ticket byte position and ticket bit position
                    Ticket.store_key_byte_bit,
                    # convert array key to string
                    Ticket.ticket_array_key_as_string.store(
                        convert_uint_to_bytes(Ticket.ticket_array_key.load())
                    ),
                    # check if array key already exists
                    Ticket.ticket_array_key_has_value,
                    # get array
                    Ticket.initialise_array,
                    # fill ticket position for player
                    App.localPut(
                        Txn.accounts[0],
                        Ticket.ticket_array_key_as_string.load(),
                        SetByte(
                            Ticket.curr_ticket_array,
                            Ticket.ticket_byte_posn.load(),
                            SetBit(
                                GetByte(
                                    Ticket.curr_ticket_array,
                                    Ticket.ticket_byte_posn.load(),
                                ),
                                Ticket.ticket_bit_posn.load(),
                                Int(1),
                            ),
                        ),
                    ),
                ),
                # update player existing ticket count
                App.localPut(
                    Txn.accounts[0],
                    self.Local_Variables.no_of_tickets,
                    (player_existing_ticket_count.load() + Btoi(no_of_tickets)),
                ),
                # update the total amount of tickets
                App.globalPut(
                    self.Global_Variables.total_no_of_tickets, new_total_tickets.load()
                ),
                # update the prizepool amount
                prizepool.store(App.globalGet(self.Global_Variables.prizepool)),
                App.globalPut(
                    self.Global_Variables.prizepool,
                    (prizepool.load() + Gtxn[1].amount()),
                ),
                # run random number generator
                self.get_rand_number(),
                Approve(),
            ]
        )

    def end_lottery(self):
        lottery_valid = And(
            App.globalGet(self.Global_Variables.total_no_of_tickets) >= Int(5),
            App.globalGet(self.Global_Variables.total_no_of_players) >= Int(2),
        )

        win_ticket = App.globalGet(self.Global_Variables.seed) % App.globalGet(
            self.Global_Variables.total_no_of_tickets
        )

        calc_starter_n_ender_n_creator_rewards = (
            App.globalGet(self.Global_Variables.prizepool) * Int(5) / Int(100)
        )

        calc_winner_reward = (
            App.globalGet(self.Global_Variables.prizepool) * Int(50) / Int(100)
        )

        calc_next_lottery_fund = (
            App.globalGet(self.Global_Variables.prizepool) * Int(35) / Int(100)
        )

        rewards = ScratchVar(TealType.uint64)

        prize_pool_amount = ScratchVar(TealType.uint64)

        lottery_duration = ScratchVar(TealType.uint64)
        return Seq(
            [
                # check rekey for both transactions
                Assert(
                    And(
                        # check that user has opted in or that lottery_session is not valid
                        # Txn.applications[0], which points to the first application in the application list
                        # Txn.accounts[0], pointing to current account
                        Or(
                            App.optedIn(Txn.accounts[0], Txn.applications[0]),
                            lottery_valid == Int(0),
                        ),
                        # check to see if lottery session has ended
                        Global.latest_timestamp()
                        > App.globalGet(self.Global_Variables.lottery_end_time),
                    )
                ),
                If(lottery_valid)
                .Then(
                    Seq(
                        check_rekey_zero(2),
                        Assert(
                            And(
                                # If lottery is valid, check that the payment transaction is attached to the noOp transaction
                                # check that the number of transactions within the group transaction is 2.
                                Global.group_size() == Int(2),
                                # check that this transaction is ahead of the payment transaction
                                Txn.group_index() == Int(0),
                                # check that the Txn.accounts array
                                # contains the address of the lottery starter, ender and creator address
                                Txn.accounts.length() == Int(3),
                                # checks for second transaction which is to pay 1 algo
                                Gtxn[1].type_enum() == TxnType.Payment,
                                Gtxn[1].receiver()
                                == Global.current_application_address(),
                                Gtxn[1].close_remainder_to() == Global.zero_address(),
                                Gtxn[1].amount() >= Int(1000000),
                            )
                        ),
                        # get random number,
                        self.get_rand_number(),
                        # get and store winning Ticket
                        App.globalPut(self.Global_Variables.winning_ticket, win_ticket),
                        # calculate rewards
                        rewards.store(calc_starter_n_ender_n_creator_rewards),
                        App.globalPut(
                            self.Global_Variables.winner_reward, calc_winner_reward
                        ),
                        App.globalPut(
                            self.Global_Variables.next_lottery_fund,
                            calc_next_lottery_fund,
                        ),
                        # send funds to starter, ender and creator address
                        send_funds(Txn.accounts[1], rewards.load()),
                        send_funds(Txn.accounts[2], rewards.load()),
                        send_funds(Txn.accounts[3], rewards.load()),
                        # update amount in prizepool after removing the ender and starter rewards
                        prize_pool_amount.store(
                            App.globalGet(self.Global_Variables.prizepool)
                        ),
                        App.globalPut(
                            self.Global_Variables.prizepool,
                            (prize_pool_amount.load() - (rewards.load() * Int(3))),
                        ),
                        # update lottery status to ended which is 2
                        App.globalPut(self.Global_Variables.status, Int(2)),
                    )
                )
                .Else(
                    check_rekey_zero(1),
                    Seq(
                        # Reset the lottery time
                        lottery_duration.store(
                            App.globalGet(self.Global_Variables.lottery_duration)
                        ),
                        App.globalPut(
                            self.Global_Variables.lottery_end_time,
                            (Global.latest_timestamp() + lottery_duration.load()),
                        ),
                    ),
                ),
                Approve(),
            ]
        )

    def check_if_winner(self):

        is_winner = ScratchVar(TealType.uint64)
        winners_reward = ScratchVar(TealType.uint64)

        return Seq(
            [
                Assert(
                    And(
                        # check that user has opted in
                        # Txn.applications[0], which points to the first application in the application list
                        # Txn.accounts[0], pointing to current account
                        App.optedIn(Txn.accounts[0], Txn.applications[0]),
                        # check to see if lottery session has ended
                        Global.latest_timestamp()
                        > App.globalGet(self.Global_Variables.lottery_end_time),
                        # check to see if lottery status has been set to 2, meaning lottery ended
                        App.globalGet(self.Global_Variables.status) == Int(2),
                        # check that user hasn't entered this function already
                        App.localGet(Txn.accounts[0], self.Local_Variables.is_winner)
                        == Int(0),
                    )
                ),
                # store winning ticket position
                Ticket.ticket_posn.store(
                    App.globalGet(self.Global_Variables.winning_ticket)
                ),
                # get ticket array key, ticket byte position and ticket bit position of winning ticket position
                Ticket.store_key_byte_bit,
                # convert to string
                Ticket.ticket_array_key_as_string.store(
                    convert_uint_to_bytes(Ticket.ticket_array_key.load())
                ),
                # check if ticket array for user already exists
                Ticket.ticket_array_key_has_value,
                # get array
                Ticket.initialise_array,
                # check if winning ticket exists on player's records
                is_winner.store(
                    GetBit(
                        GetByte(
                            Ticket.curr_ticket_array, Ticket.ticket_byte_posn.load()
                        ),
                        Ticket.ticket_bit_posn.load(),
                    )
                ),
                If(is_winner.load() == Int(1)).Then(
                    Seq(
                        winners_reward.store(
                            App.globalGet(self.Global_Variables.winner_reward)
                        ),
                        # send the reward
                        send_funds(Txn.accounts[0], winners_reward.load()),
                        # store winners address
                        App.globalPut(self.Global_Variables.winner, Txn.sender()),
                    )
                ),
                # update local variables
                App.localPut(
                    Txn.accounts[0],
                    self.Local_Variables.is_winner,
                    is_winner.load() + Int(1),
                ),
                Approve(),
            ]
        )

    def fund_next_lottery(self):
        prize_pool_amount = ScratchVar(TealType.uint64)
        next_lottery_fund = ScratchVar(TealType.uint64)
        return Seq(
            [
                Assert(
                    And(
                        # check that an next lottery address is passed in
                        Txn.accounts.length() == Int(1),
                        # check that this lottery has ended,
                        App.globalGet(self.Global_Variables.status) == Int(2),
                        # check that prizepool contains more than 1 algo
                        App.globalGet(self.Global_Variables.prizepool) > Int(1000000),
                        # check that the balance of this lottery is more than 1 algo too
                        Balance(Global.current_application_address()) > Int(1000000),
                    )
                ),
                prize_pool_amount.store(App.globalGet(self.Global_Variables.prizepool)),
                next_lottery_fund.store(
                    App.globalGet(self.Global_Variables.next_lottery_fund)
                ),
                # send the funds
                send_funds(Txn.accounts[1], next_lottery_fund.load()),
                # Update amount in lottery after sending next lottery fun
                App.globalPut(
                    self.Global_Variables.prizepool,
                    (prize_pool_amount.load() - next_lottery_fund.load()),
                ),
                # update lottery status to paid out which is 3
                App.globalPut(self.Global_Variables.status, Int(3)),
                Approve(),
            ]
        )

    def application_deletion(self):
        return Return(
            And(
                # user is creator
                Txn.sender() == Global.creator_address(),
                # lottery not started or completely ended
                Or(
                    App.globalGet(self.Global_Variables.status) == Int(0),
                    App.globalGet(self.Global_Variables.status) == Int(3),
                ),
            )
        )

    def application_start(self):
        return Cond(
            [
                # starts the lottery
                Txn.application_id() == Int(0),
                self.create_new_lottery(),
            ],
            [
                # DeletesApplication
                Txn.on_completion() == OnComplete.DeleteApplication,
                self.application_deletion(),
            ],
            [
                # Opts in
                Txn.on_completion() == OnComplete.OptIn,
                self.join_lottery(),
            ],
            # NoOp Transactions checks for first args
            [
                # start lottery
                Txn.application_args[0] == self.AppMethods.start_lottery,
                self.start_lottery(),
            ],
            [
                # buy tickets
                Txn.application_args[0] == self.AppMethods.buy_ticket,
                self.buy_ticket(),
            ],
            [
                # end lottery
                Txn.application_args[0] == self.AppMethods.end_lottery,
                self.end_lottery(),
            ],
            [
                # check if winner
                Txn.application_args[0] == self.AppMethods.check_if_winner,
                self.check_if_winner(),
            ],
            [
                # transfer funds to next lottery
                Txn.application_args[0] == self.AppMethods.fund_next_lottery,
                self.fund_next_lottery(),
            ],
        )

    def approval_program(self):
        return self.application_start()

    # Actions to be taken when users remove contract from their balance record.
    def clear_program(self):
        return Return(Int(1))

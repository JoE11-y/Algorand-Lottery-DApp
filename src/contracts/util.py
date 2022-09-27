from pyteal import *


# convert uint to bytes
@Subroutine(TealType.bytes)
def convert_uint_to_bytes(arg):

    string = ScratchVar(TealType.bytes)
    num = ScratchVar(TealType.uint64)
    digit = ScratchVar(TealType.uint64)

    return If(
        arg == Int(0),
        Bytes("0"),
        Seq(
            [
                string.store(Bytes("")),
                For(
                    num.store(arg), num.load() > Int(0), num.store(num.load() / Int(10))
                ).Do(
                    Seq(
                        [
                            digit.store(num.load() % Int(10)),
                            string.store(
                                Concat(
                                    Substring(
                                        Bytes("0123456789"),
                                        digit.load(),
                                        digit.load() + Int(1),
                                    ),
                                    string.load(),
                                )
                            ),
                        ]
                    )
                ),
                string.load(),
            ]
        ),
    )


#  verify that the RekeyTo property of any transaction is set to the ZeroAddress
def check_rekey_zero(
    num_transactions: int,
):
    return Assert(
        And(
            *[
                Gtxn[i].rekey_to() == Global.zero_address()
                for i in range(num_transactions)
            ]
        )
    )


@Subroutine(TealType.none)
def send_funds(account: Expr, amount: Expr):
    return Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.Payment,
                TxnField.receiver: account,
                TxnField.amount: amount,
            }
        ),
        InnerTxnBuilder.Submit(),
    )


class Ticket:
    ticket_array_key = ScratchVar(TealType.uint64)
    ticket_array_key_as_string = ScratchVar(TealType.bytes)
    ticket_byte_posn = ScratchVar(TealType.uint64)
    ticket_bit_posn = ScratchVar(TealType.uint64)

    ticket_posn = ScratchVar(TealType.uint64)

    store_key_byte_bit = Seq(
        [
            Seq(
                [
                    ticket_array_key.store(ticket_posn.load() / Int(1000)),
                    ticket_byte_posn.store((ticket_posn.load() % Int(1000)) / Int(8)),
                    ticket_bit_posn.store((ticket_posn.load() % Int(1000)) % Int(8)),
                ]
            )
        ]
    )

    ticket_array_key_has_value = App.localGetEx(
        Txn.accounts[0], Txn.applications[0], ticket_array_key_as_string.load()
    )

    initialise_array = If(
        Not(ticket_array_key_has_value.hasValue()),
        App.localPut(
            Txn.accounts[0],
            ticket_array_key_as_string.load(),
            Bytes(
                "base16",
                "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            ),
        ),
    )

    curr_ticket_array = App.localGet(Txn.accounts[0], ticket_array_key_as_string.load())

from pyteal import *

from lottery_contract import Lottery

import os

if __name__ == "__main__":

    cwd = os.path.dirname(__file__)

    approval_program = Lottery().approval_program()
    clear_program = Lottery().clear_program()

    # Mode.Application specifies that this is a smart contract
    compiled_approval = compileTeal(
        approval_program, Mode.Application, version=6)
    print(compiled_approval)

    file_name = os.path.join(cwd, "lottery_approval.teal")
    with open(file_name, "w") as teal:
        teal.write(compiled_approval)
        teal.close()

    # Mode.Application specifies that this is a smart contract
    compiled_clear = compileTeal(clear_program, Mode.Application, version=6)
    print(compiled_clear)
    file_name = os.path.join(cwd, "lottery_clear.teal")
    with open(file_name, "w") as teal:
        teal.write(compiled_clear)
        teal.close()

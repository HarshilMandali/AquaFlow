from algopy import *

# Algorand continuous MoneyStream contract V1
# Contract is designed for continuous AlgoStream from creator/sender's contract to recipient account.
# Creator can re-create new stream after stoping current stream.

class Steam(ARC4Contract):
    # State variables
    streamRate: UInt64  # MicroAlgos per second
    startTime: UInt64  # Records Start time when stream is created
    endTime: UInt64  # Time when all funds will be streamed
    withdrawnAmount: UInt64  # Total withdraw Amount updates after each withdraw.
    recipient: Account  # Recipient account
    balance: UInt64  # Keep track of contract balance
    isStreaming: bool  # Track streaming status
    last_start_time: UInt64  # New variable to inspect the start time
    last_withdrawal_time: UInt64  # New variable to track last withdrawal time
    last_withdrawal_Amount: UInt64  # Amount of algos user Withdraw

    # Create application and initialize state variables
    # createApplication is like constructor Deploys application to blockchain
    @arc4.abimethod(allow_actions=["NoOp"], create="require")
    def createApplication(self) -> None:
        self.streamRate = UInt64(0)
        self.startTime = UInt64(0)
        self.endTime = UInt64(0)  # Initialize endTime
        self.withdrawnAmount = UInt64(0)
        self.recipient = Global.creator_address  # Set the creator initially
        self.balance = UInt64(0)
        self.isStreaming = bool(False)
        self.last_start_time = UInt64(0)  # Initialize last start time
        self.last_withdrawal_time = UInt64(0)  # Initialize last withdrawal time
        self.last_withdrawal_Amount = UInt64(0)

    # Start a new stream
    @arc4.abimethod(allow_actions=["NoOp"])
    def startStream(
        self,
        recipient: Account,
        rate: UInt64,
        amount: UInt64,
    ) -> None:
        assert Txn.sender == Global.creator_address  # only creator can start
        assert self.isStreaming == False
        # Store stream parameters
        self.recipient = recipient
        self.streamRate = rate
        self.startTime = Global.latest_timestamp
        self.withdrawnAmount = UInt64(0)
        self.balance += amount
        self.isStreaming = bool(True)

        # Calculate the stream end time: total time to stream all the amount = amount / rate
        stream_duration = amount // rate  # Stream duration in seconds
        self.endTime = self.startTime + stream_duration  # Calculate endTime

        # Store last start time for inspection
        self.last_start_time = self.startTime
        assert self.last_start_time > UInt64(0), "Start time must be greater than 0"

    # Calculate the total streamed amount
    @subroutine
    def _calculateStreamedAmount(self) -> UInt64:
        current_time = Global.latest_timestamp
        # Check if the stream has ended
        if current_time >= self.endTime:
            # All funds should have been streamed by endTime
            total_streamed = self.balance + self.withdrawnAmount
        else:
            # Stream is still active, calculate based on elapsed time
            elapsed_time = current_time - self.startTime
            total_streamed = elapsed_time * self.streamRate

        # Return the amount that has not been withdrawn yet
        return total_streamed - self.withdrawnAmount

    # Withdraw funds for the recipient based on the streamed amount
    @arc4.abimethod(allow_actions=["NoOp"])
    def withdraw(self) -> None:
        assert Txn.sender == self.recipient  # Only the recipient can withdraw
        self.last_withdrawal_Amount = self._calculateStreamedAmount()
        available_amount = self._calculateStreamedAmount()

        # Ensure the available amount does not exceed the contract balance
        # Manually implement `min` behavior
        if available_amount > self.balance:
            amount_to_withdraw = self.balance
        else:
            amount_to_withdraw = available_amount

        elapsed_since_last_withdrawal = (
            Global.latest_timestamp - self.last_withdrawal_time
        )

        assert elapsed_since_last_withdrawal >= UInt64(
            2
        ), "Withdrawal can only occur every 2 seconds"  # Adjust as needed

        # Update the last withdrawal time
        self.last_withdrawal_time = Global.latest_timestamp

        assert amount_to_withdraw > UInt64(0), "No available funds to withdraw"

        self.withdrawnAmount += amount_to_withdraw  # Update the withdrawn amount
        self.balance -= amount_to_withdraw

        itxn.InnerTransaction(
            sender=Global.current_application_address,
            receiver=self.recipient,
            amount=amount_to_withdraw,
            note=b"Withdrawal from contract",
            type=TransactionType.Payment,
        ).submit()

    # Stop the stream and transfer any remaining balance back to the creator
    @arc4.abimethod(allow_actions=["NoOp"])
    def stopStream(self) -> None:
        assert Txn.sender == Global.creator_address  # Only creator can stop

        # Calculate the amount streamed up to now
        streamed_amount = self._calculateStreamedAmount()

        # Transfer the streamed amount to the recipient
        if streamed_amount > UInt64(0):
            itxn.InnerTransaction(
                sender=Global.current_application_address,
                receiver=self.recipient,
                amount=streamed_amount,
                note=b"Final payment to recipient",
                type=TransactionType.Payment,
            ).submit()

        # Transfer the remaining balance to the creator
        remaining_balance = self.balance - streamed_amount
        if remaining_balance > UInt64(0):
            itxn.InnerTransaction(
                sender=Global.current_application_address,
                receiver=Global.creator_address,
                amount=remaining_balance,
                note=b"Remaining funds returned to creator",
                type=TransactionType.Payment,
            ).submit()

        # Reset stream parameters
        self.streamRate = UInt64(0)
        self.balance = UInt64(0)
        self.isStreaming = bool(False)

    # Get the estimated end time when the stream will complete
    @arc4.abimethod(allow_actions=["NoOp"])
    def getStreamEndTime(self) -> UInt64:
        return self.endTime

    @arc4.abimethod(allow_actions=["NoOp"])
    def getWithdrawAmount(self) -> UInt64:

        return self._calculateStreamedAmount()

    # Contract will be of no use after
    @arc4.abimethod(allow_actions=["DeleteApplication"])
    def deleteContract(self) -> None:
        assert Txn.sender == Global.creator_address

        streamed_amount = self._calculateStreamedAmount()

        # Transfer the streamed amount to the recipient
        if streamed_amount > UInt64(0):
            itxn.InnerTransaction(
                sender=Global.current_application_address,
                receiver=self.recipient,
                amount=streamed_amount,
                note=b"Final payment to recipient",
                type=TransactionType.Payment,
            ).submit()

        # Transfer the remaining balance to the creator.
        remaining_balance = self.balance - streamed_amount  # No use
        if remaining_balance > UInt64(0):  # No use
            itxn.InnerTransaction(
                sender=Global.current_application_address,
                receiver=Global.creator_address,
                amount=0,
                note=b"Remaining funds returned to creator",
                type=TransactionType.Payment,
                close_remainder_to=Global.creator_address,
            ).submit()

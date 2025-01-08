import algokit_utils
import pytest
from algokit_utils import get_localnet_default_account
from algokit_utils.config import config
from algosdk.v2client.algod import AlgodClient
from algopy import *
from algosdk.v2client.indexer import IndexerClient
from algokit_utils.beta.algorand_client import (
    AlgorandClient,
    PayParams,
    AssetCreateParams,
    AssetOptInParams,
    AssetTransferParams,
)
from algokit_utils.beta.account_manager import AddressAndSigner
import algosdk
from algosdk.atomic_transaction_composer import TransactionWithSigner

# Replace with your actual contract client
from smart_contracts.artifacts.steam.steam_client import SteamClient


@pytest.fixture(scope="session")
def algorand() -> AlgorandClient:
    """Get and return an AlgorandClient for local net."""
    return AlgorandClient.default_local_net()


@pytest.fixture(scope="session")
def dispenser(algorand: AlgorandClient) -> AddressAndSigner:
    """Get dispenser account tokens."""
    return algorand.account.dispenser()


@pytest.fixture(scope="session")
def creator(algorand: AlgorandClient, dispenser: AddressAndSigner) -> AddressAndSigner:
    """Create a new account funded by the dispenser."""
    acct = algorand.account.random()
    algorand.send.payment(
        PayParams(sender=dispenser.address, receiver=acct.address, amount=1_000_000)
    )
    return acct


@pytest.fixture(scope="session")
def recipient(
    algorand: AlgorandClient, dispenser: AddressAndSigner
) -> AddressAndSigner:
    """Create a new recipient account funded by the dispenser."""
    acct = algorand.account.random()
    # Funded with 10 algos
    algorand.send.payment(
        PayParams(sender=dispenser.address, receiver=acct.address, amount=10_000_000)
    )
    return acct


@pytest.fixture(scope="session")
def steam_client(
    algorand: AlgorandClient, creator: AddressAndSigner, recipient: AddressAndSigner
) -> SteamClient:
    """Initiate the smart contract application for tests."""
    client = SteamClient(
        algod_client=algorand.client.algod,
        sender=creator.address,
        signer=creator.signer,
    )
    client.create_create_application()  # Call to create the contract
    return client


def test_start_stream(
    steam_client: SteamClient,
    creator: AddressAndSigner,
    algorand: AlgorandClient,
    recipient: AddressAndSigner,
):
    rate = 100  # Set your stream rate
    amount = 50000  # Set the initial amount to transfer

    # Fetch the account info and get the balance
    account_info = algorand.client.algod.account_info(creator.address)
    creator_balance = account_info["amount"]  # Balance is in microAlgos

    algorand.send.payment(
        PayParams(
            sender=creator.address,
            receiver=steam_client.app_address,
            amount=amount,
        )
    )
    print("Algos Sent")

    # Check if the creator has enough balance to cover the payment + fee
    # fee = 2000  # Updated to ensure the fee is sufficient
    # total_required = amount + fee
    # assert (
    #     creator_balance >= total_required
    # ), f"Insufficient balance: {creator_balance} < {total_required}"

    # Start the stream
    try:
        # Set the transaction fee
        transaction = steam_client.start_stream(
            recipient=recipient.address,
            rate=rate,
            amount=amount,
            # **{"fee": fee},  # Setting fee directly in the transaction call
        )

        assert transaction.confirmed_round

        # Confirm the stream parameters were set correctly
        assert steam_client.recipient == recipient.address
        assert steam_client.streamRate == rate
        assert steam_client.startTime > 0  # Ensure start time is set

        # Check if contract has received the payment
        assert algorand.account.get_information(steam_client.app_address) >= amount

    except algosdk.error.AlgodHTTPError as e:
        raise AssertionError(f"Failed to start stream: {e}")


# def test_withdraw(
#     steam_client: SteamClient, creator: AddressAndSigner, algorand: AlgorandClient
# ):
#     # Ensure that the recipient can withdraw the funds
#     withdraw_amount = 1000  # Example withdraw amount
#     result = steam_client.withdraw(amount=withdraw_amount)
#     assert result.confirmed_round

#     # Check if the withdrawal was successful
#     assert algorand.account.get_balance(creator.address) >= withdraw_amount


# def test_stop_stream(
#     steam_client: SteamClient, creator: AddressAndSigner, algorand: AlgorandClient
# ):
#     # Stop the stream
#     result = steam_client.stop_stream()
#     assert result.confirmed_round

#     # Check that the stream has been stopped (additional checks can be added)
#     assert steam_client.streamRate == 0  # Ensure stream rate is reset

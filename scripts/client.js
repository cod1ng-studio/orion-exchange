const Web3 = require("web3");
// const web3 = new Web3("http://localhost:8544"); // ganache
const web3 = new Web3("http://localhost:8545"); // gwan
const Long = require("long");

const WETHArtifact = require("../build/contracts/WETH.json");
const WBTCArtifact = require("../build/contracts/WBTC.json");
const exchangeArtifact = require("../build/contracts/Exchange.json");

// === CONTRACT INSTANCES === //

let exchange, weth, wbtc, netId, accounts;

async function setupContracts() {
  netId = await web3.eth.net.getId();

  exchange = new web3.eth.Contract(
    exchangeArtifact.abi,
    exchangeArtifact.networks[netId].address
  );

  weth = new web3.eth.Contract(
    WETHArtifact.abi,
    WETHArtifact.networks[netId].address
  );

  wbtc = new web3.eth.Contract(
    WBTCArtifact.abi,
    WBTCArtifact.networks[netId].address
  );

  accounts = await web3.eth.getAccounts();
}

function longToBytes(long) {
  return web3.utils.bytesToHex(Long.fromNumber(long).toBytesBE());
}

// === Hash Order=== //

function hashOrder(orderInfo) {
  let message = web3.utils.soliditySha3(
    "0x03",
    orderInfo.senderAddress,
    orderInfo.matcherAddress,
    orderInfo.baseAsset,
    orderInfo.quoteAsset,
    orderInfo.matcherFeeAsset,
    longToBytes(orderInfo.amount),
    longToBytes(orderInfo.price),
    longToBytes(orderInfo.matcherFee),
    longToBytes(orderInfo.nonce),
    longToBytes(orderInfo.expiration),
    orderInfo.side === "buy" ? "0x00" : "0x01"
  );

  return message;
}

// === SIGN ORDER === //
async function signOrder(orderInfo) {
  let message = hashOrder(orderInfo);
  //Wanmask
  //   let signedMessage = await window.wan3.eth.sign(
  //     sender,
  //     message
  //   );
  console.log(message);

  //Web3 v1
  let signedMessage = await web3.eth.sign(message, orderInfo.senderAddress);

  //Web3 v0.2
  //   let signedMessage = await web3.eth.sign(sender, message);

  return signedMessage;
}

// // === MAIN FLOW === //

(async function main() {
  await setupContracts();
  let wbtcAddress = WBTCArtifact.networks[netId].address;
  let wethAddress = WETHArtifact.networks[netId].address;
  let exchangeAddress = exchangeArtifact.networks[netId].address;

  //Mint WBTC to Buyer
  await wbtc.methods
    .mint(accounts[1], String(100e8))
    .send({ from: accounts[0] });

  //Buyer Approves Token Transfer to exchange
  await wbtc.methods
    .approve(exchangeAddress, String(100e8))
    .send({ from: accounts[1] });

  //Buyer Deposits all WBTC
  await exchange.methods
    .depositAsset(wbtcAddress, String(100e8))
    .send({ from: accounts[1] });

  //Mint WBTC to Seller
  await weth.methods
    .mint(accounts[2], web3.utils.toWei("100"))
    .send({ from: accounts[0] });

  //Seller Approves Token Transfer to exchange
  await weth.methods
    .approve(exchangeAddress, web3.utils.toWei("100"))
    .send({ from: accounts[2] });

  //Seller Deposits all WETH
  await exchange.methods
    .depositAsset(wethAddress, web3.utils.toWei("100"))
    .send({ from: accounts[2] });

  // const nowTimestamp = Date.now();
  nowTimestamp = 1570752916653; //For testing

  //Client1 Order
  const buyOrder = {
    senderAddress: accounts[1],
    matcherAddress: accounts[0],
    baseAsset: wethAddress,
    quoteAsset: wbtcAddress, // WBTC
    matcherFeeAsset: wethAddress, // WETH
    amount: 350000000, //3.5 ETH * 10^8
    price: 2100000, //0.021 WBTC/WETH * 10^8
    matcherFee: 350000,
    nonce: nowTimestamp,
    expiration: nowTimestamp + 29 * 24 * 60 * 60 * 1000, // milliseconds
    side: "buy"
  };

  //Client1 signs buy order
  let signature1 = await signOrder(buyOrder);
  console.log("Message: ", hashOrder(buyOrder));
  console.log("Signature: ", signature1);
  console.log("Signed By: ", buyOrder.senderAddress);
  console.log("Buy Order Struct: \n", buyOrder);

  const sellOrder = {
    senderAddress: accounts[2],
    matcherAddress: accounts[0],
    baseAsset: wethAddress,
    quoteAsset: wbtcAddress, // WBTC
    matcherFeeAsset: wethAddress, // WETH
    amount: 150000000,
    price: 2000000,
    matcherFee: 150000,
    nonce: nowTimestamp,
    expiration: nowTimestamp + 29 * 24 * 60 * 60 * 1000, // milliseconds
    side: "sell"
  };

  //Client2 signs sell order
  let signature2 = await signOrder(sellOrder);
  console.log("\nMessage: ", hashOrder(sellOrder));
  console.log("Signed Data: ", signature2);
  console.log("Signed By: ", sellOrder.senderAddress);
  console.log("Sell Order Struct: \n", sellOrder);
})();

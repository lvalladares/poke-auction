require('dotenv').config();

const Web3 = require('web3');
const mailgun = require('mailgun.js');

const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});
const sendToEmail = process.env.SEND_TO_EMAIL;

const rpcURL = process.env.RPC_URL;
const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = [{"constant":false,"inputs":[{"name":"_nftAddress","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"cancelAuctionWhenPaused","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"unpause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"uint256"}],"name":"auctions","outputs":[{"name":"seller","type":"address"},{"name":"startingPrice","type":"uint128"},{"name":"endingPrice","type":"uint128"},{"name":"duration","type":"uint64"},{"name":"startedAt","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_nftAddress","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"bid","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"paused","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_nftAddress","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"getCurrentPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_nftAddress","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"getAuction","outputs":[{"name":"seller","type":"address"},{"name":"startingPrice","type":"uint256"},{"name":"endingPrice","type":"uint256"},{"name":"duration","type":"uint256"},{"name":"startedAt","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"ownerCut","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_nftAddress","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"cancelAuction","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_nftAddress","type":"address"},{"name":"_tokenId","type":"uint256"},{"name":"_startingPrice","type":"uint256"},{"name":"_endingPrice","type":"uint256"},{"name":"_duration","type":"uint256"}],"name":"createAuction","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"reclaimEther","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_ownerCut","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":false,"stateMutability":"nonpayable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_nftAddress","type":"address"},{"indexed":true,"name":"_tokenId","type":"uint256"},{"indexed":false,"name":"_startingPrice","type":"uint256"},{"indexed":false,"name":"_endingPrice","type":"uint256"},{"indexed":false,"name":"_duration","type":"uint256"},{"indexed":false,"name":"_seller","type":"address"}],"name":"AuctionCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_nftAddress","type":"address"},{"indexed":true,"name":"_tokenId","type":"uint256"},{"indexed":false,"name":"_totalPrice","type":"uint256"},{"indexed":false,"name":"_winner","type":"address"}],"name":"AuctionSuccessful","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_nftAddress","type":"address"},{"indexed":true,"name":"_tokenId","type":"uint256"}],"name":"AuctionCancelled","type":"event"},{"anonymous":false,"inputs":[],"name":"Pause","type":"event"},{"anonymous":false,"inputs":[],"name":"Unpause","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"}];


const web3 = new Web3(rpcURL);
const contract = new web3.eth.Contract(contractABI, contractAddress);


async function eventQuery(){

    const maxTokenNumber = 1000000;

    contract.events.allEvents()
    .on('data', (eventData) => {

        if (auction["_tokenId"] <= maxTokenNumber) {

            const tokenID = auction["_tokenId"];

            if (eventData["event"] == "AuctionCreated") {
                console.log(eventData["event"]);
                const auction = eventData["returnValues"];
                const startingPrice = web3.utils.fromWei(auction["_startingPrice"], 'ether');
                const endingPrice = web3.utils.fromWei(auction["_endingPrice"], 'ether');
                const duration = auction["_duration"] / 86400;

                mg.messages.create('sandboxc757905146dc4c80bcb8b67681a1ad06.mailgun.org', {
                    from: "Axies Auctioneer <auctioneer@axieinfinity.com>",
                    to: [sendToEmail],
                    subject: `Axies Auction ${tokenID} || ${startingPrice} to ${endingPrice} in ${duration} days`,
                    text: "Testing some Mailgun awesomness!",
                    html:
                    `
                    <p>${tokenID} Axies is on sale for:</p>
                    <h2>${startingPrice}eth Starting</h2>
                    <h2>${endingPrice}eth Ending</h2>
                    <p>in ${duration} days.</p>
                    <p>visit here: <a href="https://marketplace.axieinfinity.com/axie/${tokenID}">https://marketplace.axieinfinity.com/axie/${tokenID}</a></p>
                    `
                })
                .then(msg => console.log(msg)) // logs response data
                .catch(err => console.log(err)); // logs any error
            }

            if (eventData["event"] == "AuctionSuccessful") {
                console.log(eventData["event"]);
                const auction = eventData["returnValues"];
                const totalPrice = web3.utils.fromWei(auction["_totalPrice"], 'ether');

                mg.messages.create('sandboxc757905146dc4c80bcb8b67681a1ad06.mailgun.org', {
                    from: "Axies Auctioneer <auctioneer@axieinfinity.com>",
                    to: [sendToEmail],
                    subject: `Axies Auction ${tokenID} || SOLD for ${totalPrice}`,
                    text: "Testing some Mailgun awesomness!",
                    html:
                    `
                    <p>${tokenID} Axies sold for ${totalPrice}eth</p>
                    <p>visit here: <a href="https://marketplace.axieinfinity.com/axie/${tokenID}">https://marketplace.axieinfinity.com/axie/${tokenID}</a></p>
                    `
                })
                .then(msg => console.log(msg)) // logs response data
                .catch(err => console.log(err)); // logs any error
            }
        }
    })
    .on('error', error => console.log(error));
}

eventQuery();




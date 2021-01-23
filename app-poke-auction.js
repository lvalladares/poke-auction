require('dotenv').config();
const Web3 = require('web3');

const mailgun = require('mailgun.js');
const fetch = require('node-fetch');
const abis = require('./abis');
const addresses = require('./addresses');


// MAILGUN
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});
const sendToEmail = process.env.SEND_TO_EMAIL;

// GAS STATION
const gasStation = process.env.GAS_STATION_URL;

const rpcURL = process.env.RPC_URL_MAINNET;
// const rpcURL = process.env.RPC_URL_KOVAN;
// const rpcURL = 'http://localhost:8545'
const web3 = new Web3(rpcURL);
const BN = web3.utils.BN;
const auctionContract = new web3.eth.Contract(abis.axies.axieClockAuction, addresses.axies.axieClockAuction);
const axieCore = new web3.eth.Contract(abis.axies.axieCore, addresses.axies.axieCore);

const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);


const init = async () => {

    const gasPrice = {fast: 300, fastest: 500, safeLow: 100, average: 200};

    const getGasPrice = async () => {
        const response = await fetch(gasStation);
        const json = await response.json(); // divide by 10 to convert to gwei
        gasPrice.fast = web3.utils.toWei(web3.utils.toBN(json.fast / 10), 'gwei').toString();
        gasPrice.fastest = web3.utils.toWei(web3.utils.toBN(json.fastest / 10), 'gwei').toString();
        gasPrice.safeLow = web3.utils.toWei(web3.utils.toBN(json.safeLow / 10), 'gwei').toString();
        gasPrice.average = web3.utils.toWei(web3.utils.toBN(json.average / 10), 'gwei').toString();
        // console.log(gasPrice);
    }

    await getGasPrice();
    setInterval(getGasPrice, 4000);

    // CALLS
    async function balanceOf(address) {
        const balance = await axieCore.methods.balanceOf(address).call();
        console.log(balance);
    }

    async function ownerOf(tokenId) {
        const owner = await axieCore.methods.ownerOf(tokenId).call();
        console.log(owner);
    }

    async function getAxie(tokenId) {
        const axie = await axieCore.methods.getAxie(tokenId).call(); // returns genes bornAt
        console.log(axie);
    }

    async function getCurrentPrice(tokenId) {
        const price = await auctionContract.methods.getCurrentPrice(addresses.axies.axieCore, tokenId).call();
        return price;
    }

    async function getAuction(tokenId) {
        const auction = await auctionContract.methods.getAuction(addresses.axies.axieCore, tokenId).call();
        return auction;
    }

    // TRANSACTIONS
    async function bidAxie(tokenId, _gasPrice, dryrun=false) {
        const tx = auctionContract.methods.bid(
            addresses.axies.axieCore,
            tokenId
        );

        const currentPrice = await getCurrentPrice(tokenId);
        const priceExtra = web3.utils.toBN(currentPrice).div(web3.utils.toBN(Math.pow(10, 3)));
        const price = (web3.utils.toBN(currentPrice).add(priceExtra)).toString();

        // const gasCost = await tx.estimateGas({from: admin, value: currentPrice});
        const gasCost = 220733; // UPDATE
        const txCost = parseFloat(web3.utils.fromWei((web3.utils.toBN(gasCost).mul(web3.utils.toBN(gasPrice.average))).toString())); // in ETH

        const data = tx.encodeABI();


        const txData = {
            from: admin,
            to: auctionContract.options.address,
            value: price,
            data,
            gas: gasCost,
            gasPrice: _gasPrice
        };

        console.log('current price ', currentPrice, 'price extra ', price);
        console.log('gas price', _gasPrice);
        console.log('gas cost ', gasCost);
        console.log('tx cost ', txCost);

        if(!dryrun) {
            try {
                const receipt = await web3.eth.sendTransaction(txData);
                console.log(receipt.transactionHash);
            } catch (e) {
                console.log(e)
            }
        }
    }



    async function createAuction(from, tokenId, startingPrice, endingPrice, duration) {
        const tx = auctionContract.methods.createAuction(
            addresses.axies.axieCore,
            tokenId,
            startingPrice,
            endingPrice,
            duration
        );

        console.log(addresses.axies.axieCore);
        try {
            // const gasCost = await tx.estimateGas({from: from, value: startingPrice});
            const gasCost = 205027;
            const txCost = (gasPrice.fast * gasCost) / Math.pow(10, 9); // in ETH

            const data = tx.encodeABI();
            const txData = {
                from: admin,
                to: auctionContract.options.address,
                data,
                gas: gasCost,
                gasPrice: gasPrice.fast
            };

            const receipt = await web3.eth.sendTransaction(txData);
            console.log(txCost);
            console.log(txData);

        } catch (e) {
            console.log(e);
        }
    }


    await bidAxie(238417, gasPrice.fast, true);








    // await createAuction(admin, 220599, "30000000000000000", "60000000000000000", "86400");

    // await getCurrentPrice(218714);
    // await balanceOf(admin);
    // await ownerOf(220599);
    // await getAxie(220599);

    // day 86400

}

init();






async function eventQuery(){

    const maxTokenNumber = 10000;

    auctionContract.events.allEvents()
    .on('data', (eventData) => {

        const auction = eventData["returnValues"];
        const tokenID = auction["_tokenId"];

        if (tokenID <= maxTokenNumber) {
            if (eventData["event"] == "AuctionCreated") {
                console.log(eventData["event"]);
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

// eventQuery();
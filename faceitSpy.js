const fetch = require('node-fetch');
const WebSocket = require('ws');
const Discord = require('discord.js');
const env = require('dotenv').config();
const PLAIN = (process.env.PLAIN);
const guid = (process.env.BOTGUID);
const chat_id = (process.env.CHATID);
const client = new Discord.Client();

//Connecting to discord
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

//Returns a complete time stamp in day-month-year hour:min:sec
function getTimeStamp() {
    var now = new Date();
    return ((now.getMonth() + 1) + '-' +
        (now.getDate()) + '-' +
        now.getFullYear() + " " +
        now.getHours() + ':' +
        ((now.getMinutes() < 10)
            ? ("0" + now.getMinutes())
            : (now.getMinutes())) + ':' +
        ((now.getSeconds() < 10)
            ? ("0" + now.getSeconds())
            : (now.getSeconds())));
}

//Sends a http request and extracts a json from the faceit user system and converts the GUID to a nickname
const guidtonick = async (nickget, message) => {
    await sleep(300);
    const response = await fetch('https://api.faceit.com/core/v1/users/' + nickget);
    await sleep(300);
    const myJson = await response.json(); //extract JSON from the http response

    //This is the discord bot sending the messages to the pre defined channel
    client.channels.get('536440569338003456').send(getTimeStamp() + ' ' + await myJson.payload.nickname + ' -- ' + message);
}

//Main socket creation for the faceit chat system
async function startSocket() {
    var ws = new WebSocket('wss://chat-server.faceit.com/websocket');

    ws.on('open', async function open() {
        console.log('connected');
        ws.send("<open xmlns='urn:ietf:params:xml:ns:xmpp-framing' to='faceit.com' version='1.0'/>");
        await sleep(300);
        ws.send("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>" + PLAIN + "</auth>");
        await sleep(300);
        ws.send("<open xmlns='urn:ietf:params:xml:ns:xmpp-framing' to='faceit.com' version='1.0'/>");
        await sleep(300);
        ws.send("<iq type='set' id='_bind_auth_2' xmlns='jabber:client'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>rn_9.26.4_483491080838051</resource></bind></iq>");
        await sleep(300);
        ws.send("<iq type='set' id='_session_auth_2' xmlns='jabber:client'><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq>");
        await sleep(300);
        ws.send("<iq id='" + guid + "@faceit.com-vcard-query' type='get' to='" + guid + "@faceit.com' xmlns='jabber:client'><vCard xmlns='vcard-temp'/></iq>");
        await sleep(300);
        ws.send("<presence  to='" + chat_id + "@conference.faceit.com/" + guid
            + "' xmlns='jabber:client'><x xmlns='http://jabber.org/protocol/muc'><history maxstanzas='0'/></x><unsubscribe><initial_presences /><presence_updates /></unsubscribe><priority>10</priority></presence>");

    });

    //Detecting a socket issue and just retrying
    ws.on('close', function close() {
        console.log('reconnecting');
        startSocket();
    });

    //When a message is detected this converts the entire message into the guid and the actual message sent
    ws.on('message', function incoming(data) {
        console.log(data);
        if (data.startsWith('<message')) {
            let message = new RegExp(/<message from='(.*?)@conference.faceit.com\/(.*?).*<body>(.*)<\/body>/).exec(data);;
            if (message) {
                var matches = /\/[^']*'{1}/.exec(message[0]);
                var string = matches[0];
                var guidsender = string.substring(1, string.length - 1);
                var nickname = guidtonick(guidsender, message[3]);
            }
        }
    });
}

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

startSocket();

client.login(process.env.DCTOKEN);
import { Tickerdef } from "./types";

export const BASE_URL = "wss://ws.backpack.exchange/" // establishing webscoket server with this URL

export class SignalingManager {
    private ws: WebSocket;
    private static instance: SignalingManager;
    private bufferedMessages: any[] = [];       // act as message storage queue
    private callbacks: any = {};
    private id: number;    // counter for adding different ids to messages
    private initialized: boolean = false;

    private constructor() {
        this.ws = new WebSocket(BASE_URL);
        this.bufferedMessages = [];
        this.id = 1;
        this.init();
    }

    public static getInstance() {       // will return instances of this class if it has before else will make new one
        if (!this.instance)  {
            this.instance = new SignalingManager();
        }
        return this.instance;
    }

    init() {
        this.ws.onopen = () => {
            this.initialized = true;
            this.bufferedMessages.forEach(message => {     // passing any message which is in bufferedMessages message storage queue;
                this.ws.send(JSON.stringify(message));
            });
            this.bufferedMessages = [];                   // clearing out the bufferedMessages message storage queue for some new messages
        }
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const type = message.data.e;
            if (this.callbacks[type]) {
                this.callbacks[type].forEach(({ callback }) => {
                    if (type === "ticker") {
                        const newTicker: Partial<Tickerdef> = {
                            lastPrice: message.data.c,
                            high: message.data.h,
                            low: message.data.l,
                            volume: message.data.v,
                            quoteVolume: message.data.V,
                            symbol: message.data.s,
                        }

                        callback(newTicker);
                   }
                   if (type === "depth") {
                        // const newTicker: Partial<Ticker> = {
                        //     lastPrice: message.data.c,
                        //     high: message.data.h,
                        //     low: message.data.l,
                        //     volume: message.data.v,
                        //     quoteVolume: message.data.V,
                        //     symbol: message.data.s,
                        // }
                        // console.log(newTicker);
                        // callback(newTicker);
                        const updatedBids = message.data.b;
                        const updatedAsks = message.data.a;
                        callback({ bids: updatedBids, asks: updatedAsks });
                    }
                });
            }
        }
    }

    sendMessage(message: any) {
        const messageToSend = {
            ...message,          // first spreading the messages and then adding unique id to message
            id: this.id++
        }
        if (!this.initialized) {
            this.bufferedMessages.push(messageToSend);    // if the connection is not open yet then messages will be saved in bufferedMessages
            return;
        }
        this.ws.send(JSON.stringify(messageToSend));     // if the connection is open then it will be sent immediately
    }

    async registerCallback(type: string, callback: any, id: string) {  // registers callback function for specific message
        this.callbacks[type] = this.callbacks[type] || [];             // if this.callbacks[type] is null so this.callbacks[type] will become an empty array else it will be same old 
        this.callbacks[type].push({ callback, id });                
        // "ticker" => callback
    }

    async deRegisterCallback(type: string, id: string) {   // registers callback function for specific message
        if (this.callbacks[type]) {
            const index = this.callbacks[type].findIndex(callback => callback.id === id);
            if (index !== -1) {
                this.callbacks[type].splice(index, 1);
            }
        }
    }
}
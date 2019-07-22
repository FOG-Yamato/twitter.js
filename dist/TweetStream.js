"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const abort_controller_1 = require("abort-controller");
const node_fetch_1 = require("node-fetch");
class TweetStream extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.controller = null;
        this.timeout = null;
        this.flag = false;
        this.collector = '';
    }
    async run(url, opts) {
        this.controller = new abort_controller_1.AbortController();
        const res = await node_fetch_1.default(url.href, { ...opts, signal: this.controller.signal });
        if (res.status === 404)
            throw res.statusText;
        if (!res.ok && res.status !== 401)
            throw await res.text();
        if (res.status === 401)
            return this.run(url, opts);
        this.emit('ready');
        this.timeout = setTimeout(() => {
            this.flag = true;
            this.end();
        }, 60000);
        try {
            for await (const payload of res.body) {
                clearTimeout(this.timeout);
                const initial = payload.toString('utf8');
                if (/^\s+$/.test(initial)) {
                    this.emit('heartbeat');
                }
                else {
                    this.collector += initial;
                    if (this.collector.endsWith('\r\n')) {
                        const processed = JSON.parse(this.collector);
                        if (processed.delete)
                            this.emit('deleteTweet', processed.delete);
                        else if (processed.retweeted_status)
                            this.emit('retweet', processed);
                        else if (processed.in_reply_to_status_id)
                            this.emit('reply', processed);
                        else
                            this.emit('tweet', processed);
                        this.collector = '';
                    }
                }
                this.timeout = setTimeout(() => {
                    this.flag = true;
                    this.end();
                }, 60000);
            }
            return this.run(url, opts);
        }
        catch (e) {
            if (this.flag && e.type === 'aborted')
                this.run(url, opts);
        }
    }
    end() {
        if (this.controller) {
            this.controller.abort();
            this.emit('end');
        }
    }
}
exports.TweetStream = TweetStream;
//# sourceMappingURL=TweetStream.js.map
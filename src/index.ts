import { Context, Service, Schema, Logger } from 'koishi';
import path from "path";
import _ from "lodash";


let context: Context;

export function getContext () {
    return context;
}

export class StarWorldBot extends Service {

    logger: Logger;
    core: typeof import ("./core/index");
    configPath: string;

    constructor (ctx: Context, public config: StarWorldBot.Config) {
        super (ctx, "swbot", true);
        context = ctx;
        this.configPath = path.join(ctx.baseDir, "swbot");
        this.core = require("./core/index");
        this.logger = new Logger(config.botName || "SWBot");
        if (config.messageLogging) ctx.on(
            "message",
            (session) => {
                let message = `${session.content}`;
                if (session.username && session.userId) message = `${session.username} (${session.userId}): ${message}`;
                if (session.channelName && session.channelId) message = `${session.channelName} (${session.channelId}) ${message}` ;
                if (session.guildName && session.guildId) message = `${session.guildName} (${session.guildId}) ${message}`;
                this.logger.info(`[${session.platform.toUpperCase()}] ${message}`);
            }
        );
        ctx.middleware(
            async (session, next) => {
                session.swbot = {
                    player: new this.core.Player(session.userId, session.platform)
                };
                return await next();
            },
            true
        );
        ctx.component(
            "swbot-player", async (attrs, children, session) => {
                if (attrs.platform && attrs.id) return new this.core.Player(String(attrs.id), String(attrs.platform)).getNameWithIdentifier(session);
                if (attrs.identifier instanceof this.core.Identifier) return new this.core.Player(attrs.identifier.path, attrs.identifier.namespace).getNameWithIdentifier(session);
                return session.swbot.player.getNameWithIdentifier(session);
            }
        );
        ctx.component(
            "swbot-item", async (attrs, children, session) => {
                if (attrs.id && attrs.count) return new this.core.ItemStack(String(attrs.id), Number(attrs.count), _.isPlainObject(attrs.nbt) ? attrs.nbt : {}).getNameWithIdentifier(session.swbot.player, session);
                if (attrs.stack instanceof this.core.ItemStack) return attrs.stack.getNameWithIdentifier(session.swbot.player, session);
                return "";
            }
        );
    }

}

export namespace StarWorldBot {

    export interface Config {
        botName: string;
        messageLogging: boolean;
        currencyName: string;
        currencySymbol: string;
    }

    export const Config: Schema <Config> = Schema.object (
        {
            botName: Schema.string().default("SWBot").description("机器人的名称。"),
            messageLogging: Schema.boolean().default(true).description("是否在发送或接收时产生日志。"),
            currencyName: Schema.string().description("货币名称。"),
            currencySymbol: Schema.string().default("货币符号。")
        }
    );

    export interface Session {
        player: import("./core").Player
    }

}

declare module 'koishi' {
    interface Context {
        swbot: StarWorldBot;

    }
    interface Session {
        swbot: StarWorldBot.Session;
    }
}



export default StarWorldBot;

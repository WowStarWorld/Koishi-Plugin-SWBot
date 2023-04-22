import { getContext } from "../../index";
import { Identifier } from "../utils";
import { ItemStack, Item } from "../item";
import _ from "lodash";
import { NBTCompound } from "../nbt";
import { BaseEvent } from "../event";
import { Session } from "koishi";

let ctx = getContext();


declare module "koishi" {

    interface Tables {
        "swbot.players": {
            id: string;
            inventory: {items: ReturnType<ItemStack["toObject"]>[]};
            purse: number;
            experience: number;
        }
    }

}

ctx.model.extend(
    "swbot.players",
    {
        id: "string",
        inventory: "json",
        experience: "integer",
        purse: "float"
    }
);

export class Player {

    constructor (public id: string, public platform: string) {}

    getIdentifier () {
        return new Identifier (this.platform, this.id);
    }

    async getPurse () {
        return (await this.fix()).purse;
    }

    async setPurse (money: number) {
        await ctx.database.set("swbot.players", {id: `${this.getIdentifier()}`}, {purse: Number(Number(money).toFixed(2))});
    }

    async getExperience () {
        return (await this.fix()).experience;
    }

    async setExperience (experience: number) {
        await ctx.database.set("swbot.players", {id: `${this.getIdentifier()}`}, {experience: _.toInteger(Number(experience))});
    }

    async fix () {
        let player = (await ctx.database.get("swbot.players", {id: this.getIdentifier().toString()}))?.[0];
        let fixed = false;
        if (!player) {
            fixed = true;
            if (!player) await ctx.database.create("swbot.players", {id: this.getIdentifier().toString(), inventory: {items: []}});
        }
        if (!_.isArray(player?.inventory?.items)) {
            fixed = true;
            await ctx.database.set("swbot.players", {id: this.getIdentifier().toString()}, {inventory: {items: []}});
        }
        if (typeof player?.purse != "number") {
            fixed = true;
            await ctx.database.set("swbot.players", {id: this.getIdentifier().toString()}, {purse: 0});
        }
        if (fixed) return (await ctx.database.get("swbot.players", {id: this.getIdentifier().toString()}))?.[0];
        else return player;
    }

    async give (itemStack: ItemStack, event?: BaseEvent) {
        let player = await this.fix();
        let result = false;
        if (!player.inventory.items.some(i => i.id == itemStack.id && _.isEqual(i.nbt, itemStack.nbt))) {
            player.inventory.items.push(itemStack.toObject());
            if (event) result = await Item.findByIdentifier(itemStack.id).onGive(this, null, itemStack, event);
            else result = true;
        } else for (let i of player.inventory.items) {
            if (i.id == itemStack.id && _.isEqual(i.nbt, itemStack.nbt)) {
                i.count += itemStack.count;
                if (event) result = await Item.findByIdentifier(itemStack.id).onGive(this, new ItemStack(itemStack.id, itemStack.count, itemStack.nbt), itemStack, event);
                else result = true;
                break;
            }
        }
        await ctx.database.set("swbot.players", {id: this.getIdentifier().toString()}, {inventory: {items: player.inventory.items}});
        return result;
    }

    async drop (id: string, amount: number, nbt?: NBTCompound, event?: BaseEvent) {
        let player = await this.fix();
        let removeAmount = amount;
        for (let i of Object.keys(player.inventory.items).map(i => Number(i))) {
            let item = player.inventory.items[i];
            if (item.id == id && nbt ? _.isEqual(nbt, item.nbt) : true) {
                let itemCount = item.count;
                if (event && await Item.findByIdentifier(item.id).onDrop(this, new ItemStack(item.id, item.count, item.nbt), new ItemStack(id, amount <= itemCount ? amount : itemCount, nbt ?? item.nbt), event)) continue;
                if (removeAmount <= item.count) {
                    item.count -= removeAmount;
                    removeAmount -= (itemCount - item.count);
                } else {
                    item.count = 0;
                    removeAmount -= itemCount;
                }
                if (item.count < 1) delete player.inventory.items[i];
            }
            if (removeAmount < 1) break;
        }
        await ctx.database.set("swbot.players", {id: this.getIdentifier().toString()}, {inventory: {items: player.inventory.items.filter(i => i)}});
    }

    async getInventory () { return (await this.fix()).inventory.items.map(i => new ItemStack(i.id, i.count, i.nbt)); }

    async getNameWithIdentifier (session: Session) {
        if (session.platform === this.platform) return `${(await session.bot.getUser(this.id)).username} (${this.getIdentifier()})`;
        else return `${this.getIdentifier()}`;
    }

    async hasItem (id: string | Identifier, nbt?: NBTCompound) {
        return !!(await this.fix()).inventory.items.find(i => i.id === id && _.isEqual(i.nbt, nbt));
    }

    async countItem (id: string | Identifier, nbt?: NBTCompound) {
        if (!await this.hasItem(id, nbt)) return 0;
        return (await this.fix()).inventory.items.find(i => i.id === id && _.isEqual(i.nbt, nbt))?.count ?? 0;
    }

    toString () { return `${this.getIdentifier()}`; }

}


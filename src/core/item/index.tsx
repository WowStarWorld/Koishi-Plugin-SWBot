import { NBTCompound } from "../nbt";

import _ from "lodash";
import { Player } from "../player";
import { BaseEvent } from "../event";
import { Identifier } from "../utils";
import { h } from "koishi";

export interface ItemState {
    name: string;
    tooltip: string;
}

export class ItemStack {
    
    
    constructor (public id: string, public count: number = 1, public nbt: NBTCompound = {}) {
        if (typeof id != "string" || typeof count != "number" || !nbt) throw new TypeError(`Invalid parameter, requires string, number, NBTCompound`);
        if (count < 0 || !_.isSafeInteger(count)) throw new TypeError(`Parameter 'count' must be a integer (>=0)`);
    }
    
    serialize () {
        return JSON.stringify({id: this.id, count: this.count, nbt: this.nbt});
    }
    
    deserialize (data: string) {
        let stack = JSON.parse(data);
        return new ItemStack(stack.id, stack.count, stack.nbt);
    }
    
    toObject () {
        return {id: this.id, count: this.count, nbt: this.nbt};
    }
    
    decrement (amount: number) {
        if (amount < 0 || !_.isSafeInteger(amount) || !_.isInteger(amount)) throw new TypeError(`Parameter 'amount' must be a integer (>=0)`);
        if (this.count - amount < 1 || !_.isSafeInteger(this.count - amount)) this.count = 0;
        this.count -= amount;
        return this;
    }
    
    increment (amount: number) {
        if (amount < 0 || !_.isSafeInteger(amount) ) throw new TypeError(`Parameter 'amount' must be a positive integer (>=0)`);
        this.count += amount;
        return this;
    }
    
    async getNameWithIdentifier (player?: Player, event?: BaseEvent) {
        return `${this.nbt ? "[" + h("code", "特殊") + "] " : ""}${await Item.findByIdentifier(this.id)?.getName?.(player, this, event) ?? "未知物品"} (${this.id}) * ${this.count}`;
    }
    
}

export abstract class Item {


    public constructor (public settings: Item.Settings = new Item.Settings) {}

    public abstract id: Identifier;
    public data: Partial<ItemState> = {};
    public async onGive (player: Player, source: ItemStack | null, increment: ItemStack, event: BaseEvent) { return true; }
    public async onDrop (player: Player, source: ItemStack, decrement: ItemStack, event: BaseEvent) { return true; }
    public async getName (player?: Player, stack?: ItemStack, event?: BaseEvent) { return this.data?.name ?? "未知物品"; }
    public async getTooltip (player?: Player, stack?: ItemStack, event?: BaseEvent) { return this.data?.tooltip ?? ""; }

    public async getIcon (player?: Player, stack?: ItemStack) { return Buffer.of(0); }

}

export class UnknownItem extends Item {

    public override id = new Identifier("swbot", "air");
    public override data = {name: "空气"};

}



export namespace Item {

    export const all: Item[] = [];

    export function register (item: Item) {
        all.push(item);
        return item;
    }

    export function findByIdentifier (id: string | Identifier) {
        return all.find(i => i.id.toString() == id.toString());
    }

    export function findByClass (constructor: new () => any) {
        return all.find(i => i instanceof constructor);
    }

    export enum Quality {
        Star1, Star2, Star3, Star4, Star5, Star6
    }

    export class Settings {

        public data = {
            quality: Quality.Star1,
            tag: [] as string[],
            transform: [] as string[],
            illustration: true,
        };

        public constructor (data?: Settings["data"]) { if (data) this.data = data; }

        public quality (quality: Quality) { this.data.quality = quality; return this; }
        public tag (...tag: string[]) { this.data.tag.push(...tag); return this; }
        public transform (...id: string[]) { this.data.transform.push(...id); return this; }
        public illustrations (show: boolean) { this.data.illustration = show; return this; }

        public copy () { return new Settings(_.cloneDeep(this.data)); }


    }

}

export class IronIngotItem extends Item {
    
    id: Identifier = new Identifier("swbot", "iron_ingot");
    
    data = {name: "铁锭"};
    
}

export namespace Items {
    
    export const UNKNOWN_ITEM = Item.register(new UnknownItem);
    export const IRON_INGOT_ITEM = Item.register(new IronIngotItem);
    
}
